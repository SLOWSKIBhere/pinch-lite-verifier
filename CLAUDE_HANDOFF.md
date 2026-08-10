# Claude Handoff — PINCH-Lite / PINCH Workflow Studio

## Core thesis

**Procedural epistemic accountability is the central thesis of PINCH.**

PINCH is not merely asking whether an output appears correct. It asks whether every transition from request to claim, verification, authorization, action, and audit is explicit, evidence-linked, bounded, recoverable, and reviewable:

`objective → candidate → atomic claims → independent verification → consensus → permission → bounded execution → post-execution audit`

The system must preserve distinctions between:

- generated and verified;
- evidence-supported and ground-truth-matched;
- requested and authorized;
- authorized and attempted;
- attempted, completed, and merely claimed;
- source-derived behavior and experimentally observed behavior;
- uncertainty or verifier failure and a legitimate pass.

No claim may gain epistemic status merely because the Generator asserted it, and no action may gain procedural authority merely because it was requested. Unavailable verification, disagreement, tool failure, and incomplete execution must remain visible rather than being silently promoted to success.

This is the project's normative thesis and evaluation standard. It is **not** evidence that the current baseline already satisfies it.

## Accountability invariants

The project should be judged against these invariants:

1. **Claim accountability:** generated assertions are decomposed into inspectable atomic claims.
2. **Evidence accountability:** evidence provenance, relevance, and coverage remain traceable per claim.
3. **Verifier accountability:** independent verdicts, disagreements, uncertainty, and verifier failure remain visible.
4. **Decision accountability:** consensus and permission decisions have explicit rules, reasons, and responsible authority.
5. **Execution accountability:** requested, permitted, approved, attempted, completed, and claimed actions are never conflated.
6. **Audit accountability:** post-execution review compares the full procedural record and exposes mismatches.
7. **Recovery accountability:** interruption, partial execution, model switching, and tool failure leave a durable next action.
8. **Evaluation accountability:** expected invariants are frozen before observation, and conclusions point to reproducible evidence.

## Evidence discipline

Use these status boundaries consistently:

- `source_confirmed`: directly established by repository inspection.
- `experiment_supported`: observed under a frozen fixture with an evidence pointer.
- `partially_supported`, `contradicted`, `unverifiable`, `verifier_error`: retain their literal meanings.
- `not_run`: no experimental conclusion is warranted.

A source-confirmed implementation behavior is not automatically an experiment result. A planned test is not evidence. Passing Python tests does not validate the Studio's end-to-end procedural behavior.

Freeze expected invariants before observing results. Never derive an oracle from the implementation under test. Never overwrite completed evidence; append or version it.

## Current checkpoint

- Experiment: `PINCH-LAB-20260810-PREFLIGHT-01`
- Baseline: `BASELINE_0`
- State: preflight complete; full experiment not started
- Implementation repairs: none
- Experiment fixtures executed: zero
- Aggregate baseline SHA-256: `f9cf45cf2a4397cee73506014f44137e51cb81dfcd99075de886b4b3cf238f01`
- Unit tests: PASS, 10/10
- CLI dataset: PASS, 20/20
- The pre-existing worktree was dirty. `pinch-lab/BASELINE.md`, not Git `HEAD` alone, defines `BASELINE_0`.

Canonical recovery artifacts:

1. `pinch-lab/LAB_STATE.md`
2. `pinch-lab/BASELINE.md`
3. `pinch-lab/LAB_PLAN.md`
4. `pinch-lab/TEST_FIXTURES.json`
5. `pinch-lab/TEST_RESULTS.json`
6. `pinch-lab/CLAIM_LEDGER.json`
7. `pinch-lab/SCORECARD.json`
8. `pinch-lab/FAILURES.md`
9. `pinch-lab/REGRESSION_TESTS.md`
10. `pinch-lab/FINAL_LAB_REPORT.md`

## Source-confirmed baseline observations

These are test targets, not experimental failures:

- The Studio is a deterministic UI simulation; configured prompts, tools, retries, and failure policies are not executed as a live pipeline.
- Save is session-memory only and has no durable restore path.
- Only `REQUIRE_APPROVAL` pauses automatic execution; BLOCK, REVISE, and failed stage results do not currently enforce their documented halt behavior.
- Generic evidence strength and a truth flag are inferred from objective length rather than evidence content.
- The Python verifier is a deterministic, closed-world structural gate followed by exact-normalized ground-truth matching.
- The Python dataset runner has no per-case persistent checkpoint or resume mechanism.

See `pinch-lab/BASELINE.md` and `pinch-lab/CLAIM_LEDGER.json` for evidence references and exact qualifications.

## Resume protocol

Do not rely on prior chat context.

1. Read `AGENTS.md`, this file, `pinch-lab/LAB_STATE.md`, `pinch-lab/BASELINE.md`, and `pinch-lab/LAB_PLAN.md`.
2. Recompute the baseline fingerprint, excluding `pinch-lab/`. If it differs, preserve `BASELINE_0` and create `BASELINE_1`.
3. Do not begin P2/P3 until the user explicitly authorizes the full experiment and confirms the model-policy text that previously ended after `If multiple models are available:`.
4. Before execution, freeze concrete fixture procedures, expected invariants, and scorecard rubrics.
5. Record each result with fixture ID, baseline version, procedure, expected invariant, actual observation, status, timestamp, and evidence pointer.
6. After every major phase, update every required field in `pinch-lab/LAB_STATE.md`.
7. On interruption or tool failure, persist the failure and `next_exact_action` before continuing.
8. Treat repair as a separately authorized phase after legitimate baseline results.
9. After any later implementation edit, run:

   ```text
   python -m unittest test_verifier.py -v
   python verifier.py examples.json
   ```

## Current next action

The immediate task is publication and context transfer only. Do not start the full procedural-epistemics experiment. Preserve `BASELINE_0` as historical evidence. Because this handoff documentation is a post-freeze change, create a new baseline version before any later experiment rather than silently changing `BASELINE_0`.

Minimal prompt for a new Claude session:

> Read `CLAUDE_HANDOFF.md` in the connected PINCH-Lite repository and follow its resume protocol. Treat procedural epistemic accountability as the project's core thesis. Do not infer experiment conclusions from source inspection or begin the full experiment without explicit authorization.
