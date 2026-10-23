"""Parse local SRT, WebVTT, or plain-text transcripts into evidence events.

Parsing preserves source text and supplied timestamps. It does not establish
that a speaker's statement is factually correct.
"""
from __future__ import annotations
import hashlib
import re
from pathlib import Path
from typing import Any

_TIMESTAMP = re.compile(
    r"(?P<start>(?:\d{1,2}:)?\d{2}:\d{2}[,.]\d{1,3})\s+-->\s+"
    r"(?P<end>(?:\d{1,2}:)?\d{2}:\d{2}[,.]\d{1,3})"
)
_SHA256 = re.compile(r"^[0-9a-fA-F]{64}$")

class TranscriptError(ValueError):
    """Raised when a transcript cannot be parsed safely."""

def _seconds(value: str) -> float:
    normalized = value.replace(",", ".")
    parts = normalized.split(":")
    if len(parts) == 2:
        hours = 0
        minutes, seconds = parts
    elif len(parts) == 3:
        hours, minutes, seconds = parts
    else:
        raise TranscriptError(f"Unsupported timestamp: {value!r}")
    try:
        result = int(hours) * 3600 + int(minutes) * 60 + float(seconds)
    except ValueError as exc:
        raise TranscriptError(f"Invalid timestamp: {value!r}") from exc
    if result < 0:
        raise TranscriptError("Timestamps must be non-negative")
    return result

def parse_transcript(path: str | Path, media_sha256: str | None = None) -> list[dict[str, Any]]:
    """Parse a transcript; optionally bind its events to a verified media hash."""
    if media_sha256 is not None and not _SHA256.fullmatch(media_sha256):
        raise TranscriptError("media_sha256 must be a 64-character hexadecimal SHA-256 digest")
    media_sha256 = media_sha256.lower() if media_sha256 else None
    source = Path(path).expanduser().resolve()
    if not source.is_file():
        raise TranscriptError(f"Transcript file does not exist: {source}")
    raw = source.read_bytes()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise TranscriptError("Transcript must be UTF-8 encoded") from exc
    digest = hashlib.sha256(raw).hexdigest()
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    events: list[dict[str, Any]] = []
    i = 0
    while i < len(lines):
        match = _TIMESTAMP.search(lines[i].strip())
        if not match:
            i += 1
            continue
        start, end = _seconds(match.group("start")), _seconds(match.group("end"))
        if end < start:
            raise TranscriptError(f"Cue end precedes start at line {i + 1}")
        cue_line = i + 1
        i += 1
        cue_lines: list[str] = []
        while i < len(lines):
            candidate = lines[i].strip()
            if not candidate:
                i += 1
                break
            if _TIMESTAMP.search(candidate):
                break
            if not (candidate.isdigit() and not cue_lines):
                cue_lines.append(candidate)
            i += 1
        cue_text = " ".join(cue_lines).strip()
        if cue_text:
            events.append({
                "schema_version": "1.0",
                "event_id": f"trn_{len(events):06d}",
                "media_sha256": media_sha256,
                "timestamp_start": round(start, 3),
                "timestamp_end": round(end, 3),
                "event_type": "transcript_observation",
                "text": cue_text,
                "source_locator": f"{source.name}:line:{cue_line}",
                "provenance": {
                    "method": "local_subtitle_parser",
                    "transcript_sha256": digest,
                    "format": source.suffix.lower().lstrip(".") or "text",
                },
            })
    if events:
        return events
    nonempty = [(index + 1, line.strip()) for index, line in enumerate(lines) if line.strip()]
    if not nonempty:
        raise TranscriptError("Transcript contains no readable text")
    return [{
        "schema_version": "1.0",
        "event_id": f"trn_{index:06d}",
        "media_sha256": media_sha256,
        "timestamp_start": None,
        "timestamp_end": None,
        "event_type": "transcript_observation",
        "text": line,
        "source_locator": f"{source.name}:line:{line_number}",
        "provenance": {
            "method": "local_plain_text_parser",
            "transcript_sha256": digest,
            "format": "text",
            "timing": "not_provided",
        },
    } for index, (line_number, line) in enumerate(nonempty)]
