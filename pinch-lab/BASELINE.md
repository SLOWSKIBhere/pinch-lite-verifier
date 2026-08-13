# BASELINE_0

Captured: `2026-08-10T18:44:58.6249139-04:00`
Repository: `C:\Users\16p30\agent-projects\pinch-lite-verifier`
Git branch/upstream: `main` / `origin/main`
Git HEAD: `c6a8df377fac7b6c9a5307d3a39a898519d8c977`
Conceptual baseline: exact pre-lab working tree, including pre-existing tracked modifications and untracked files.

## Baseline integrity

Before lab creation, all four tracked implementation/data/documentation files were modified relative to `HEAD`: `README.md`, `examples.json`, `test_verifier.py`, and `verifier.py`. `PinchWorkflowStudio.jsx`, the local agent instructions, cache files, and local review-skill files were untracked. No attempt was made to clean, restore, stage, commit, or repair this state.

Fingerprint method: exclude `.git/`, `.venv/`, every `__pycache__/`, and the later-created `pinch-lab/`; sort UTF-8 records formatted as `relative/path<TAB>lowercase_sha256<LF>`. The 11-file aggregate SHA-256 is:

`f9cf45cf2a4397cee73506014f44137e51cb81dfcd99075de886b4b3cf238f01`

Core behavioral file hashes:

| File | SHA-256 |
|---|---|
| `PinchWorkflowStudio.jsx` | `ab02b33879e4b071cc149e2cddadf236c8fd8a7c47ca9de7a5c65e8cc5515c11` |
| `verifier.py` | `7f878ae74b2371f1e64f7177a5673809e7b2d3df4395e4b077452396fab955bb` |
| `test_verifier.py` | `8431d9b602d2305a4b086e02019710a09c35ae4749ca1aa21d5a7addb7714e6d` |
| `examples.json` | `fb2d5b46700d2d6ffbdb1051e96a46323d97e8989e2e09f55fdd922a4086546a` |
| `README.md` | `4c99dc0ec04b073e195ecf60349c1d664ba5f4f4898505b641002e924a31c7e3` |
| `AGENTS.md` | `21216a0ba4d4955ffa8998ac8aebdaf4f5e2b2192f0577a223369656e1f7851c` |

The remaining fingerprinted files are `# AGENTS.yaml`, `code-review-self-report.SKILL.md`, `code-review-self-report.skill`, `code-review-self-report/SKILL.md`, and `code-review-self-report/scripts/validate_report.py`. Their inventory is provenance only; they are not Studio runtime stages.

## Studio workflow stages and prompts

Default state is a blank objective (`maxRisk: low`), project name `Untitled PINCH Workflow`, dark theme, and all 11 core nodes enabled and locked. Source: `PinchWorkflowStudio.jsx:182-243,1750-1765`.

| Order | Stage | Instruction/configuration | Tools; risk; retries; failure |
|---:|---|---|---|
| 1 | Intent Router | Parse the objective; identify domain and risk posture. | none; low; 1; halt |
| 2 | Task Decomposer | Split into an ordered list of bounded subtasks. | none; low; 1; halt |
| 3 | Planner | Order and assign subtasks; define checkpoints. | none; low; 1; halt |
| 4 | Generator | Produce a candidate with explicit claims and evidence references. | `web_search`; medium; 2; retry-then-halt |
| 5 | Semantic Claim Mapper | Decompose candidate into atomic claims tagged with criticality. | none; low; 1; halt |
| 6 | Evidence Verifier | Weigh attached evidence independently of ground truth. | none; low; 1; halt |
| 7 | Ground-Truth Verifier | Compare claims to reference facts independently of evidence verifier. | none; low; 1; halt |
| 8 | Verifier Consensus | Apply deterministic reconciliation; unavailable verification never becomes pass. | none; low; 1; halt |
| 9 | Permission Gate | Evaluate consensus, requested tools, and risk; Generator alone cannot authorize. | none; medium; 0; halt |
| 10 | Bounded Executor | Execute only authorized scope and record actual attempted action. | `web_search`; medium; 1; halt |
| 11 | Post-Execution Auditor | Compare requested, permitted, approved, attempted, and claimed states. | none; low; 1; halt |

