from dataclasses import dataclass
from importlib import metadata
from pathlib import Path


@dataclass(slots=True)
class AppInfo:
    name: str
    version: str

    @classmethod
    def load(cls) -> "AppInfo":
        return cls(name="BriefVid", version=_resolve_version())


def _resolve_version() -> str:
    for distribution_name in ("video-sum-service", "video-sum-infra"):
        try:
            return metadata.version(distribution_name)
        except metadata.PackageNotFoundError:
            continue

    version_file = Path(__file__).resolve().parents[4] / "VERSION"
    if version_file.exists():
        return version_file.read_text(encoding="utf-8").strip()
    return "0.0.0"
