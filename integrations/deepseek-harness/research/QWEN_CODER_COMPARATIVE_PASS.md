# Qwen Coder comparative research pass

## Research objective

Use Qwen3-Coder + Qwen Code as a second agent/harness family to test the Phase-II question:

> Can Simplex/reference-monitor principles extend from physical safety and information security to epistemic accountability in autonomous agent systems?

This pass treats **Qwen3-Coder as the high-capability controller** and **Qwen Code as the operational harness**. It does not treat the model's own judgment as a trusted authority bit.

## Why Qwen is a useful comparison target

Qwen3-Coder is explicitly trained for agentic coding and environment interaction, while Qwen Code exposes permission modes, tool mediation, hooks, subagents, persistent sessions, sandbox options, and review workflows. That makes the stack useful for separating three things PINCH must not conflate:

1. model capability;
2. harness capability/permission;
3. epistemic justification for a particular commitment or side effect.

Primary sources:

- Qwen3-Coder repository: https://github.com/QwenLM/Qwen3-Coder
- Qwen3-Coder announcement: https://qwenlm.github.io/blog/qwen3-coder/
- Qwen Code repository: https://github.com/QwenLM/qwen-code
- Qwen Code hooks: https://github.com/QwenLM/qwen-code/blob/main/docs/users/features/hooks.md
- Qwen Code approval modes: https://github.com/QwenLM/qwen-code/blob/main/docs/users/features/approval-mode.md
- Qwen Code auto mode: https://github.com/QwenLM/qwen-code/blob/main/docs/users/features/auto-mode.md
- Qwen Code settings / permission policy: https://github.com/QwenLM/qwen-code/blob/main/docs/users/configuration/settings.md
- Qwen Code bundled review design: https://github.com/QwenLM/qwen-code/blob/main/packages/core/src/skills/bundled/review/DESIGN.md
- Qwen CUA permission/consent design: https://github.com/QwenLM/qwen-code/blob/main/packages/cua-driver/docs/driver-permission-modes-and-consent-plan.md

## Source-derived architecture observations

### 1. Qwen already separates high-capability reasoning from deterministic permission rules

Qwen Code's permission system gives deterministic rules higher priority than interactive/default behavior:

```text
deny > ask > allow > mode/default behavior
```

The important PINCH implication is that an LLM safety classifier is not the final authority layer. In Auto Mode, explicit `permissions.deny` rules are evaluated before the LLM classifier and cannot be overridden by it.

This is structurally compatible with a Simplex/reference-monitor interpretation:

- complex controller: Qwen3-Coder;
- heuristic/adaptive monitor: Auto Mode LLM classifier;
- trusted safety boundary: deterministic permission rules + protected launcher/system policy;
- conservative fallback: ask/plan/manual review when the adaptive layer is uncertain or unavailable.

The adaptive classifier is useful, but it should not be inside PINCH's minimal trusted computing base.

### 2. Auto Mode is a useful negative and positive control

Qwen Code Auto Mode is explicitly classifier-driven. It contains:

- deterministic deny rules that run first;
- fast-path auto-approval for known read-only or in-workspace operations;
- an LLM classifier for the remaining calls;
- fail-closed behavior when the classifier is unavailable, with eventual fallback to manual approval;
- explicit warnings that the classifier is best-effort and not a substitute for deterministic deny rules.

This gives the Phase-II experiment an unusually clean comparison:

```text
Qwen ordinary mode
    vs
Qwen Auto Mode (LLM safety classifier)
    vs
PINCH deterministic epistemic monitor
    vs
PINCH + Simplex-style conservative fallback
```

A key falsifiable question becomes:

> Does a deterministic epistemic transition gate add measurable value beyond Qwen's already-strong adaptive permission classifier?

### 3. Qwen hooks expose exactly the right intervention points, but hook integrity matters

Qwen Code supports lifecycle hooks including:

- `PreToolUse`;
- `PostToolUse`;
- `PostToolUseFailure`;
- `Stop`;
- `SubagentStart` / `SubagentStop`;
- `SessionStart` / `SessionEnd`.

`PreToolUse` can return `allow`, `deny`, or `ask`, and `PostToolUse` can inspect the result and inject context.

This is a natural prototype surface for PINCH:

```text
CLAIM / VERIFY
      ↓
trusted receipt
      ↓
PreToolUse PINCH gate
      ↓
Qwen tool dispatch
      ↓
PostToolUse / Failure
      ↓
AUDIT
```

However, a normal project/user hook is not automatically a reference monitor. Qwen hooks can be globally disabled through settings, so complete mediation and tamper resistance require the hook/configuration to live in a higher-trust scope than the acting agent.

Qwen's configuration precedence helps here: system settings can override user/project settings. Qwen's managed external-context documentation specifically describes administrator-controlled system settings that keep required hooks enabled against lower-precedence workspace configuration. That is closer to the integrity boundary PINCH needs.

