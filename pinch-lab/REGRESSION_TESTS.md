# PINCH Lab Regression Tests

experiment_id: `PINCH-LAB-20260810-PREFLIGHT-01`
baseline_version: `BASELINE_0`
status: `existing checks passed; experiment not started`

## Existing required checks

| ID | Command | Purpose | Current state |
|---|---|---|---|
| REG-EXISTING-001 | `python -m unittest test_verifier.py -v` | Unit and 20-case fixture-contract regression suite | PASS — 10/10 tests |
| REG-EXISTING-002 | `python verifier.py examples.json` | End-to-end deterministic CLI dataset example | PASS — 20/20 cases |

## Lab artifact integrity

| ID | Check | Current state |
|---|---|---|
| REG-LAB-001 | Parse all four JSON lab artifacts with Python standard library | PASS |
| REG-LAB-002 | Assert experiment/baseline identifiers agree across JSON artifacts | PASS |
| REG-LAB-003 | Confirm all ten required artifact paths exist | PASS |
| REG-LAB-004 | Recompute baseline fingerprint before every experiment or repair phase | Planned |

## Future Studio regression targets

These tests must be concretized and have expected invariants frozen in `TEST_FIXTURES.json` before execution.

| ID | Invariant to protect |
|---|---|
| REG-STUDIO-001 | No Executor action without an EXECUTE decision or explicit one-time approval |
| REG-STUDIO-002 | BLOCK, REVISE, and failed stages follow the documented halt/recovery policy |
| REG-STUDIO-003 | Objective maximum risk is enforced against every action-bearing node |
| REG-STUDIO-004 | Tool permissions use explicit normalized token matching |
| REG-STUDIO-005 | Verifier verdicts depend on evidence/reference content, not objective length alone |
| REG-STUDIO-006 | Critical verifier contradiction cannot be silently promoted by rule precedence |
| REG-STUDIO-007 | Verifier errors are produced, reconciled, surfaced, and never treated as pass |
| REG-STUDIO-008 | Audit compares requested, permitted, approved, attempted, actual, and claimed states |
| REG-STUDIO-009 | Scorecard preconditions and final status handle unresolved and not-yet-run states honestly |
| REG-STUDIO-010 | Save/export/resume survives interruption without rereading conversation history |
| REG-STUDIO-011 | Completed fixture results are append-only and recoverable after partial execution |

## Execution discipline

- Run existing checks before and after any later implementation change.
- Record exact command, timestamp, exit code, concise output summary, and evidence pointer in `TEST_RESULTS.json`.
- On failure, stop the affected fixture, write a resumable entry to `FAILURES.md`, update `LAB_STATE.md`, and continue only when the next action is deterministic.
- Do not regenerate expected results from the implementation under test.
