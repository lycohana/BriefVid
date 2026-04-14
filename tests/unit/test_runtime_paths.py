from pathlib import Path

from video_sum_infra.config import ServiceSettings
from video_sum_infra.runtime import app_data_root, default_host, web_static_dir


def test_service_settings_use_container_friendly_defaults_in_docker(monkeypatch) -> None:
    monkeypatch.setenv("VIDEO_SUM_DOCKER", "1")
    monkeypatch.delenv("VIDEO_SUM_APP_DATA_ROOT", raising=False)

    settings = ServiceSettings()

    assert default_host() == "0.0.0.0"
    assert app_data_root() == Path("/data")
    assert settings.host == "0.0.0.0"
    assert settings.data_dir == Path("/data")
    assert settings.cache_dir == Path("/data/cache")
    assert settings.tasks_dir == Path("/data/tasks")
    assert settings.database_url == "sqlite:////data/video_sum.db"


def test_web_static_dir_prefers_explicit_override(monkeypatch, tmp_path: Path) -> None:
    static_dir = tmp_path / "web-static"
    monkeypatch.setenv("VIDEO_SUM_WEB_STATIC_DIR", str(static_dir))

    assert web_static_dir() == static_dir.resolve()
