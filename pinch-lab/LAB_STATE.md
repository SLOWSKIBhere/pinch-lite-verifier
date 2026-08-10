# PINCH Lab Recovery State

experiment_id: `PINCH-LAB-20260810-PREFLIGHT-01`

baseline_version: `BASELINE_0`

current_phase: `PREFLIGHT_COMPLETE_CLOUD_PUBLICATION_IN_PROGRESS`

checkpoint_updated_at: `2026-08-10T19:03:43.3121676-04:00`

experiment_authorized: `false`

baseline_implementation_frozen: `true`

completed_tests:

- Read-only repository inventory and SHA-256 fingerprint capture.
- Read-only source inspection of Studio topology, prompts/configuration, thresholds, permissions, scorecard, verifier behavior, and execution behavior.
- Baseline scope decision: `BASELINE_0` is the exact pre-existing dirty worktree, not merely Git `HEAD`.
- Lab artifact integrity: 4 JSON files parsed, experiment/baseline IDs aligned, and all 10 required artifact files present.
- Existing unittest suite: `PASS` — 10/10 tests passed.
- Existing CLI dataset: `PASS` — 20/20 cases matched stored expectations.

failed_tests:

- None. No full-experiment fixtures have run.

pending_tests:

- All end-to-end Studio experiment fixtures; intentionally not started.
- Confirmation or completion of the user text after `If multiple models are available:`.

critical_findings:

- The repository was already dirty before lab creation; hashes in `BASELINE.md` are authoritative for `BASELINE_0`.
- Studio Save writes only to an in-memory React ref and has no restore path; it is not interruption-safe.
- Studio execution is a deterministic UI simulation with canned tool/results behavior, not a live agent, verifier, or tool pipeline.
- The supplied model-policy text ends at `If multiple models are available:`. The conservative active policy is to keep the current model and perform no switching.
- Ordinary sandboxed PowerShell process creation failed before execution with Windows error 5. Read-only inspection succeeded through the managed approval path without administrator access or network use.
- Procedural epistemic accountability is the project's central normative thesis: claims, evidence, verifier states, decisions, permissions, execution, audit, and recovery must remain attributable and must not be conflated.

files_created:

- `pinch-lab/LAB_STATE.md`
- `pinch-lab/LAB_PLAN.md`
- `pinch-lab/BASELINE.md`
- `pinch-lab/TEST_FIXTURES.json`
- `pinch-lab/TEST_RESULTS.json`
- `pinch-lab/CLAIM_LEDGER.json`
- `pinch-lab/SCORECARD.json`
- `pinch-lab/FAILURES.md`
- `pinch-lab/REGRESSION_TESTS.md`
- `pinch-lab/FINAL_LAB_REPORT.md`
- `CLAUDE_HANDOFF.md`
- `.gitignore`

code_changes_made:

- `false` for baseline implementation.
- Lab persistence artifacts, a repository-root Claude handoff, ignore rules, and thesis framing in `README.md` are being prepared for cloud publication.
- No implementation file has been repaired or deleted. Publication is a separately authorized user action after the baseline freeze.

next_exact_action:

1. Publish the intentional project files on an `agent/...` branch and open a draft PR.
2. Verify the remote handoff can be opened, then give Claude the minimal prompt from `CLAUDE_HANDOFF.md`.
3. Stop before P2/P3. Obtain or confirm the missing model-policy continuation and explicit experiment authorization.
4. Before an experiment, recompute the baseline fingerprint and create `BASELINE_1` for post-freeze documentation drift rather than changing `BASELINE_0`.

## Recovery procedure

Read only this file first. Then read `BASELINE.md` and `LAB_PLAN.md`; do not rely on conversation history. Recompute the baseline fingerprint before an experiment. If any baseline file differs, preserve `BASELINE_0` and create a new baseline version rather than silently updating it. Do not begin the end-to-end experiment until the user explicitly authorizes it and supplies or confirms any text intended after the truncated model-policy sentence.
