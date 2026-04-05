from __future__ import annotations

import logging
import logging.config
from logging.handlers import RotatingFileHandler

from video_sum_infra.runtime import log_dir, service_log_path


LOG_FORMAT = "%(asctime)s %(levelname)s [pid=%(process)d tid=%(threadName)s] %(name)s | %(message)s"


def configure_logging() -> None:
    log_dir().mkdir(parents=True, exist_ok=True)
    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "standard": {
                    "format": LOG_FORMAT,
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "standard",
                    "level": "INFO",
                },
                "file": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "formatter": "standard",
                    "level": "INFO",
                    "filename": str(service_log_path()),
                    "maxBytes": 2 * 1024 * 1024,
                    "backupCount": 3,
                    "encoding": "utf-8",
                },
            },
            "root": {
                "handlers": ["console", "file"],
                "level": "INFO",
            },
            "loggers": {
                "uvicorn.access": {"level": "WARNING", "propagate": False, "handlers": ["console", "file"]},
                "httpx": {"level": "WARNING", "propagate": False, "handlers": ["console", "file"]},
                "httpcore": {"level": "WARNING", "propagate": False, "handlers": ["console", "file"]},
                "faster_whisper": {"level": "WARNING", "propagate": False, "handlers": ["console", "file"]},
                "asyncio": {"level": "WARNING", "propagate": True},
                "video_sum_service": {"level": "INFO", "propagate": True},
                "video_sum_core": {"level": "INFO", "propagate": True},
            },
        }
    )
