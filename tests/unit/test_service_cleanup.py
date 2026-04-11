from __future__ import annotations

from pathlib import Path

from video_sum_core.models.tasks import InputType, TaskInput, TaskResult
from video_sum_infra.config import ServiceSettings
from video_sum_service.app import _cleanup_video_files
from video_sum_service.schemas import TaskRecord, VideoAssetRecord


def test_cleanup_video_files_removes_task_directories_and_cached_cover(tmp_path: Path) -> None:
    tasks_dir = tmp_path / "tasks"
    cache_dir = tmp_path / "cache"
    task_dir = tasks_dir / "task-1"
    cover_dir = cache_dir / "covers"
    task_dir.mkdir(parents=True)
    cover_dir.mkdir(parents=True)

    summary_path = task_dir / "summary.json"
    transcript_path = task_dir / "transcript.txt"
    summary_path.write_text("{}", encoding="utf-8")
    transcript_path.write_text("hello", encoding="utf-8")
    cover_path = cover_dir / "cover.jpg"
    cover_path.write_text("cover", encoding="utf-8")

    settings = ServiceSettings(tasks_dir=tasks_dir, cache_dir=cache_dir)
    video = VideoAssetRecord(
        canonical_id="BV-cleanup",
        platform="bilibili",
        title="测试视频",
        source_url="https://www.bilibili.com/video/BV-cleanup",
        cover_url="/media/covers/cover.jpg",
    )
    task = TaskRecord(
        task_id="task-1",
        video_id=video.video_id,
        task_input=TaskInput(input_type=InputType.URL, source=video.source_url, title="测试视频"),
        result=TaskResult(
            artifacts={
                "summary_path": str(summary_path),
                "transcript_path": str(transcript_path),
            }
        ),
    )

    _cleanup_video_files(video, [task], settings)

    assert not task_dir.exists()
    assert not cover_path.exists()
