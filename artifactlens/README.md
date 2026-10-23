# ArtifactLens — local video evidence research prototype

ArtifactLens is an isolated research module inside PINCH-Lite. It leaves the root verifier and workflow-studio unchanged. It provides local video frame sampling/OCR, transcript ingestion, event-ledger merging, a deterministic evidence-reference gate, and metrics for manually labeled claim-verification experiments.

## Requirements

- Python 3.11+
- Windows PowerShell instructions below; equivalent paths work on other operating systems.
- Tesseract OCR installed separately and available on PATH for video OCR.
- No cloud inference is used by the implemented pipeline.
- FFmpeg is not required for the current OpenCV video sampler.

## Local setup (PowerShell)

From the repository root:

~~~powershell
cd artifactlens
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -e ".[dev]"
python -m unittest discover -s tests -v
~~~

Install Tesseract OCR for Windows separately, then verify with tesseract --version.

## Step 1 — Sample a local video

Run from the artifactlens directory:

~~~powershell
artifactlens "C:\path\to\video.mp4" --out .\runs\video-001 --interval 2.0
~~~

Outputs include manifest.json, events.jsonl, and sampled images under frames/. Each OCR event contains a media hash, frame hash, timestamp, method, and frame locator.

## Step 2 — Parse the matching transcript

SRT and WebVTT cue timestamps are preserved. Plain-text transcripts are emitted as untimed lines; timestamps are never guessed. Bind transcript events to the video hash recorded in manifest.json:

~~~powershell
$manifest = Get-Content .\runs\video-001\manifest.json -Raw | ConvertFrom-Json
artifactlens-research parse-transcript "C:\path\to\video-transcript.srt" --out .\runs\video-001\transcript-events.jsonl --media-sha256 $manifest.media_sha256
~~~

Transcript events have IDs such as trn_000000; OCR events use IDs such as evt_000000. The transcript file's own SHA-256 is also recorded in event provenance.

## Step 3 — Combine event ledgers

~~~powershell
artifactlens-research combine-events --inputs .\runs\video-001\events.jsonl .\runs\video-001\transcript-events.jsonl --out .\runs\video-001\all-events.jsonl
~~~

The command refuses duplicate or missing event IDs rather than silently merging ambiguous provenance.

## Step 4 — Prepare and gate a claim ledger

Create a UTF-8 JSONL file, one claim per line. Every evidence event ID must exist in the combined event file.

Example claims.jsonl:

~~~json
{"claim_id":"claim-001","text":"The narrator says the mechanism tracked astronomical cycles.","evidence_event_ids":["trn_000000","evt_000001"],"external_source_ids":["source-review-001"]}
~~~

External source IDs must resolve to a separate human-maintained source register or research notes; the gate does not fetch or assess source contents.

~~~powershell
artifactlens-research review-gate --events .\runs\video-001\all-events.jsonl --claims .\runs\video-001\claims.jsonl --out .\runs\video-001\review-decisions.jsonl
~~~

Gate statuses distinguish missing or invalid evidence references from claims ready for independent review. READY_FOR_HUMAN_REVIEW is not a truth judgment. This version does not automatically verify semantic entailment, source quality, or historical accuracy.

## Step 5 — Run benchmark metrics

Evaluation JSONL rows require gold_label and predicted_label. Allowed gold labels: supported, contradicted, mixed, insufficient_evidence. Predicted labels also allow human_review.

~~~powershell
artifactlens-research evaluate --dataset .\datasets\fixtures\synthetic_claim_eval.jsonl --out .\runs\synthetic-metrics.json
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
- The branch has not been executed in the user's Windows environment. Run the commands and record actual results before claiming a successful local smoke test.
- Keep video, transcript, and extracted frames local unless reuse and redistribution are permitted. Do not commit raw media or private material.

## PINCH integration boundary

The module stays isolated under artifactlens/; root verifier.py, test_verifier.py, and workflow-studio/ remain unchanged. Preserve the repository invariants: generated is not verified, verified is not authorized, and unavailable is never PASS.
