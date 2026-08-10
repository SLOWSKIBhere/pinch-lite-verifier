#!/usr/bin/env python3
"""
Structural rubric check for a Code Review Self-Report, in the same style as
the PINCH-Lite generic verifier (start at 100, subtract fixed penalties,
emit STATUS / SCORE / ERRORS).

This checks completeness and internal consistency of the report -- NOT
whether the findings are actually correct. A PASS means the report is
well-formed and its higher-stakes claims have a recorded verification step;
it says nothing about whether that step's conclusion was right. Truth
still rests on whatever was actually read, run, or checked when the report
was written.

Usage:
    python scripts/validate_report.py <report.json>
"""

import json
import sys

ALLOWED_SEVERITY = {"critical", "high", "medium", "low", "info"}
ALLOWED_STATUS = {"confirmed", "weakened", "withdrawn"}
HIGH_STAKES_SEVERITY = {"critical", "high"}

PENALTIES = {
    "missing_scope_reviewed": 15,
    "missing_finding_field": 10,
    "invalid_severity": 10,
    "invalid_confidence": 10,
    "missing_high_stakes_verification": 15,
    "invalid_verification_status": 5,
    "missing_coverage_key": 10,
    "missing_overall_confidence": 10,
}


def check_report(report):
    """Returns (score, errors) for a parsed report dict."""
    errors = []
    score = 100

    def deduct(key, msg):
        nonlocal score
        score -= PENALTIES[key]
        errors.append(msg)

    scope = report.get("scope") or {}
    if not scope.get("reviewed"):
        deduct(
            "missing_scope_reviewed",
            "scope.reviewed is empty — report doesn't say what was reviewed",
        )

    findings = report.get("findings") or []
    for f in findings:
        fid = f.get("id", "<no id>")

        for field in ("claim", "file", "evidence"):
            if not f.get(field):
                deduct("missing_finding_field", f"{fid}: missing or empty '{field}'")

        severity = f.get("severity")
        if severity not in ALLOWED_SEVERITY:
            deduct(
                "invalid_severity",
                f"{fid}: severity '{severity}' not one of {sorted(ALLOWED_SEVERITY)}",
            )

        confidence = f.get("confidence")
        if not isinstance(confidence, (int, float)) or not (0 <= confidence <= 1):
            deduct(
                "invalid_confidence",
                f"{fid}: confidence '{confidence}' is not a number in [0, 1]",
            )

        verification = f.get("verification") or {}
        v_status = verification.get("status")
        v_result = verification.get("result")

        if severity in HIGH_STAKES_SEVERITY and (not v_status or not v_result):
            deduct(
                "missing_high_stakes_verification",
                f"{fid}: severity '{severity}' has no recorded verification result",
            )

        if v_status and v_status not in ALLOWED_STATUS:
            deduct(
                "invalid_verification_status",
                f"{fid}: verification.status '{v_status}' not one of {sorted(ALLOWED_STATUS)}",
            )

    coverage = report.get("coverage")
    if coverage is None or "not_checked" not in coverage:
        deduct(
            "missing_coverage_key",
            "coverage.not_checked is missing — should be present, even as an empty list",
        )
    if coverage is None or "limitations" not in coverage:
        deduct(
            "missing_coverage_key",
            "coverage.limitations is missing — should be present, even as an empty list",
        )

    overall_conf = (report.get("confidence") or {}).get("overall")
    if not isinstance(overall_conf, (int, float)) or not (0 <= overall_conf <= 1):
        deduct(
            "missing_overall_confidence",
            f"confidence.overall '{overall_conf}' is not a number in [0, 1]",
        )

    return max(score, 0), errors


def main():
    if len(sys.argv) != 2:
        print("Usage: python scripts/validate_report.py <report.json>")
        sys.exit(1)

    path = sys.argv[1]
    try:
        with open(path) as fh:
            report = json.load(fh)
    except FileNotFoundError:
        print(f"ERROR: file not found: {path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"ERROR: invalid JSON in {path}: {e}")
        sys.exit(1)

    score, errors = check_report(report)
    status = "PASS" if not errors else "FAIL"

    print(f"STATUS: {status}")
    print(f"SCORE: {score}")
    if not errors:
        print("ERRORS: None")
    else:
        print("ERRORS:")
        for e in errors:
            print(f"  - {e}")

    sys.exit(0 if status == "PASS" else 1)


if __name__ == "__main__":
    main()
