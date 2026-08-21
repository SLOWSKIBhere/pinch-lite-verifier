# Pinch Lite Verifier Lab

## PINCH reflex constitution

Treat the following transition rules as invariants for any verification, audit,
provenance, release-readiness, or mutation claim in this repository:

- generated != verified
- verified != authorized
- authorized != executed
- executed != verified effect
- unavailable != PASS
- stale authority != current authority
- changed intent != authorized intent
- failed attempt != completed action
- corrupted or missing history != valid history

Use the reflex sequence:

`SENSE -> CLAIM -> VERIFY -> AUTHORIZE -> ACT -> OBSERVE -> AUDIT -> REMEMBER`

Do not collapse adjacent states. A proposal, model answer, tool call, process exit,
or successful write is evidence for only the state it actually establishes.

## Epistemic procedural accountability

For verification, audit, provenance, correctness, or release-readiness claims,
use the `pinch-epistemic-verifier` skill and a read-only verifier role before
reaching a final conclusion when the capability is available.

The verifier is read-only. Preserve disagreements, missing evidence, failed
checks, unavailable checks, and unresolved uncertainty rather than converting
them into confident conclusions. A verifier failure or unavailable verifier is
not a PASS.

## Mutation discipline

Before a side-effecting mutation:

1. State the claim or intended change precisely.
2. Gather evidence sufficient to test it.
3. Verify the claim independently where practical.
4. Obtain authority bound to the current run and current intent.
5. Mutate only within that authority scope.
6. Observe the actual tool result.
7. Check the expected postcondition independently.
8. Record unresolved uncertainty and the next valid state.

If verification shows that no mutation is required, withdraw the mutation.
Changing the intended action invalidates prior authorization and requires a new
verification/authorization cycle.

## DeepSeek Harness integration

When running under DeepSeek Harness, load `.dsh/skills/pinch-procedure` for the
full procedure. Use `.dsh/skills/pinch-epistemic-verifier` for independent
verification and `.dsh/skills/pinch-adversarial-audit` for post-mutation audit.
The `dsh-pinch-guard` integration is an authority boundary, not a substitute for
verification or audit.