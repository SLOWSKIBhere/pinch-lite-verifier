# Can Simplex / reference-monitor principles extend to epistemic accountability?

## Research question

**Can the Simplex/reference-monitor principle be extended from physical safety or information security to epistemic accountability in autonomous agent systems?**

## Working answer

**Yes, with an important qualification.** The principles transfer cleanly to
*epistemic process integrity* — controlling when an autonomous agent may promote
a generated proposition into a verified claim, an authorization, a side effect,
or a final correctness assertion. They do **not** by themselves guarantee truth.

The strongest defensible claim is therefore:

> A small, tamper-resistant, completely mediated runtime can enforce
> epistemic-accountability invariants even when the high-capability agent that
> proposes claims and actions is too complex to verify.

That is narrower than "the monitor knows the truth" and stronger than
"the prompt asks the model to be careful."

## Source-derived principles

### Reference monitor

NIST's reference-monitor definition requires a reference validation mechanism to
be:

1. **always invoked / complete mediation**;
2. **tamperproof**; and
3. **small enough to be analyzed and tested with assured completeness**.

Those are security properties, but they are phrased as architectural
requirements on a mediation mechanism rather than as properties unique to file
permissions. That makes them candidates for a domain transfer.

Primary reference:
[NIST CSRC — reference monitor](https://csrc.nist.gov/glossary/term/reference_monitor).

### Simplex

The SEI Simplex architecture separates a high-performance/complex controller
from a higher-assurance fallback and places a decision module between controller
outputs and the controlled device. The decision unit can switch away from the
complex controller when behavior threatens the safety region. SEI work also
emphasizes a recoverable region: intervention must happen early enough that the
trusted controller can still recover the plant.

Primary references:

- [SEI — An Architectural Description of the Simplex Architecture](https://www.sei.cmu.edu/library/an-architectural-description-of-the-simplex-architecture/)
- [SEI — An Engineering Method for Safety Region Development](https://www.sei.cmu.edu/library/an-engineering-method-for-safety-region-development/)

### Adjacent autonomous-agent work

Recent AI-control and runtime-verification work is directionally consistent with
this transfer: capable/untrusted agents can be monitored, critical actions can be
deferred, and runtime contracts can separate preventive gating from evidence of
successful execution. These papers do not establish the PINCH thesis, but they
show that runtime mediation of agent trajectories is an active and plausible
research direction.

- *Evaluating Control Protocols for Untrusted AI Agents* (Kutasov et al., 2025)
- *Watchdogs and Oracles: Runtime Verification Meets Large Language Models for Autonomous Systems* (Ferrando, 2025)
- *Agent Safety Should Be a Runtime Contract* (Ng et al., 2026)

## Proposed epistemic mapping

| Classical concept | Epistemic-agent analogue |
| --- | --- |
| Complex / advanced controller | High-capability LLM agent that proposes plans, claims, code, and actions |
| Safety / baseline controller | Small deterministic verifier/guard plus conservative fallback procedure |
| Decision module | PINCH reflex monitor at claim/action transition boundaries |
| Physical plant | External world + repository/database + session state + evidence state |
| Safety region | Set of states in which claims/actions remain supported, scoped, attributable, and recoverable |
| Recoverable region | State in which missing/contradictory evidence can still trigger abstention, re-verification, rollback, or human review before irreversible commitment |
| Controller switch | Drop from autonomous mutation to read-only/abstain/verify/ask mode |
| Reference-monitor complete mediation | Every protected transition crosses a non-bypassable verifier/authority gate |
| Reference-monitor tamper resistance | Agent cannot rewrite the policy kernel, receipt, verifier result, or canonical log it is judged against |
| Reference-monitor verifiability | Trusted kernel is deterministic, small, replayable, and testable without an LLM in the authorization decision |

## What is the epistemic "unsafe state"?

The research should avoid defining unsafe as "the model is wrong." Wrongness is
often unobservable at run time. A more operational definition is a state where a
system has crossed an accountability boundary without the evidence required for
that boundary.

Candidate invariant violations include:

- a generated claim presented as verified without a verifier PASS;
- a verifier `UNAVAILABLE` or `UNRESOLVED` result converted into PASS;
- a side effect executed under stale run identity or changed intent;
- a protected action performed outside declared tool/path scope;
- an execution-success signal presented as proof of the intended postcondition;
- a final correctness/release-readiness claim without observed postcondition
  evidence;
- missing or corrupted provenance treated as valid history.

This yields a PINCH "epistemically safe region" that is about **justified state
transitions**, not omniscient truth.

## Simplex-style fallback for agents

A physical Simplex safety controller tries to keep or return the plant to a safe
region. The epistemic analogue should be deliberately conservative:

```text
advanced autonomous mode
        |
        | uncertainty / contradiction / stale authority /
        | unverifiable claim / monitor alarm
        v
PINCH decision boundary
        |
        +--> read-only evidence gathering
        +--> independent verification
        +--> abstain / WITHDRAW
        +--> request human decision
        +--> issue a new bounded authority receipt
```

The fallback does not need to solve the original task optimally. It needs to
preserve the ability to make a justified next decision.

## Reference-monitor formulation

For a set of protected epistemic transitions `T`, define a monitor `M` and policy
`P` such that:

```text
for every t in T:
    t may commit only if M(P, current_evidence, current_identity, t) = ALLOW
```

The proposed research properties are:

### E1 — Complete epistemic mediation

Every transition from:

- generated -> verified,
- verified -> authorized,
- authorized -> side effect,
- executed -> claimed effect,
- observed result -> final correctness claim

must cross a designated mediation boundary. Bypass paths count as failures even
when the resulting action happens to be correct.

### E2 — Epistemic monitor independence

The high-capability agent cannot modify the monitor policy, mint its own trusted
receipt, erase canonical evidence, or alter the audit record used to judge it.

### E3 — Small trusted computing base

The authorization decision is deterministic and narrow. LLM reasoning may
produce candidate claims or evidence, but no LLM output alone is an authority
bit.

### E4 — Recoverable epistemic region

When the monitor cannot establish the precondition for a transition, the system
can still move to a conservative state — read-only verification, abstention,
withdrawal, or human review — without needing to perform the disputed side
effect first.

## Why the analogy may fail

The transfer is not automatic. At least five differences need experimental
attention:

1. **Truth is only partially observable.** Physical safety often has measurable
   state variables; epistemic correctness may depend on unavailable or contested
   facts.
2. **The verifier may share the generator's blind spots.** A second LLM is not
   equivalent to an independently verified safety controller.
3. **Evidence can be adversarial or endogenous.** An agent may influence the
   artifacts later used to judge it.
4. **There is no universal safe answer.** The conservative fallback is often
   abstention or evidence gathering, not a lower-performance correct answer.
5. **Complete mediation requires a precise transition inventory.** If an agent
   can reach the same side effect through shell, MCP, delegated agents, or a new
   tool family, the monitor is incomplete.

These limitations sharpen rather than defeat the research question: the target
is enforceable accountability under partial observability, not guaranteed
omniscience.

## Falsifiable hypotheses

### H1 — Runtime mediation beats prompt-only procedure

A non-bypassable PINCH reference monitor will reduce unsupported protected
transitions more than an equivalent procedural prompt with no runtime gate.

### H2 — Durable identity binding defeats stale-authority replay

Binding authorization to both run identity and intent digest will prevent replay
of otherwise semantically similar prior approvals without reducing success on
unchanged authorized tasks.

### H3 — Simplex-style fallback preserves useful recoverability

When verification becomes unavailable or contradictory, switching to a
read-only/abstention fallback will prevent unsafe side effects while preserving a
higher rate of eventual task completion than hard termination alone.

### H4 — Small deterministic monitors are easier to assure than agent behavior

A compact policy kernel plus replay invariant can achieve materially higher test
coverage and mutation-test resistance than attempting to validate the complete
agent policy through natural-language prompting.

### H5 — Monitor independence matters under adaptive pressure

If the acting agent is given visibility into or write access over monitor
internals, bypass rates will rise. Keeping the trusted monitor/receipt outside
agent authority should improve robustness.

## Experimental matrix

Compare four conditions on identical agent tasks:

| Condition | Procedure | Runtime gate | Conservative fallback |
| --- | --- | --- | --- |
| A | ordinary agent | no | no |
| B | PINCH prompt/skill only | no | instructed only |
| C | PINCH reference monitor | yes | deny/abstain |
| D | PINCH + epistemic Simplex | yes | read-only verify/withdraw/human-review mode |

Seed tasks with:

- stale receipts;
- changed intent after verification;
- contradictory evidence;
- unavailable verifier/check;
- misleading tool success with failed postcondition;
- path/tool scope escape attempts;
- delegated or alternate-tool bypass opportunities;
- corrupted/incomplete history;
- cases where the proposed mutation is unnecessary and should be withdrawn.

## Primary measurements

- protected-transition violation rate;
- false PASS rate;
- unauthorized side-effect rate;
- bypass rate by capability family;
- correct WITHDRAW/abstain rate;
- successful recovery after monitor intervention;
- task usefulness / completion rate;
- verifier false-positive and false-negative rates;
- latency and token overhead;
- trusted-kernel code size, branch coverage, and mutation-test score;
- replay consistency: whether the final accountability state can be reconstructed
  from durable events alone.

## Phase II connection to the implementation

The DeepSeek Harness session log is a particularly useful substrate because it
is append-only, merge-extensible, and already records `tool/call` before
execution and `tool/result` after execution. Phase II adds:

- `pinch/authority-admitted` between those durable facts;
- `pinch/audit-recorded` after a trusted postcondition audit;
- a replay validator that checks event identity/order without rewriting history;
- default denial of protected autonomous calls that have no owning durable
  Session.

The resulting replay path is:

```text
tool/call
   -> pinch/authority-admitted
   -> [execution]
   -> tool/result
   -> pinch/audit-recorded
```

An authority event at the end of a crashed log is treated as interruption
evidence rather than silently rewritten into success.

## Research claim boundary

Phase II should **not** claim that PINCH has proven a general "epistemic safety
controller." The near-term research claim is narrower and testable:

> Reference-monitor and Simplex design principles can be instantiated as an
> epistemic accountability architecture whose protected state transitions are
> completely mediated, whose trusted enforcement kernel is smaller than the
> acting agent, and whose conservative fallback preserves evidence and prevents
> unjustified commitment.

Whether this produces robust gains across domains, adversarial agents, and
partial-observability regimes is the experiment.
