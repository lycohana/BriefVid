FROM python:3.12-slim AS ffmpeg-static

ARG FFMPEG_STATIC_URL=https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
ENV FFMPEG_STATIC_URL=${FFMPEG_STATIC_URL}

RUN python - <<'PY'
import os
import lzma
import shutil
import tarfile
import urllib.request
from pathlib import Path

url = os.environ["FFMPEG_STATIC_URL"]
archive = Path("/tmp/ffmpeg-static.tar.xz")
extract_root = Path("/tmp/ffmpeg")
target_dir = Path("/opt/ffmpeg/bin")

urllib.request.urlretrieve(url, archive)
extract_root.mkdir(parents=True, exist_ok=True)

with lzma.open(archive, "rb") as compressed, tarfile.open(fileobj=compressed, mode="r:") as tar:
    tar.extractall(extract_root)

members = list(extract_root.rglob("ffmpeg")) + list(extract_root.rglob("ffprobe"))
target_dir.mkdir(parents=True, exist_ok=True)

for binary_name in ("ffmpeg", "ffprobe"):
    source = next(path for path in members if path.name == binary_name and path.is_file())
    destination = target_dir / binary_name
    shutil.copy2(source, destination)
    destination.chmod(0o755)
PY

FROM python:3.12-slim

ENV PATH=/opt/ffmpeg/bin:${PATH} \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    VIDEO_SUM_DOCKER=1 \
    VIDEO_SUM_HOST=0.0.0.0 \
    VIDEO_SUM_PORT=3838 \
    VIDEO_SUM_APP_DATA_ROOT=/data \
    VIDEO_SUM_DATA_DIR=/data \
    VIDEO_SUM_CACHE_DIR=/data/cache \
    VIDEO_SUM_TASKS_DIR=/data/tasks \
    VIDEO_SUM_DATABASE_URL=sqlite:////data/video_sum.db \
    VIDEO_SUM_WEB_STATIC_DIR=/app/apps/web/static

WORKDIR /app

COPY --from=ffmpeg-static /opt/ffmpeg /opt/ffmpeg

COPY pyproject.toml VERSION ./
COPY packages ./packages
COPY apps/service ./apps/service
COPY apps/web/static ./apps/web/static

RUN python -m pip install --upgrade pip setuptools wheel hatchling \
    && python -m pip install -e ./packages/infra -e ./packages/core -e ./apps/service

RUN mkdir -p /data/cache /data/tasks /data/logs

EXPOSE 3838
VOLUME ["/data"]

CMD ["python", "-m", "video_sum_service"]
