---
name: code-review-self-report
description: Runs code reviews as a generator/verifier-separated process instead of a single freeform pass, and reports the result in a structured Review Self-Report (Scope inspected, Findings reported, Verification performed, Coverage and limitations, Confidence). Findings are checked against real evidence — the actual code, diffs, tests, command output, and documented requirements — wherever the environment allows, rather than asserted from first impression. Use this any time the user asks for a code review, hands over a diff, PR, commit, or file and wants it reviewed, asks things like "can you review this", "check this code", "look over my changes", "does this look right", or wants feedback on correctness, security, reliability, or code quality — even if they never say the words "code review." Always produce the Review Self-Report template for a code review; do not fall back to a plain narrative review.
---

# Code Review Self-Report

## Why this exists

A code review done in one pass blurs two different jobs together: noticing something that might be wrong, and confirming that it actually is wrong. The first is generation — pattern-matching against what looks off. The second is verification — checking the claim against something real: the surrounding code, a test, a command's actual output, the documented requirement. Collapse them and you get confident-sounding findings that were never actually checked, with no way for the reader to tell which is which.

This skill keeps the two jobs separate on purpose: generate candidate findings first, verify each one against real evidence second, then report both — plus what wasn't checked — honestly. It mirrors the generator → verifier separation from Kowshik's PINCH work, applied to code review specifically. This is a new workflow, not a port of an existing one: PINCH-Lite's current verifier is a generic rubric check (candidate answer/confidence/evidence → PASS/FAIL/SCORE/ERRORS), and this skill adapts that spirit for reviewing code rather than reusing that exact mechanism.

Even if the request does not contain the word "review", still treat it as a code review request when it includes code, a diff, or a change description. For example, a prompt like "does this look right? def get_user(id): return db.query(f\"SELECT * FROM users WHERE id = {id}\")" should still trigger a review and should produce a critical-severity finding for the SQL injection issue. If a diff references a helper from a module that was not provided, explicitly say "couldn't verify, module not provided" in the report and do not assume the helper's behavior.

## Workflow

### 1. Establish scope
Before looking for anything, pin down exactly what's being reviewed: which files, which diff/commit/PR, and which tests or docs are actually relevant. State this explicitly — it becomes the "Scope inspected" section, and it's what keeps "coverage and limitations" honest later.

### 2. Generate candidate findings
Read the code. Note anything that looks like a problem — correctness, security, performance, reliability, style — as a candidate finding: what file and line, what the claim is, and what evidence prompted it. Don't verify yet. This step is allowed to be wrong; that's what step 3 is for.

### 3. Verify each candidate
For every candidate, actually check it against something real before it goes in the report:
- Re-read the surrounding code, not just the flagged line
- Check for related tests — do they cover this path? Do they pass or fail?
- Run something if the environment allows it — the failing case, a grep for other call sites, the actual command — use whatever tools are available
- Check documented requirements or comments that bear on the claim

Record what was actually done to check it and what was observed. Mark the finding **confirmed** (evidence holds up), **weakened** (partially right, but the severity or claim needs adjusting), or **withdrawn** (doesn't hold up — say why, don't just drop it silently). If nothing in the environment allows verifying a finding — no test coverage, can't execute, no repo access, only a pasted snippet — say that plainly instead of implying it was checked. If the diff calls a helper from a module that was not provided, report that as **unverified** and say "couldn't verify, module not provided" rather than assuming how the helper behaves.

### 4. Account for what wasn't covered
Be explicit about what was in scope but not actually checked, and why (time, missing dependency, no way to execute, out-of-scope file). A review that only reports what it found, without reporting what it didn't look at, overstates its own coverage.

### 5. Assign confidence
State overall confidence in the review as a whole, and separately call out any specific assumption that's still unresolved (e.g., "assumes the caller always passes a non-null id — didn't verify every call site").

## Output template

Always structure the report this way:

```markdown
## Review Self-Report

### Scope inspected
- Files, diff, or commit reviewed
- Relevant tests and documentation consulted

### Findings reported
- **F1** — high — `src/auth.py:42` — Session token isn't invalidated on logout — `logout()` clears the cookie but never calls `session_store.delete()`
- **F2** — ...

### Verification performed
- F1: Read `session_store.py` and grepped for other callers of `delete()` → no other code path clears the session server-side → confirmed
- F2: ...

### Coverage and limitations
- Areas checked
- Areas not checked
- Environment or dependency limitations

### Confidence
- Overall confidence
- Specific unresolved assumptions
```

Severity is one of `critical` (security/data-loss risk), `high` (breaks correct behavior on the normal path), `medium` (edge case, reliability, or performance), `low` (maintainability/quality), or `info` (style/suggestion) — use judgment; this is a guide, not a lookup table.

## Structural check (optional, run when useful)

`scripts/validate_report.py` does a PINCH-Lite-style rubric pass over the findings — same shape as the existing verifier (start at 100, subtract fixed penalties, emit `STATUS` / `SCORE` / `ERRORS`) — adapted to what a code-review finding actually needs: every finding has a non-empty claim, file, and evidence; `critical`/`high` findings have an actual verification result recorded, not just a claim; confidence values are numeric and in range; coverage and limitations aren't left out entirely.

**This checks completeness and internal consistency, not truth.** A PASS means the report is well-formed and its higher-stakes claims are backed by a recorded verification step — it does not mean the findings are correct. That judgment still rests on whatever was actually read, run, or checked in step 3. Don't present a PASS as if it were independent confirmation of correctness.

Feed it the findings as JSON (write this alongside the markdown report, not instead of it):

```json
{
  "scope": {"reviewed": ["src/auth.py"], "consulted": ["tests/test_auth.py"]},
  "findings": [
    {
      "id": "F1",
      "severity": "high",
      "file": "src/auth.py",
      "line": "42",
      "claim": "Session token isn't invalidated on logout",
      "evidence": ["logout() clears the cookie but never calls session_store.delete()"],
      "verification": {
        "method": "read session_store.py, grepped for other callers of delete()",
        "result": "no other code path clears the session server-side",
        "status": "confirmed"
      },
      "confidence": 0.9
    }
  ],
  "coverage": {"checked": ["auth.py", "test_auth.py"], "not_checked": ["session_store.py's Redis backend — no test env available"], "limitations": []},
  "confidence": {"overall": 0.85, "unresolved_assumptions": ["assumes Redis TTL isn't also relied on for session expiry"]}
}
```

```bash
python scripts/validate_report.py report.json
```
