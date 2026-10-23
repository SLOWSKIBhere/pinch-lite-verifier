# ArtifactLens — local video evidence research prototype

ArtifactLens is an isolated research module inside PINCH-Lite. It leaves the root verifier and workflow-studio unchanged. It currently provides local video frame sampling/OCR, local transcript ingestion, a deterministic evidence-reference gate, and metrics for manually labeled claim-verification experiments.

## Requirements

- Python 3.11+
- Windows PowerShell instructions below; other OSes should work with equivalent paths.
- Tesseract OCR installed separately and available on PATH for video OCR.
- No cloud inference is used by the implemented pipeline.
- FFmpeg is not required for the current OpenCV video sampler.

## Local setup (PowerShell)

From the repository root:

~~~powershell
cd artifactlens
py -3.11 -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
python -m pip install --upgrade pip
pip install -e ".[dev]"
python -m unittest discover -s tests -v
~~~

Install Tesseract OCR for Windows separately, then verify tesseract --version.

## Step 1 — Sample a local video

Run from the artifactlens directory:

~~~powershell
artifactlens "C:\\path\\to\\video.mp4" --out .\\runs\\video-001 --interval 2.0
~~~

Or use the module form:

~~~powershell
python -m artifactlens.cli "C:\\path\\to\\video.mp4" --out .\\runs\\video-001 --interval 2.0
~~~

Outputs include manifest.json, events.jsonl, and sampled images under frames/. Each OCR event contains a media hash, frame hash, timestamp, method, and frame locator.

## Step 2 — Parse the supplied transcript locally

SRT and WebVTT cue timestamps are preserved. Plain-text transcripts are emitted as untimed lines; timestamps are never guessed.

~~~powershell
artifactlens-research parse-transcript "C:\\path\\to\\video-transcript.srt" --out .\\runs\\video-001\\transcript-events.jsonl
~~~

If the video and transcript refer to the same source, retain the video run ID and transcript hash in your experiment notes. Transcript events have IDs such as trn_000000; OCR events use IDs such as evt_000000.

## Step 3 — Prepare a claim ledger

Create a UTF-8 JSONL file, one claim per line. Every evidence event ID must exist in the OCR or transcript event files you provide to the gate.

Example claims.jsonl:

~~~json
{"claim_id":"claim-001","text":"The narrator says the mechanism tracked astronomical cycles.","evidence_event_ids":["trn_000000"],"external_source_ids":["source-review-001"]}
~~~

Combine event ledgers into one JSONL file before gating if a claim cites both OCR and transcript events. External source IDs must resolve to a separate human-maintained source register or research notes; the gate does not fetch or assess source contents.

~~~powershell
artifactlens-research review-gate --events .\\runs\\video-001\\all-events.jsonl --claims .\\runs\\video-001\\claims.jsonl --out .\\runs\\video-001\\review-decisions.jsonl
~~~

Gate statuses distinguish missing or invalid evidence references from claims ready for independent review. READY_FOR_HUMAN_REVIEW is not a truth judgment. This version does not automatically verify semantic entailment, source quality, or historical accuracy.

## Step 4 — Run benchmark metrics

Evaluation JSONL rows require gold_label and predicted_label. Allowed gold labels: supported, contradicted, mixed, insufficient_evidence. Predicted labels also allow human_review.

~~~powershell
artifactlens-research evaluate --dataset .\\datasets\\fixtures\\synthetic_claim_eval.jsonl --out .\\runs\\synthetic-metrics.json
~~~

The fixture is synthetic and only smoke-tests metric arithmetic. It is not historical ground truth and must not be presented as experimental evidence.

Metrics include exact label accuracy, unsupported-claim escape rate, supported-claim acceptance rate, and human-review rate. Interpret them only against independently reviewed gold labels.

## Tests

~~~powershell
python -m unittest discover -s tests -v
~~~

The repository root verifier has its own tests; run those separately from the repository root:

~~~powershell
python -m unittest test_verifier.py -v
~~~

## Research boundaries

- OCR and transcript text are observations, not verified claims.
- A syntactically valid citation does not establish that it supports a claim.
- No claim is automatically marked supported by the current evidence gate.
- No external source retrieval, semantic entailment model, or calibrated confidence model is implemented yet.
- This branch has not been locally executed in the user's Windows environment. Run the commands and record actual results before claiming a successful smoke test.
- Keep video, transcript, and extracted frames local unless reuse and redistribution are permitted. Do not commit raw media or private material.

## PINCH integration boundary

The module stays isolated under artifactlens/; the root verifier.py, test_verifier.py, and workflow-studio/ remain unchanged. Future integration must preserve the repository invariants: generated is not verified, verified is not authorized, and unavailable is never PASS.