The exact responsibility, input, output, and prompt strings are frozen at `PinchWorkflowStudio.jsx:184-238` and protected by the JSX hash above.

Regex-selected optional stage pairs exist for research, creative, coding, and data objectives. Research adds Research Specialist/Source Analyst; creative adds Ideation/Critique; coding adds Implementation/Test Engineer; data adds Data Analyst/Validation Agent. Generator-like additions are inserted after Planner and verifier-like additions after Generator. High risk makes Executor high risk and inserts Compliance Reviewer after Auditor. Source: `PinchWorkflowStudio.jsx:76-143,247-283`.

Four seeded Studio scenarios exist: `research-brief`, `creative-campaign`, `coding-assistant`, and `adversarial`. Their exact objectives, claims, evidence references, truth flags, and special bypass/unknown-tool flags are frozen at `PinchWorkflowStudio.jsx:288-361`.

## Studio topology and execution behavior

The active pipeline is `nodes.filter(enabled)` in array order. Each simulated stage receives only a display string naming the previous stage's output; stage prompt metadata is not executed. The simulation advances automatically every 900 ms or one stage at a time; it snapshots nodes/objective at run start. Pause, continue, cancel, and reset are UI state transitions. Cancel marks future stages skipped. Source: `PinchWorkflowStudio.jsx:591-713,1952-2026`.

This is a deterministic simulation, not a live model/tool pipeline. No configured prompt is sent to a model, no allowed tool is invoked, retries and failure behaviors are not enforced, and Executor returns a canned `success: true` result whenever authorized. Only `REQUIRE_APPROVAL` pauses auto-run; failed, BLOCK, and REVISE stage results do not halt later stages. Source: `PinchWorkflowStudio.jsx:541-548,591-713,1732-1740`.

Studio Save stores a snapshot only in a React ref for the current mounted session. There is no durable storage or restore action. JSON/Markdown export uses browser clipboard/download APIs and is the only user-facing persistence path. Source: `PinchWorkflowStudio.jsx:157-178,782-801,1882-1885,2011-2016`.

## Studio thresholds and verifier rules

- High risk is triggered by the hard-coded action-keyword regex or `objective.maxRisk === 'high'`.
- Generic claim evidence is manufactured from objective word count: at least 14 words gives 3 references, at least 8 gives 2, at least 3 gives 1, otherwise 0. The primary generic claim receives a true truth flag when it has at least two references.
- Evidence verdict: at least 2 references = confirmed; 1 = partially supported; 0 = unverifiable.
- Ground truth verdict: stored `true` = confirmed, `false` = contradicted, otherwise unverifiable.
- Consensus precedence: confirmed/contradicted conflict = UNRESOLVED; a critical unavailable/contradicted claim = BLOCK; both confirmed = PASS; other contradiction = BLOCK; unavailable = UNRESOLVED; partial = REVISE; fallback = UNRESOLVED.
- Architecture warnings include output shorter than 3 characters, retry limit above 5, and tools absent from the objective free-text list; at most 4 active nodes is informational. Safe retry repair targets 3.
- Permission priority is blocked claim, disallowed tool, unresolved claim, revise claim, high risk, then execute.

Source: `PinchWorkflowStudio.jsx:143,363-453,456-538`.

Permissions are metadata. The gate aggregates allowed tools from every enabled node. Tool authorization uses substring matching, not exact token equality. High risk requires approval, but other node-risk/objective-risk mismatches are not compared. Approve Once rewrites the gate decision to EXECUTE and sets an `approvedOnce` flag. Source: `PinchWorkflowStudio.jsx:511-538,1413-1429,1989-2007`.

## Studio scorecard

Metrics are Architecture Completeness, Claim Support Coverage, Verifier Agreement, Permission Compliance, Execution Alignment, and Audit Coverage.

