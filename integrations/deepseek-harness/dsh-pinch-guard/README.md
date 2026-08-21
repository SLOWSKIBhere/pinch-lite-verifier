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
```

DeepSeek Harness profiles/bundles represent plugin composition as Cordis rows.
When this pilot is packaged into the Harness environment, insert the package as
an ordinary plugin row and pass the configuration above. Do not patch the agent
loop.

## Tests

The policy tests intentionally cover the failure modes PINCH cares about:

```sh
cd integrations/deepseek-harness/dsh-pinch-guard
npm install --omit=peer
npm test
```

Covered cases include a valid path mutation, stale-run replay, changed intent,
unavailable verification, mutation withdrawal, insufficient evidence, path
escape, unscoped-tool denial, explicit unscoped opt-in, exhausted call count,
and expiry.

## Deferred productization

The next Harness-native step is durable projection of a PINCH authorization and
audit receipt into the session event log. This pilot deliberately avoids
inventing a new session-event vocabulary before the upstream event contract and
persistence semantics are integrated and tested end-to-end.