# PINCH Lab Failure Log

experiment_id: `PINCH-LAB-20260810-PREFLIGHT-01`
baseline_version: `BASELINE_0`

## Experiment failures

None. The full experiment has not started.

## Preflight infrastructure incidents

### INFRA-001 — sandboxed PowerShell launch failure

- Phase: baseline read-only inspection
- Observation: ordinary shell launches failed before repository command execution with `CreateProcessAsUserW failed: 5 (Access is denied.)`.
- Impact: no repository operation ran in the failed attempts; inspection was briefly delayed.
- Recovery: reran only necessary read-only commands through the managed approval path, confined to the project folder.
- Boundary evidence: no administrator access, network access, installs, writes, commits, or pushes were used for inspection.
- Status: recovered; retain as a tool-resilience datum for the later experiment.

## Protocol hazards

### PROTOCOL-001 — request ends mid-model-policy sentence

The supplied text ends immediately after `If multiple models are available:`. This does not block baseline freezing or artifact creation. It does block assuming any additional model-selection rule for the full experiment. Active conservative rule: remain on the current model and do not switch.

### PROTOCOL-002 — pre-existing dirty worktree

The baseline contains tracked modifications and untracked files. Git `HEAD` is not the experiment baseline. `BASELINE.md` hashes define `BASELINE_0`; future drift must create a new baseline version rather than silently revising this one.

## Source-supported hypotheses awaiting experiment

Potential Studio weaknesses are recorded in `BASELINE.md` and `CLAIM_LEDGER.json`. They are deliberately not labeled experimental failures until a frozen fixture runs.
