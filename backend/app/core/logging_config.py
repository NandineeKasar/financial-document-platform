"""
logging_config.py — Centralized logging setup.

Using Python's built-in logging module with a structured format.
Every module imports `logger = logging.getLogger(__name__)` so log
messages carry the module name for easy debugging.
"""
import logging
import sys


def setup_logging(debug: bool = False) -> None:
    """Configure root logger for the entire application."""
    level = logging.DEBUG if debug else logging.INFO

    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(sys.stdout),  # Print to terminal
        ],
    )

    # Silence noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


# Module-level logger — other files do: logger = logging.getLogger(__name__)
logger = logging.getLogger(__name__)
