from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse


@dataclass(frozen=True, slots=True)
class NormalizedVideoUrl:
    normalized_url: str
    canonical_id: str
    platform: str = "unknown"
    page_number: int | None = None

    def __iter__(self):
        # Backward-compatible tuple unpacking for existing call sites.
        yield self.normalized_url
        yield self.canonical_id


def normalize_video_url(value: str) -> NormalizedVideoUrl:
    raw = (value or "").strip()
    if not raw:
        return NormalizedVideoUrl(normalized_url="", canonical_id="")

    match = re.search(r"(BV[0-9A-Za-z]+)", raw, flags=re.IGNORECASE)
    if match:
        bvid = match.group(1)
        normalized_url = f"https://www.bilibili.com/video/{bvid}"
        page = extract_bilibili_page(raw)
        if page is not None:
            normalized_url = f"{normalized_url}?{urlencode({'p': page})}"
        return NormalizedVideoUrl(
            normalized_url=normalized_url,
            canonical_id=bvid,
            platform="bilibili",
            page_number=page,
        )

    youtube_id = extract_youtube_video_id(raw)
    if youtube_id:
        return NormalizedVideoUrl(
            normalized_url=f"https://www.youtube.com/watch?v={youtube_id}",
            canonical_id=youtube_id,
            platform="youtube",
        )

    return NormalizedVideoUrl(normalized_url=raw, canonical_id="")


def extract_bilibili_page(value: str) -> int | None:
    raw = (value or "").strip()
    if not raw:
        return None

    if not re.search(r"(BV[0-9A-Za-z]+|bilibili\.com|b23\.tv)", raw, flags=re.IGNORECASE):
        return None

    try:
        parsed = urlparse(raw)
        query = parse_qs(parsed.query)
        page_value = query.get("p", [None])[0]
    except ValueError:
        page_value = None

    if page_value is None:
        match = re.search(r"[?&]p=(\d+)", raw, flags=re.IGNORECASE)
        page_value = match.group(1) if match else None

    if page_value is None:
        return None

    try:
        page = int(str(page_value))
    except (TypeError, ValueError):
        return None
    return page if page > 0 else None


def extract_youtube_video_id(value: str) -> str | None:
    raw = (value or "").strip()
    if not raw:
        return None

    try:
        parsed = urlparse(raw)
    except ValueError:
        parsed = None

    if parsed is not None:
        host = parsed.netloc.lower()
        path = parsed.path or ""

        if host.endswith("youtu.be"):
            candidate = path.strip("/").split("/", 1)[0]
            return candidate or None

        if "youtube.com" in host:
            if path == "/watch":
                candidate = parse_qs(parsed.query).get("v", [None])[0]
                return str(candidate).strip() or None
            if path.startswith("/shorts/"):
                candidate = path.split("/", 3)[2] if len(path.split("/")) > 2 else ""
                return candidate.strip() or None

    return None


def sanitize_filename(value: str) -> str:
    sanitized = re.sub(r"[\\/:*?\"<>|]+", "_", value).strip()
    return sanitized[:120] or "video_summary"


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def format_timestamp(seconds: float) -> str:
    total = max(0, int(seconds))
    hours = total // 3600
    minutes = (total % 3600) // 60
    remaining = total % 60
    if hours:
        return f"{hours:02d}:{minutes:02d}:{remaining:02d}"
    return f"{minutes:02d}:{remaining:02d}"