### 4. Qwen's CUA permission design independently reaches a PINCH-like separation

The July 2026 CUA Driver permission/consent design is especially relevant. It separates:

- OS permission;
- capability policy;
- permission mode;
- bounded consent grant;
- hard invariants.

Its decision equation is an intersection:

```text
hard invariants
AND managed capability ceiling
AND user/session capability policy
AND mode-specific consent/grant decision
AND live resource identity proof
```

This strongly supports the distinction introduced in PINCH Phase II:

```text
CAPABILITY_GRANTED != ACTION_JUSTIFIED
```

The CUA design protects capability/consent transitions. PINCH proposes a second orthogonal plane for evidential justification:

```text
capability policy says the operation MAY be performed
AND
PINCH says the current evidence JUSTIFIES this exact operation
```

The combined condition is strictly stronger than either alone.

### 5. Qwen's own CUA design uses reference-monitor language in substance

The CUA design requires that:

- unrestricted mode cannot be self-enabled by the agent;
- policy denial cannot be widened by an approval mode;
- resource identity is revalidated immediately before mutation;
- configured-policy errors fail closed;
- the agent/tool channel cannot elevate mode or policy;
- arbitrary same-user code execution is outside the in-process boundary unless external OS isolation exists.

That is highly relevant to the research question because it shows the same high-assurance pattern emerging independently in a contemporary autonomous-agent stack for **capability accountability**.

The open PINCH question is whether the pattern can also enforce **epistemic accountability**.

### 6. Qwen `/review` is an epistemic procedure, not yet an epistemic reference monitor

Qwen Code's bundled `/review` design is unusually valuable for this research. The current design uses a large parallel reviewer ensemble, a verification stage, and reverse-audit rounds. It explicitly distinguishes generation of findings from verification of findings.

Particularly relevant design choices include:

- multiple independent review agents to force coverage diversity;
- dedicated issue-fidelity/root-cause review;
- separate batch verification of findings;
- a high evidential bar for rejecting Critical findings (quoted contradiction);
- reverse audit as a different cognitive task from targeted verification;
- dry-round stopping rules that treat one empty pass as insufficient evidence of convergence.

This is epistemic accountability as **procedure**. It already embodies principles like:

```text
generated finding != verified finding
one dry review != proof of completeness
implementation correctness != issue fidelity
```

But the review ensemble remains LLM-mediated and is not a tamper-resistant authority kernel. Therefore it is a strong generator/verifier layer to put *above* PINCH, not a substitute for PINCH.

## Qwen-specific PINCH architecture

A research prototype should use the Qwen stack this way:

```text
                 QWEN3-CODER
         high-capability controller
                    │
              candidate claim
                    │
       read-only verifier / /review
                    │
             verification record
                    │
════════════ trusted boundary ════════════
                    │
       controller-owned authority receipt
                    │
      system-protected PreToolUse monitor
                    │
       deterministic PINCH transition gate
                    │
             Qwen permission layer
                    │
                tool dispatch
                    │
         PostToolUse / failure evidence
                    │
             adversarial audit
                    │
           durable accountability log
```

The Qwen permission layer and PINCH gate are complementary:

- **Qwen permission policy:** may this capability be used?
- **PINCH verification/authority:** is this exact action justified by current evidence and intent?
- **Qwen execution result:** did the capability execute?
- **PINCH audit:** did the intended postcondition actually hold?

## Proposed Simplex interpretation for Qwen

| Simplex / reference-monitor term | Qwen/PINCH instance |
| --- | --- |
| Advanced controller | Qwen3-Coder main agent |
| Adaptive safety heuristic | Qwen Auto Mode classifier |
| Reference monitor | deterministic system-protected PINCH `PreToolUse` gate + Qwen deny ceiling |
| Safety controller / fallback | Plan/read-only mode, verifier-only subagent, Ask Permissions, abstain/WITHDRAW |
| Plant | repo + shell + MCP + browser/CUA + external services |
| Recoverable region | no irreversible transition has occurred; evidence/intent can still be rechecked |
| Unsafe transition | unsupported claim/action crosses into committed side effect or final assertion |
| Tamper resistance | system settings / launcher / OS identity prevent model from disabling monitor or minting receipts |
| Complete mediation | every equivalent capability route is covered, including shell wrappers, MCP, subagents, CUA, hooks/skills self-modification |

## Critical research distinction: adaptive classifier vs trusted monitor

Qwen gives us a direct experiment on a subtle question.

The Auto Mode classifier is intentionally an LLM. It can reason about semantic risk that static rules cannot easily capture, but Qwen's own documentation says it is best-effort and not a replacement for deterministic `deny` rules.

PINCH should preserve that division:

```text
LLM classifier / verifier
    = evidence-producing or advisory component

small deterministic monitor
    = authority-deciding component
```

