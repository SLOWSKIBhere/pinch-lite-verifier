---
name: pinch-procedure
description: Execute repository work through the PINCH reflex sequence with explicit claim, verification, authority, observation, audit, and durable uncertainty.
disable-model-invocation: false
user-invocable: true
---

# PINCH procedure

Use this skill for work where correctness, provenance, mutation safety, or release
readiness matters. The repository `AGENTS.md` is the constitutional layer; this
skill is the operational procedure.

## Reflex

Run these states in order and never silently merge them:

`SENSE -> CLAIM -> VERIFY -> AUTHORIZE -> ACT -> OBSERVE -> AUDIT -> REMEMBER`

### 1. SENSE

Establish current state before proposing action. Read the relevant files,
configuration, tests, repository instructions, and recent execution evidence.
Distinguish observed facts from assumptions. Do not treat stale context as
current state.

### 2. CLAIM

State one falsifiable working claim or intended change. Include:

- objective;
- current-state evidence;
- expected postcondition;
- scope of files/tools that may need mutation;
- known uncertainty.

If the task is broad, decompose it into individually verifiable claims rather
than issuing one blanket claim for the entire project.

### 3. VERIFY

Use `pinch-epistemic-verifier` or an equivalent read-only verifier for material
claims. Verification should try to falsify the claim, not merely restate the
primary agent's reasoning. Preserve `PASS`, `FAIL`, `WITHDRAW`, `UNAVAILABLE`,
and unresolved outcomes distinctly.

`WITHDRAW` means the evidence shows that the proposed mutation is unnecessary
or no longer justified. Do not proceed to authorization in that case.

### 4. AUTHORIZE

Before a side-effecting action, require authority bound to the current execution
context. At minimum bind authority to:

- current run id;
- current intent digest;
- verifier status;
- permitted tool names;
- permitted path prefixes where the tool is path-scoped;
- expiration or bounded call count.

Changed intent invalidates the prior authority. A receipt from another run is
stale even if the action sounds semantically similar. The model's own proposal
is not authority.

When `dsh-pinch-guard` is mounted, treat a guard denial as binding. Do not route
around it through another tool or shell path.

### 5. ACT

Perform the smallest mutation that satisfies the verified claim and authorized
scope. Avoid opportunistic cleanup, unrelated refactors, or scope expansion.
If execution requires a capability outside the receipt, stop and re-enter
`CLAIM -> VERIFY -> AUTHORIZE` for the changed intent.

### 6. OBSERVE

Record what actually happened, not what the tool was expected to do. A success
exit status or successful write establishes execution only; it does not prove
the postcondition.

### 7. AUDIT

Use `pinch-adversarial-audit` after material mutation. Compare the observed
state against the claim and expected postcondition, run relevant checks, inspect
the diff, and actively search for unintended effects.

### 8. REMEMBER

Finish with a compact state record containing:

- claim status;
- evidence used;
- verifier outcome;
- authority scope used;
- mutations actually executed;
- checks actually observed;
- audit outcome;
- unresolved uncertainty;
- next valid state or next authorized action.

## One-shot mission contract

For advanced one-shot work, normalize the user's request into this contract
before execution:

```text
OBJECTIVE
<one falsifiable objective>

EXECUTION ROOT
<repository/cwd>

SCOPE
Allowed:
- ...
Out of scope:
- ...

ACCEPTANCE CRITERIA
- ...

PINCH MODE
SENSE -> CLAIM -> VERIFY -> AUTHORIZE -> ACT -> OBSERVE -> AUDIT -> REMEMBER

DELEGATION
Use subagents/workflows only when independent verification, parallel evidence
collection, or adversarial audit materially improves confidence. Verifier and
auditor roles remain read-only.

FINAL STATE
Return claim status, evidence, authority scope, executed mutations, observed
checks, audit outcome, unresolved uncertainty, and the next valid state.
```

Do not inflate a simple task into unnecessary ceremony. The reflex protects
state transitions; it does not require maximal verbosity.