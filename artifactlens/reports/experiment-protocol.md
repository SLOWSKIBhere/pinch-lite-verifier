# ArtifactLens Experiment Protocol v0.1

## Research question

Does deterministic timestamped frame sampling plus OCR produce a more auditable observation ledger than a one-shot visual summary, and what are its measured failure modes?

This protocol does not test historical claim truth yet and does not establish novelty.

## Phase A — Ingestion baseline

1. Select 5–10 videos with explicit reuse permission or a suitable license.
2. Record URL, access date, license, SHA-256, duration, and frame rate.
3. Manually annotate visible text and timestamps on a fixed sample of frames.
4. Freeze sampling interval, OCR language, software versions, and dataset split.
5. Run ArtifactLens locally and preserve manifest, events, logs, and errors.

## Metrics

- Character error rate (CER): character-level edit distance / reference character count.
- Timestamp error: absolute difference between event timestamp and annotated target timestamp.
- Text-region recall: reference text regions with a matched OCR region / all reference text regions.
- Provenance completeness: events with media hash, frame hash, timestamp, method, and path / all events.
- Failure rate: inputs that error or produce no usable events / all inputs.

OCR confidence is not interpreted as calibrated probability. Report per-video results as well as aggregate results.

## Baselines

- B0: manually selected single frame + OCR.
- B1: fixed-interval frame sampling + OCR (ArtifactLens).
- B2 (later): scene-change sampling + OCR.
- B3 (later): multimodal video model baseline, with exact model/version and settings recorded.

Do not compare systems on different video sets or different annotation policies.

## Leakage and reproducibility

Split by source video, never by adjacent frame. Fix the random seed if stochastic components are added. Record Python, OpenCV, Tesseract, OS, OCR language data, config, and media hashes. Re-run the same input twice and compare deterministic fields; ignore created_at_utc and platform-specific absolute paths.

## Phase B — Claim verification (not implemented)

Create atomic claims with timestamp links; obtain two independent human reviews against cited primary or institutional sources; label supported, contradicted, mixed, or insufficient evidence. Resolve disagreements through adjudication and retain both original judgments.

Evaluate evidence-link precision, unsupported-claim escape rate, supported-claim acceptance, and abstention quality. Split by video and avoid treating model judgments as gold labels.

## Acceptance criteria for this vertical slice

- Missing input, invalid interval, unopened media, and missing Tesseract produce actionable nonzero errors.
- Every emitted event contains media hash, frame hash, timestamp, OCR method, and frame locator.
- Output is valid UTF-8 JSONL plus a valid JSON manifest.
- OCR output is explicitly labeled as observation, never verified claim.
- Unit tests pass on a machine with declared dependencies.
- A manual smoke test on a permitted video produces inspectable frames and ledger.
- No raw video or extracted frame is committed to Git.

## Results status

No experiment has been run as part of authoring this protocol. Populate results only after the commands are executed and artifacts are inspected.