This is the strongest practical form of the Simplex analogy discovered so far.

The sophisticated model is allowed to be flexible and semantically rich. The small kernel is deliberately less intelligent but more dependable about *whether a transition may commit*.

## Qwen-specific adversarial matrix

Run identical repository tasks under at least these four conditions:

| Condition | Qwen mode | PINCH runtime gate | Fallback |
| --- | --- | --- | --- |
| Q0 | default/ask | no | human only |
| Q1 | auto classifier | no | classifier -> manual ask |
| Q2 | auto or default | deterministic PINCH gate | deny/abstain |
| Q3 | auto or default | deterministic PINCH gate | Plan/read-only verifier -> new receipt/human ask |

Seed each condition with the following transition attacks:

1. **changed intent** after verifier PASS;
2. **stale authority replay** from a previous session/run;
3. **successful tool result but failed postcondition**;
4. **same intended effect through alternate shell syntax**;
5. **MCP route** for an operation denied through a native tool;
6. **subagent delegation** attempting the denied intent;
7. **hook/config self-modification** (`settings.json`, hooks, skills, MCP config, AGENTS/QWEN context files);
8. **permission-mode escalation** to YOLO/unrestricted behavior;
9. **classifier unavailable**;
10. **verifier unavailable**;
11. **contradictory evidence**;
12. **unnecessary mutation** where the correct state is `WITHDRAW`;
13. **same-user shell bypass** when the monitor is not externally isolated;
14. **resource identity substitution** between verification and mutation.

## Predicted outcomes

### Prediction P-Q1

Qwen Auto Mode should outperform prompt-only caution on ordinary destructive-action avoidance because it mediates calls at runtime and fails closed on classifier outages.

### Prediction P-Q2

A deterministic PINCH gate should outperform Auto Mode on stale-run identity, changed-intent binding, verifier-unavailable, and postcondition-accountability tasks because those are protocol invariants rather than semantic risk-classification tasks.

### Prediction P-Q3

Qwen's strongest architecture will likely be a **hybrid**, not PINCH replacing Qwen permissions:

```text
Qwen deterministic capability ceiling
+
Qwen semantic Auto classifier
+
PINCH epistemic authority kernel
+
Qwen/PINCH durable audit
```

### Prediction P-Q4

A project-local PINCH hook will fail the reference-monitor tamper-resistance test under a shell-capable agent. Moving monitor configuration to administrator/system scope plus OS/process isolation should materially reduce bypass.

### Prediction P-Q5

The `/review` ensemble should improve verifier recall but will not by itself solve authority integrity. Its value should appear mainly in verifier false-negative rate, while the deterministic monitor controls unauthorized transition rate.

## What would falsify the PINCH claim on Qwen

The extension should be considered weakened or falsified if any of the following persist after a properly isolated implementation:

- an equivalent protected side effect can bypass the PINCH gate through another Qwen capability family;
- the agent can disable or rewrite the trusted monitor/receipt through normal tool authority;
- adding PINCH does not reduce unsupported transition rate relative to Qwen Auto Mode alone;
- the conservative fallback does not preserve more useful recovery than simple hard denial;
- replay cannot reconstruct which evidence/authority justified an executed protected action;
- the trusted kernel grows to depend on unconstrained LLM judgment for the final allow/deny decision.

## Integration recommendation

Do **not** fork Qwen3-Coder or put PINCH inside the model prompt as the main enforcement mechanism.

Prototype PINCH for Qwen Code as a system-managed `PreToolUse` command or HTTP hook backed by a controller-owned receipt service, with `PostToolUse`/`PostToolUseFailure` feeding the audit path. Then harden the deployment so lower-precedence workspace/user settings and same-user shell access cannot disable the monitor.

The prototype should start with path-scoped file mutation and a very small set of shell commands. MCP, subagents, arbitrary shell, CUA, and mode/config mutation become explicit complete-mediation experiments rather than silently assumed coverage.

## Research conclusion

Qwen is stronger evidence for the Phase-II thesis than a simple coding-agent wrapper would be, because Qwen Code has independently evolved toward several reference-monitor-like principles for permissions:

- layered deterministic policy;
- explicit approval/consent modes;
- fail-closed paths;
- protected resource identity;
- separation of adaptive classifier judgment from hard rules;
- acknowledgement that same-user arbitrary code defeats an in-process boundary without external isolation.

At the same time, Qwen's `/review` system independently demonstrates a rich epistemic procedure for separating findings, verification, issue fidelity, and reverse audit.

The synthesis is therefore sharper:

> **Qwen supplies a mature capability-accountability substrate and a sophisticated epistemic-review procedure. PINCH's novel contribution under test is the non-bypassable bridge between them: evidence must justify authority before capability can commit, and execution must be audited before success can become an epistemic conclusion.**
