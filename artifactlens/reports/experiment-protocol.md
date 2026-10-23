# ArtifactLens Experiment Protocol v0.2

## Research question

Does provenance-preserving media ingestion plus an explicit evidence-integrity gate reduce unsupported claim acceptance while retaining supported claims, compared with simpler baselines?

This protocol defines a testable research plan. It does not establish novelty or accuracy until experiments are executed and independently reviewed.

## Phase A — Perception baseline

1. Select 5–10 videos with explicit reuse permission or a suitable license.
2. Record URL, access date, license, SHA-256, duration, and frame rate.
3. Manually annotate visible text and timestamps on a fixed sample of frames.
4. Freeze sampling interval, OCR language, software versions, and dataset split.
5. Run ArtifactLens locally and preserve manifest, events, logs, and errors.

Metrics:
- Character error rate (CER): character-level edit distance / reference character count.
- Timestamp error: absolute difference between event timestamp and annotated target timestamp.
- Text-region recall: reference text regions with a matched OCR region / all reference text regions.
- Provenance completeness: events with required hashes, timestamp or explicit untimed marker, method, and locator / all events.
- Failure rate: inputs that error or produce no usable events / all inputs.

OCR confidence is not calibrated probability. Report per-video results as well as aggregate results.

## Phase B — Transcript and evidence-reference integrity

Implemented modules:
- artifactlens.transcript: parses local SRT/WebVTT timestamps or preserves plain-text lines as untimed events.
- artifactlens.verification: validates claim text, evidence event references, source-reference presence, and duplicate event IDs.
- artifactlens.research_cli: exposes transcript parsing, review gating, and benchmark evaluation.

The evidence gate is structural only. It must never infer that cited material semantically supports a claim. Its most permissive state is READY_FOR_HUMAN_REVIEW.

## Phase C — Claim verification benchmark

Create atomic claims linked to timestamped events. Obtain two independent human reviews against cited primary or institutional sources. Label claims supported, contradicted, mixed, or insufficient evidence. Adjudicate disagreements without discarding original judgments.

Metrics:
- Evidence-link precision: fraction of evidence links judged genuinely supportive by human reviewers.
- Unsupported-claim escape rate: unsupported gold claims incorrectly predicted as supported / all unsupported gold claims.
- Supported-claim acceptance: supported gold claims predicted as supported / all supported gold claims.
- Abstention rate: predictions sent to human review / all predictions.
- Exact label accuracy and per-class confusion counts.

Split by source video, not frame. Do not treat model judgments as gold labels. Include source disagreement and insufficient evidence as explicit outcomes.

## Baselines

- B0: manually selected single frame + OCR.
- B1: fixed-interval frame sampling + OCR (ArtifactLens).
- B2: timestamped transcript-only evidence.
- B3: OCR + transcript event ledger with structural gate.
- B4 (later): independent source retrieval and semantic support assessment, with model/version and settings recorded.

Use the same video-level split, annotation policy, and source budget for every comparable system.

## Leakage and reproducibility

Record Python, OpenCV, Tesseract, OS, OCR language data, configuration, media hashes, transcript hashes, and code commit. Re-run the same input twice and compare deterministic fields; ignore created_at_utc and machine-specific absolute paths. Keep test media local unless redistribution is permitted.

## Acceptance criteria

- Missing input, invalid interval, unopened media, and missing Tesseract produce actionable nonzero errors.
- Every OCR event contains media hash, frame hash, timestamp, OCR method, and frame locator.
- Subtitle timestamps are preserved; plain text is explicitly untimed.
- Invalid or missing claim evidence references are blocked.
- A claim with valid references is only marked ready for human review, never automatically supported.
- Evaluation rejects empty datasets and unknown labels.
- Unit tests pass with declared dependencies on the target machine.
- A manual smoke test on a permitted video produces inspectable frames and ledger.
- No raw video, transcript, or extracted frame is committed without permission.

## Results status

No runtime experiment is claimed by this document. Record commands, environment, outputs, errors, and reviewed artifacts before reporting results.