- Architecture = 55% core enablement + 10 objective + 10 success criteria + 5 output + up to 20 after `10 * critical + 3 * warning` deductions.
- Support coverage counts any evidence verdict other than unverifiable.
- Agreement gives 1 for identical verifier statuses and 0.5 for confirmed/partially-supported pairs.
- Permission starts at 100, minus 30 per disallowed tool and 10 for gate BLOCK.
- Execution is 0 before run, 60 after run but before audit, then 15 for mismatch or 100 for match.
- Audit is 0 before run; with audit it is `60 + 40 * supported/total` (or 100 with no claims).
- Overall weights are 20%, 20%, 15%, 15%, 15%, 15%. Any critical architecture finding, gate BLOCK, or claim BLOCK caps readiness at 35.
- Final statuses are Blocked, Incomplete, Needs Revision, or Ready.

For untouched source defaults, static evaluation is: architecture 55, support 0, agreement 0, permission 100, execution 0, audit 0, overall 11, final status Blocked. This is a source-derived snapshot, not a UI experiment result. Source: `PinchWorkflowStudio.jsx:718-779`.

## Python verifier behavior

`verify(candidate)` is structure-only. `verify_case(case)` validates ground truth, runs the structural gate, and runs accuracy only after structural PASS. Results contain status, score, and errors; case results add failed stage, structure score, and accuracy score. Source: `verifier.py:18-72,143-176`.

Structural score begins at 100:

- invalid/empty answer: -30;
- confidence must be non-Boolean numeric in inclusive 0.0..1.0: -20;
- evidence not a list: -20;
- each invalid/empty evidence item: -10;
- each usable item missing below two: -10;
- confidence strictly above 0.80 with fewer than two usable evidence items: -20;
- clamp at zero; any error means FAIL.

Accuracy gives 50 for an exact normalized accepted-answer match, 25 for each of the first two distinct accepted-evidence matches, and one fixed -10 penalty for any unsupported evidence. Normalization is Unicode NFKC, case-folding, and collapsed whitespace; no fuzzy/substring match. Accuracy passes only with score 100 and no errors. Source: `verifier.py:21-66,75-131`.

Malformed ground truth raises `ValueError`. CLI input/protocol errors return 2; dataset mismatch returns 1; full dataset match returns 0. Plain-candidate structural FAIL still exits 0 after printing its result. Dataset processing is sequential and has no per-case recovery, resume, retry, timeout, or persistent result mechanism. Stored expected values do not influence computation and are used only for equality checking. Source: `verifier.py:81-101,135-176,192-259`.

`examples.json` contains 20 cases. The runtime uses only Python standard-library imports, reads a caller-supplied local JSON path, and writes stdout/stderr; it performs no network, model, API, subprocess, or file-write operation.

## Current project permissions

Repository policy requires work only in this folder, Python standard library only, no installs, network/APIs/secrets/other project folders, administrator access, unrelated deletion, commits, or pushes. After edits it requires the unittest command and CLI example, exact change/command reporting, and stopping when verification passes. Source: `AGENTS.md:3-15`.

## Baseline epistemic risks to test, not repairs

1. Prompts, retries, and failure policies are display metadata rather than executed controls.
2. BLOCK/REVISE/failed stages do not stop auto-run.
3. Risk comparison is incomplete and tool matching uses inconsistent substring logic.
4. Generic evidence and a truth flag are inferred from objective length, not evidence content.
5. Confirmed-versus-contradicted is UNRESOLVED before critical contradiction handling, making it human-overridable.
6. `verifier_error` is display metadata but is never emitted or explicitly handled by consensus.
7. Audit uses canned success and a completion-keyword heuristic rather than semantic comparison.
8. Pre-gate Permission Compliance is 100; final status does not directly check UNRESOLVED claims.
9. Core stages may be disabled and architecture findings do not prevent simulation.
10. Studio interruption recovery depends on manual export because Save is not durable.

These are source-supported test targets. They are not counted as experiment failures until fixtures execute.
