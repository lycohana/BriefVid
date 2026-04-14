import sqlite3

from fastapi import HTTPException

from video_sum_service.app import app
from video_sum_service.repository import SqliteTaskRepository
from video_sum_service.routers.videos import set_video_favorite
from video_sum_service.schemas import VideoAssetRecord


def create_repository() -> SqliteTaskRepository:
    connection = sqlite3.connect(":memory:", check_same_thread=False)
    connection.row_factory = sqlite3.Row
    repository = SqliteTaskRepository(connection)
    repository.initialize()
    return repository


def test_set_video_favorite_returns_updated_video_detail() -> None:
    repository = create_repository()
    asset = repository.upsert_video_asset(
        VideoAssetRecord(
            canonical_id="BV-api-favorite",
            platform="bilibili",
            title="接口收藏视频",
            source_url="https://www.bilibili.com/video/BV-api-favorite",
        )
    )
    app.state.task_repository = repository

    response = set_video_favorite(asset.video_id, {"is_favorite": True}, type("Request", (), {"app": app})())

    assert response.video_id == asset.video_id
    assert response.is_favorite is True
    assert response.favorite_updated_at is not None


def test_set_video_favorite_raises_404_for_missing_video() -> None:
    repository = create_repository()
    app.state.task_repository = repository

    try:
        set_video_favorite("missing-video", {"is_favorite": True}, type("Request", (), {"app": app})())
    except HTTPException as exc:
        assert exc.status_code == 404
        assert exc.detail == "Video not found."
    else:
        raise AssertionError("expected HTTPException")
