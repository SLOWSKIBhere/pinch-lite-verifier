# PINCH × DeepSeek Harness

This directory is the pilot integration between PINCH procedural accountability
and DeepSeek Harness. It targets the DeepSeek Harness `0.1.0-rc.8` architecture
reviewed for this integration and intentionally uses documented extension seams
instead of modifying the Harness agent loop.

## Design

PINCH owns the state-transition discipline:

```text
SENSE -> CLAIM -> VERIFY -> AUTHORIZE -> ACT -> OBSERVE -> AUDIT -> REMEMBER
```

DeepSeek Harness supplies the execution substrate:

```text
workspace instructions / skills
        -> agent turn
        -> tools/pre-execute
        -> monotonic guards
        -> tool execution
        -> immutable tools/result
        -> durable session events
```

The integration maps them as follows:

| PINCH state | Harness surface |
| --- | --- |
| SENSE | `AGENTS.md`, skills, filesystem/session observations |
| CLAIM | current turn plus explicit mission/claim record |
| VERIFY | read-only verifier skill/subagent |
| AUTHORIZE | `dsh-pinch-guard` pre-execute gate + monotonic guard |
| ACT | normal Harness tools / Code Mode / sandbox |
| OBSERVE | immutable `tools/result` and durable session events |
| AUDIT | read-only adversarial audit skill/subagent |
| REMEMBER | session log plus compact PINCH state record |

## Files in this repository

- `../../AGENTS.md` — repository-level PINCH reflex constitution.
- `../../.dsh/skills/pinch-procedure/SKILL.md` — operational procedure and
  one-shot mission contract.
- `../../.dsh/skills/pinch-epistemic-verifier/SKILL.md` — independent read-only
  verifier role.
- `../../.dsh/skills/pinch-adversarial-audit/SKILL.md` — read-only post-mutation
  audit role.
- `global-AGENTS.template.md` — template for the user's `$DSH_HOME/AGENTS.md`.
- `dsh-pinch-guard/` — out-of-tree Harness plugin prototype for binding
  side-effecting tool calls to a verified authority receipt.

## Trust boundary

The guard deliberately does **not** issue its own authority receipts. A receipt
must be created by a trusted human/controller outside the model-writable
workspace and stored at a path that the agent cannot modify. The plugin reads
that receipt immediately before a protected tool call.

If the model can write its own receipt file, the authorization boundary is not
meaningful. Constrain the filesystem/shell sandbox accordingly.

The authority receipt binds a mutation to:

- one `runId`;
- one `intentDigest`;
- a verifier `PASS` plus evidence;
- explicit tool names;
- explicit path prefixes for path-scoped tools;
- an expiry time;
- a bounded call count.

Unscoped tools such as a shell are denied unless the receipt explicitly opts
that exact tool into `allowUnscopedTools`. This is intentional: parsing arbitrary
shell syntax into a trustworthy filesystem scope is not attempted here.

## Recommended Harness wiring

1. Copy `global-AGENTS.template.md` to `$DSH_HOME/AGENTS.md` and keep only the
   universal PINCH invariants there.
2. Start `dsh` from this repository so project `.dsh/skills` and `AGENTS.md` are
   discovered by the normal workspace mechanisms.
3. Install/mount the `dsh-pinch-guard` plugin in the selected Harness profile.
4. Configure `receiptFile` to a controller-owned path outside the agent's write
   authority.
5. Set `PINCH_RUN_ID` and `PINCH_INTENT_DIGEST` in the Harness host process for
   the current one-shot mission.
6. Protect at least `write` and `edit`. Add shell/process tools only when an
   external sandbox and an explicit unscoped-tool receipt policy make that safe.
7. Run the regression suite before relying on the guard as an authority
   boundary.

## One-shot operating model

A one-shot prompt should declare the mission, not re-embed the entire operating
system. The expected shape is:

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
Use repository instructions and pinch-procedure.
SENSE -> CLAIM -> VERIFY -> AUTHORIZE -> ACT -> OBSERVE -> AUDIT -> REMEMBER

DELEGATION
Use read-only verifier/auditor subagents when independent evidence improves
confidence.

FINAL STATE
Report claim status, evidence, authority scope, actual mutations, observed
checks, audit result, unresolved uncertainty, and next valid state.
```

## Current pilot boundary

This branch establishes the constitution, three skills, authority-policy core,
and a Harness adapter prototype. It does not modify upstream DeepSeek Harness,
does not mint trusted receipts, and does not claim shell-command path scoping.
Those boundaries are deliberate so the pilot fails closed rather than simulating
a stronger security property than it has.