"""Local, deterministic video frame sampling and OCR.

OCR output is an observation only; this module does not verify factual claims.
"""
from __future__ import annotations

import hashlib
import json
import platform
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import cv2
import pytesseract
from pytesseract import Output


class PipelineError(RuntimeError):
    """Raised when media ingestion or OCR cannot safely continue."""


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _ocr_frame(frame: Any) -> tuple[str, list[dict[str, Any]]]:
    try:
        data = pytesseract.image_to_data(frame, output_type=Output.DICT)
    except pytesseract.TesseractNotFoundError as exc:
        raise PipelineError(
            "Tesseract executable not found. Install Tesseract OCR and ensure it is on PATH."
        ) from exc

    words: list[dict[str, Any]] = []
    text_parts: list[str] = []
    for index, raw_text in enumerate(data.get("text", [])):
        text = str(raw_text).strip()
        if not text:
            continue
        try:
            confidence = float(data["conf"][index])
        except (KeyError, TypeError, ValueError):
            confidence = -1.0
        word = {
            "text": text,
            "bbox": {
                "x": int(data["left"][index]),
                "y": int(data["top"][index]),
                "width": int(data["width"][index]),
                "height": int(data["height"][index]),
            },
            "ocr_confidence": confidence if confidence >= 0 else None,
        }
        words.append(word)
        text_parts.append(text)
    return " ".join(text_parts), words


def process_video(
    video_path: str | Path,
    output_dir: str | Path,
    interval_seconds: float = 2.0,
    language: str = "eng",
) -> dict[str, Any]:
    """Sample a local video and write an event ledger plus manifest."""
    source = Path(video_path).expanduser().resolve()
    output = Path(output_dir).expanduser().resolve()

    if not source.is_file():
        raise PipelineError(f"Video file does not exist: {source}")
    if interval_seconds <= 0:
        raise ValueError("interval_seconds must be greater than zero")
    if not shutil.which("tesseract"):
        raise PipelineError(
            "Tesseract executable not found. Install Tesseract OCR and ensure it is on PATH."
        )

    output.mkdir(parents=True, exist_ok=True)
    frames_dir = output / "frames"
    frames_dir.mkdir(exist_ok=True)

    capture = cv2.VideoCapture(str(source))
    if not capture.isOpened():
        capture.release()
        raise PipelineError("OpenCV could not open the supplied video file.")

    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = (frame_count / fps) if fps > 0 and frame_count > 0 else None
    media_hash = sha256_file(source)
    events: list[dict[str, Any]] = []
    next_time = 0.0
    event_index = 0

    try:
        with (output / "events.jsonl").open("w", encoding="utf-8", newline="\n") as ledger:
            while True:
                ok, frame = capture.read()
                if not ok:
                    break
                position_ms = float(capture.get(cv2.CAP_PROP_POS_MSEC) or 0.0)
                timestamp = max(0.0, position_ms / 1000.0)

                # Select the first decoded frame at or after each target time.
                if timestamp + 1e-6 < next_time:
                    continue

                frame_name = f"frame_{event_index:06d}_{timestamp:.3f}s.jpg"
                frame_path = frames_dir / frame_name
                encoded, buffer = cv2.imencode(".jpg", frame)
                if not encoded:
                    raise PipelineError(f"Could not encode frame at {timestamp:.3f}s")
                frame_bytes = buffer.tobytes()
                frame_path.write_bytes(frame_bytes)

                text, words = _ocr_frame(frame)
                event = {
                    "schema_version": "1.0",
                    "event_id": f"evt_{event_index:06d}",
                    "media_sha256": media_hash,
                    "timestamp_seconds": round(timestamp, 3),
                    "frame_sha256": sha256_bytes(frame_bytes),
                    "frame_path": str(frame_path.relative_to(output)),
                    "event_type": "ocr_observation",
                    "text": text,
                    "words": words,
                    "provenance": {
                        "method": "opencv_frame_sampling+pytesseract",
                        "ocr_language": language,
                    },
                }
                ledger.write(json.dumps(event, ensure_ascii=False) + "\n")
                events.append(event)
                event_index += 1
                next_time += interval_seconds
    finally:
        capture.release()

    manifest = {
        "schema_version": "1.0",
        "run_id": f"run_{media_hash[:12]}_{int(interval_seconds * 1000)}ms",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "media_path": str(source),
        "media_sha256": media_hash,
        "media_size_bytes": source.stat().st_size,
        "duration_seconds": duration,
        "fps_reported_by_container": fps if fps > 0 else None,
        "frame_count_reported_by_container": frame_count,
        "sampling_interval_seconds": interval_seconds,
        "ocr_engine": "Tesseract",
        "opencv_version": cv2.__version__,
        "python_version": platform.python_version(),
        "events_file": "events.jsonl",
        "sampled_frame_count": len(events),
        "limitations": [
            "OCR observations are not factual verification.",
            "Container timestamps and frame counts may be inaccurate for variable-frame-rate media.",
            "OCR confidence is not calibrated probability of text correctness.",
        ],
    }
    (output / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return manifest
