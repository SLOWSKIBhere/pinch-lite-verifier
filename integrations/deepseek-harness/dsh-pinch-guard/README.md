# dsh-pinch-guard pilot

`dsh-pinch-guard` is the PINCH authorization boundary for DeepSeek Harness
side-effecting tools. It attaches to the documented `tools/pre-execute` seam,
then registers a monotonic `ctx.tools.guard()` denial so a protected execution
must have crossed the receipt gate before dispatch. It observes `tools/result`
only to clean up per-dispatch admission state; it never rewrites the result.

This directory is an out-of-tree/source-overlay pilot, not a published npm
package. The policy core is independently testable without DeepSeek Harness;
`src/index.ts` is the Harness adapter intended to be mounted from a profile or
copied into a Harness workspace package when productizing the integration.

## Why the receipt is external

The model must not be able to issue or edit its own authority. The configured
`receiptFile` therefore belongs to a trusted controller/human and should live
outside every filesystem/shell path writable by the agent. Use the Harness
filesystem policy and OS sandbox to make that trust boundary real.

The guard fails closed when the file cannot be read or parsed.

## Receipt schema

Example:

```json
{
  "version": 1,
  "receiptId": "run-2026-08-20-001-write-1",
  "runId": "run-2026-08-20-001",
  "intentDigest": "sha256:4e0f...",
  "issuedAt": "2026-08-20T21:00:00-04:00",
  "expiresAt": "2026-08-20T21:20:00-04:00",
  "verification": {
    "status": "PASS",
    "verifier": "pinch-epistemic-verifier",
    "evidence": [
      "README claim inspected",
      "unit test reproduced"
    ]
  },
  "allowedTools": ["write", "edit"],
  "pathPrefixes": ["/absolute/path/to/pinch-lite-verifier"],
  "allowUnscopedTools": [],
  "maxCalls": 2
}
```

The host process must also expose:

```text
PINCH_RUN_ID=run-2026-08-20-001
PINCH_INTENT_DIGEST=sha256:4e0f...
PINCH_CWD=/absolute/path/to/pinch-lite-verifier   # optional; defaults to host cwd
```

The intent digest should be produced by the trusted mission/controller from a
canonicalized description of the currently authorized action. If intent
changes, update the digest and issue a new receipt.

## Decision order

A protected call is denied unless all of these hold:

1. receipt version and identity are valid;
2. receipt `runId` equals the current host `PINCH_RUN_ID`;
3. receipt `intentDigest` equals the current host `PINCH_INTENT_DIGEST`;
4. verification status is exactly `PASS`;
5. the verifier is named and at least the configured evidence count exists;
6. the receipt is not expired;
7. its bounded call count is not exhausted;
8. the exact tool is allowed;
9. a path-scoped call resolves inside one allowed prefix; or
10. a tool with no path is explicitly listed in `allowUnscopedTools`.

A passed call reserves one call before downstream policy/approval. A later
rejection may therefore consume a call. That is intentional fail-closed replay
behavior.

## Protected tools

The adapter defaults to `write` and `edit`. Those tools are path-scoped through
`path`, `file_path`, or `target_path` arguments.

Do not add `bash`, `pwsh`, terminal, subprocess, or arbitrary composite tools to
`protectedTools` and assume path-prefix protection applies. Arbitrary command
syntax is not parsed. Such a tool must also appear in `allowUnscopedTools`, and
its safety must come from a separate sandbox/approval boundary.

## Adapter configuration

Conceptually mount the plugin with configuration equivalent to:

```yaml
receiptFile: /controller-owned/pinch/authority.json
protectedTools: [write, edit]
minimumEvidenceItems: 2
runIdEnv: PINCH_RUN_ID
intentDigestEnv: PINCH_INTENT_DIGEST
cwdEnv: PINCH_CWD
requireDurableSession: true
```

`requireDurableSession` defaults to true. A protected autonomous-agent call
without an owning Harness Session is denied because its authorization could not
be reconstructed from canonical history.

DeepSeek Harness profiles/bundles represent plugin composition as Cordis rows.
When this pilot is packaged into the Harness environment, insert the package as
an ordinary plugin row and pass the configuration above. Do not patch the agent
loop.

## Phase II durable protocol

DeepSeek already persists `tool/call` before tool execution and `tool/result`
after execution. Phase II adds only the accountability facts DeepSeek does not
already own:

```text
tool/call
   -> pinch/authority-admitted
   -> execution / denial / approval path
   -> tool/result
   -> pinch/audit-recorded        # trusted postcondition audit, when available
```

### `pinch/authority-admitted`

This event is appended before the exact execution token can pass the monotonic
guard. It records the run id, intent digest, receipt id, call id, tool name,
verifier identity, evidence count, SHA-256 digest of the verifier evidence,
receipt expiry, bounded-call ordinal, and resolved target path when path-scoped.

The event means **authorization crossed the PINCH boundary**. It does not mean
the body executed and does not mean the intended effect occurred.

### `tool/result`

The ordinary Harness event remains the canonical execution outcome. PINCH does
not duplicate this fact in a second custom event.

### `pinch/audit-recorded`

A trusted controller/auditor can append a postcondition audit through
`recordPinchAudit()`. No model-facing tool is exposed for minting audit truth.
The audit may bind to a tool call/receipt or to a claim digest. `PASS` requires
observed evidence; `UNAVAILABLE` and `UNRESOLVED` remain distinct states.

### Replay validation

`validatePinchReplay()` folds the durable event stream and checks that:

- an authority event follows a matching prior `tool/call`;
- tool identity and call identity agree;
- audits that bind to tool calls occur only after the corresponding
  `tool/result`;
- audit run/intent/receipt identity agrees with the authority record;
- duplicate authority or audit identities are rejected;
- a log ending after authority but before result is preserved as interruption
  evidence instead of being converted into success.

This follows DeepSeek's merge-extensible SessionEvent design: PINCH adds ordinary
plugin event vocabulary rather than changing the core Session envelope.

## Tests

Run:

```sh
cd integrations/deepseek-harness/dsh-pinch-guard
npm install --omit=peer
npm test
```

The suite covers the original policy boundary plus adapter and replay cases:
valid authority, stale-run replay, changed intent, unavailable verification,
withdrawal, insufficient evidence, path escape, unscoped-tool denial, bounded
call exhaustion, expiry, missing durable Session, durable authority logging,
invalid event order, mismatched audit identity, and interrupted log tails.

## Research track: epistemic Simplex / reference monitor

Phase II also treats the guard as a research object rather than assuming the
analogy is already proven. The focused agenda is in:

`../research/SIMPLEX_REFERENCE_MONITOR_EPISTEMIC_ACCOUNTABILITY.md`

The working thesis is deliberately narrow: reference-monitor and Simplex
principles may enforce **epistemic process integrity** (justified transitions,
non-bypassable mediation, conservative fallback, replayable evidence) without
claiming that the monitor itself can guarantee truth.

## Remaining productization work

The next integration steps are:

1. mount this package inside a real DeepSeek Harness profile at the reviewed
   `0.1.0-rc.8` compatibility point;
2. run the replay validator over actual persisted Sessions, not only synthetic
   event sequences;
3. decide whether to promote replay validation into a Harness invariant
   companion analogous to `tool-workflow/invariant`;
4. add a trusted auditor bridge that records `pinch/audit-recorded` from the
   independent verifier/auditor process;
5. exercise alternate capability paths (Code Mode, MCP, delegated subagents,
   shell/terminal) to measure complete-mediation coverage rather than assuming
   it.
