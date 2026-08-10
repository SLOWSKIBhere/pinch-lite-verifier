# Controlled PINCH Simulation Experiment

Date: 2026-08-10

## Question

Does the implemented PINCH state machine produce materially different execution
outcomes when a supported workflow is replaced with an adversarial or unresolved
workflow, while the application code and test procedure remain fixed?

## Hypotheses

- **H1 — supported control:** the verified research example should reach
  `EXECUTE`, run the bounded executor, and finish with `Ready` at 80% readiness
  or higher.
- **H2 — adversarial treatment:** unsupported critical claims and an unauthorized
  tool request should reach `BLOCK`, skip the executor, trigger an audit mismatch,
  and cap readiness at 35% or lower.
- **H3 — approval treatment:** unresolved creative claims should reach
  `REQUIRE_APPROVAL`; an explicit rejection should prevent executor activity.

## Controls

- Same source revision and dependency lockfile
- Same React component and deterministic state machine
- Same jsdom runtime and event-dispatch procedure
- No network calls, model calls, or real tool execution
- Stepwise advancement rather than timing-dependent auto-run behavior

The independent variable is the seeded example. Primary dependent variables are
the permission decision, executor state, audit state, final status, and readiness
range.

## Procedure

The test mounts the actual application component, loads one seeded example,
opens the simulation workspace, advances the state machine one stage at a time,
and inspects the rendered accessible UI.

Run:

```bash
npm run experiment
```

## Observed result

All three preregistered conditions passed their assertions:

| Condition | Expected outcome | Observed outcome |
| --- | --- | --- |
| Verified research | `EXECUTE`, executor runs, `Ready` | Passed |
| Adversarial | `BLOCK`, executor skipped, mismatch, readiness ≤35% | Passed |
| Creative + reject | `REQUIRE_APPROVAL`, then rejection blocks execution | Passed |

Vitest result: **1 test file passed; 3 tests passed; 0 failed**.

The production build also passed, transforming 1,793 modules with no build
errors. The generated production HTML and JavaScript bundle were served over
localhost and returned HTTP 200.

## Interpretation boundary

This experiment validates internal implementation invariants: the programmed
gates distinguish these fixtures and prevent execution on the tested blocked and
rejected paths. It does **not** show that PINCH detects arbitrary real-world false
claims, improves a model, or generalizes beyond the deterministic fixtures.

The uploaded standalone Python PINCH-Lite dataset could not be rerun because its
required `verifier.py` implementation was not included with `examples.json` and
`test_verifier.py`. That missing module is recorded rather than reconstructed.
