# ArtifactLens — local video evidence research prototype

ArtifactLens is an isolated research module inside PINCH-Lite. It does not modify the existing root verifier or `workflow-studio/`. Its first vertical slice ingests a local video, samples frames at a fixed interval, runs local OCR, and writes provenance-bearing JSONL events. Claim verification is intentionally not automated in this first stage.

## Requirements

- Python 3.11+
- FFmpeg is not required.
- Install Python dependencies from this directory.
- Tesseract OCR must be installed separately and available on PATH for OCR to run. The pipeline should fail clearly if it is missing; no cloud inference is used.

## Local setup (PowerShell)

```powershell
cd artifactlens
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -e ".[dev]"
python -m unittest discover -s tests -v
```

Install Tesseract OCR for Windows separately, then verify `tesseract --version`.

## Run on a video

```powershell
python -m artifactlens.cli "C:\path\to\video.mp4" --out .\runs\video-001 --interval 2.0
```

Output:
- `manifest.json`: media SHA-256, sampling settings, tool versions, and run metadata.
- `events.jsonl`: one event per sampled frame, with timestamp, frame hash, OCR text, and OCR word boxes.
- `frames/`: sampled frame images for human review.

Treat generated OCR as an observation, not a verified claim. Do not pass video claims as supported merely because OCR or a model produced them.

## Research boundary

This vertical slice does **not** yet perform speech transcription, historical-source retrieval, semantic claim entailment, or calibrated confidence. Those are later phases. It does not establish product novelty or accuracy. Never use personal/private media without permission; keep test media local and do not commit videos or generated frames.

## PINCH integration boundary

The module is deliberately isolated under `artifactlens/`. Existing `verifier.py`, `test_verifier.py`, and `workflow-studio/` remain unchanged. Future integration should use a versioned event/claim contract and preserve the PINCH invariants in root `AGENTS.md`.
