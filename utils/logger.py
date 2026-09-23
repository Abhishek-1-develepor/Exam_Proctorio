"""utils/logger.py — ProctorVision logger setup."""

import logging
import os
from config import Config


def setup_logger(name="proctorvision"):
    logger = logging.getLogger(name)
    
    # ⚠️ Render pe INFO level skip karo
    log_level = os.environ.get('LOG_LEVEL', 'WARNING').upper()
    logger.setLevel(getattr(logging, log_level, logging.WARNING))

    if logger.handlers:
        return logger

    fmt = logging.Formatter(
        "[%(asctime)s] %(levelname)s — %(name)s — %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # ⚠️ File handler sirf WARNING+ ke liye (slow file writes band)
    # Comment out for Render
    # fh = logging.FileHandler(Config.LOG_FILE, encoding="utf-8")
    # fh.setFormatter(fmt)
    # logger.addHandler(fh)

    # Console only (fast, Render pe safe)
    ch = logging.StreamHandler()
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    return logger


log = setup_logger()