# PINCH Lab Plan

experiment_id: `PINCH-LAB-20260810-PREFLIGHT-01`
baseline_version: `BASELINE_0`
status: `preflight_only`
full_experiment_started: `false`

## Operating policy

- Optimize information gain per token.
- Keep verbose observations in lab artifacts; chat carries decisions, failures, evidence, and conclusions only.
- Use Python standard library only. Do not install packages, use network/API access, require administrator access, or add integrations.
- Keep the current model. No model switch is authorized or presently justified.
- Treat baseline implementation files as read-only until the baseline experiment is complete and a repair phase is separately authorized.
- Never overwrite prior evidence. Append/version results and update `LAB_STATE.md` after every major phase.
- A test result is valid only when it records fixture ID, baseline version, procedure, expected invariant, actual observation, status, evidence pointer, and timestamp.

## Phase gates

| Phase | Purpose | State | Exit criterion |
|---|---|---|---|
| P0 | Freeze repository as `BASELINE_0` | Complete | Worktree state, behavior, and hashes recorded |
| P1 | Create and verify persistent lab artifacts | Complete | Artifacts parse, repository tests and CLI example pass, recovery checkpoint finalized |
| P2 | Complete experiment protocol and freeze fixtures | Pending authorization | User confirms missing policy tail and authorizes experiment; fixtures contain explicit expected invariants |
| P3 | Run baseline end-to-end evaluation | Not started | Every frozen fixture has a result or a recorded resumable failure |
| P4 | Analyze claims, failure modes, and scorecard | Not started | Ledger and scorecard trace every conclusion to evidence |
| P5 | Repair, if separately authorized | Not started | Minimal scoped changes only after legitimate baseline results |
| P6 | Run regressions | Not started | Baseline failures retested and existing verifier suite remains green |
| P7 | Final report | Not started | Conclusions, limitations, and reproducible commands recorded |

## P1 preflight verification

1. Parse `TEST_FIXTURES.json`, `TEST_RESULTS.json`, `CLAIM_LEDGER.json`, and `SCORECARD.json` with Python's `json` module. **Passed.**
2. Verify all artifacts carry the same experiment and baseline IDs where applicable.
3. Run `python -m unittest test_verifier.py -v`. **Passed: 10/10.**
4. Run `python verifier.py examples.json`. **Passed: 20/20.**
5. Update the recovery checkpoint and stop. **Complete.**

## Planned baseline evaluation families

- `STUDIO-TOPOLOGY`: order, disablement, custom-stage positioning, and generated domain stages.
- `STUDIO-CLAIMS`: atomicity, criticality, evidence-count behavior, ground-truth flags, and verifier disagreement.
- `STUDIO-PERMISSION`: disallowed tools, risk bounds, approval/reject/revise, and bypass attempts.
- `STUDIO-EXECUTION`: halt/continue behavior, snapshots, step/pause/cancel, and claimed-versus-actual results.
- `STUDIO-AUDIT`: mismatch detection and audit coverage.
- `STUDIO-SCORECARD`: formula boundaries, critical cap, status derivation, unresolved claims, and pre-gate values.
- `STUDIO-RECOVERY`: session save, export, interruption, partial execution, and deterministic resume.
- `PY-VERIFIER`: the existing 20-case closed-world dataset plus boundary/error behavior.

These are test families, not executed results. Concrete fixtures remain pending to avoid inventing protocol after the user request ended mid-sentence.

## Checkpoint protocol

After each major phase, update these exact `LAB_STATE.md` fields: `experiment_id`, `baseline_version`, `current_phase`, `completed_tests`, `failed_tests`, `pending_tests`, `critical_findings`, `files_created`, `code_changes_made`, and `next_exact_action`.

For interruption recovery:

1. Read `LAB_STATE.md`.
2. Verify the baseline hashes in `BASELINE.md`.
3. Read only the artifact named by `next_exact_action`.
4. Continue the first incomplete fixture; never rerun completed fixtures without stating why.
5. Persist raw evidence in files and keep chat concise.
