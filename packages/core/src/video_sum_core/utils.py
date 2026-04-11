from __future__ import annotations

import re
from urllib.parse import parse_qs, urlencode, urlparse
from pathlib import Path


def normalize_video_url(value: str) -> tuple[str, str]:
    raw = (value or "").strip()
    match = re.search(r"(BV[0-9A-Za-z]+)", raw, flags=re.IGNORECASE)
    if match:
        bvid = match.group(1)
        normalized_url = f"https://www.bilibili.com/video/{bvid}"
        page = extract_bilibili_page(raw)
        if page is not None:
            normalized_url = f"{normalized_url}?{urlencode({'p': page})}"
        return normalized_url, bvid
    return raw, ""


def extract_bilibili_page(value: str) -> int | None:
    raw = (value or "").strip()
    if not raw:
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
