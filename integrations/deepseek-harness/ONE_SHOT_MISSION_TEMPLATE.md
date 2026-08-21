# PINCH one-shot mission template

Use this as the thin mission layer above the repository `AGENTS.md`, project
skills, and `dsh-pinch-guard`. Replace bracketed fields; do not paste the entire
PINCH philosophy into each run.

```text
OBJECTIVE
[One falsifiable objective.]

EXECUTION ROOT
[Absolute repository/cwd.]

CURRENT RUN ID
[Controller-generated run id.]

CURRENT INTENT
[Canonical statement of the exact action currently intended.]

SCOPE
Allowed:
- [files/directories/capabilities]

Out of scope:
- [explicit exclusions]

ACCEPTANCE CRITERIA
- [observable postcondition]
- [required test/check]
- [no unrelated mutation]

PINCH MODE
Use the applicable AGENTS.md instructions as governing procedural policy.
Load pinch-procedure before material action.

Execute:
SENSE -> CLAIM -> VERIFY -> AUTHORIZE -> ACT -> OBSERVE -> AUDIT -> REMEMBER

Rules:
- Do not mutate before verification and authorization.
- Generated proposals carry no authority by themselves.
- A verifier FAIL, WITHDRAW, UNAVAILABLE, or UNRESOLVED cannot authorize ACT.
- Tool success proves execution, not correctness.
- Preserve failed checks, disagreement, missing evidence, and uncertainty.
- If evidence shows no mutation is necessary, WITHDRAW the mutation.
- Bind mutation authority to this run id and the digest of CURRENT INTENT.
- Changed intent invalidates existing authorization.
- Treat a dsh-pinch-guard denial as binding; do not route around it.

DELEGATION
Use subagents/workflows only when independent verification, parallel evidence
collection, or adversarial review materially improves confidence.
Verifier and auditor roles remain read-only.

MUTATION BUDGET
Maximum protected tool calls: [N]
Allowed protected tools: [write, edit, ...]
Allowed path prefixes: [absolute prefixes]
Unscoped tools explicitly permitted: [none by default]
Authority expires: [timestamp/window]

FINAL STATE
Return:
- claim status;
- evidence actually used;
- verifier outcome;
- authority scope actually consumed;
- mutations actually executed;
- checks actually observed;
- audit outcome;
- unresolved uncertainty;
- next valid state or next authorized action.
```

## Controller-side binding

Before a protected mutation, the trusted controller should canonicalize the
`CURRENT INTENT` and calculate its digest outside the model's write authority.
Set that value as `PINCH_INTENT_DIGEST`, set the matching `PINCH_RUN_ID`, and
issue the external authority receipt consumed by `dsh-pinch-guard`.

Do not let the model rewrite the receipt or the host execution-identity
environment variables it is being checked against.