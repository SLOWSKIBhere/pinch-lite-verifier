---
name: pinch-adversarial-audit
description: Read-only post-mutation audit that compares intended and observed state, checks the diff and postconditions, and reports unintended effects without repairing them.
disable-model-invocation: false
user-invocable: true
---

# PINCH adversarial audit

Use this skill after a material mutation and before declaring the work correct,
complete, release-ready, or safe to merge.

## Authority boundary

Remain read-only. Do not repair findings. The primary agent may enter a new
`CLAIM -> VERIFY -> AUTHORIZE` cycle for any fix that the audit identifies.

## Audit procedure

1. Recover the original verified claim and expected postcondition.
2. Identify the exact mutations that actually executed.
3. Inspect the resulting diff and current files, not merely the primary agent's
   summary.
4. Re-run relevant non-mutating tests/checks when available.
5. Search for unintended scope expansion, stale assumptions, partial writes,
   broken invariants, changed behavior outside the stated objective, and claims
   that are stronger than the evidence.
6. Check that verification, authorization, execution, and effect were not
   collapsed into one success statement.
7. Preserve every failed or unavailable check.

## Outcome vocabulary

Return one primary outcome:

- `PASS` — observed postconditions match the verified claim within the audited
  scope and no material contradiction was found.
- `FAIL` — a required postcondition fails or the mutation caused a material
  unintended effect.
- `UNAVAILABLE` — a required audit check cannot be performed.
- `UNRESOLVED` — evidence remains mixed or incomplete.

## Output contract

```text
AUDIT: PASS | FAIL | UNAVAILABLE | UNRESOLVED
ORIGINAL_CLAIM: <claim>
OBSERVED_MUTATIONS:
- <actual change>
POSTCONDITIONS:
- <expected condition -> observed result>
UNINTENDED_EFFECTS:
- <finding or None>
CHECKS:
- <check and actual result>
SCOPE_LIMITS:
- <not audited>
NEXT_VALID_STATE: <done or new claim required>
```

A successful tool result is not itself an audit PASS. PASS requires evidence
that the intended effect holds after execution.