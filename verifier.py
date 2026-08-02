"""PINCH-Lite: verify structured generated answers."""

import json
import sys
from pathlib import Path


def verify(candidate):
    """Return a status, score, and error list for a candidate dictionary."""
    errors = []
    score = 100

    answer = candidate.get("answer")
    if not isinstance(answer, str) or not answer.strip():
        errors.append("Missing or empty answer")
        score -= 30

    confidence = candidate.get("confidence")
    confidence_valid = (
        isinstance(confidence, (int, float))
        and not isinstance(confidence, bool)
        and 0.0 <= confidence <= 1.0
    )
    if not confidence_valid:
        errors.append("Confidence must be between 0.0 and 1.0")
        score -= 20

    evidence = candidate.get("evidence")
    if not isinstance(evidence, list):
        errors.append("Evidence must be a list")
        score -= 20
        non_empty_count = 0
        empty_count = 0
    else:
        non_empty_count = sum(
            isinstance(item, str) and bool(item.strip()) for item in evidence
        )
        empty_count = len(evidence) - non_empty_count
        for _ in range(empty_count):
            errors.append("Evidence item must be non-empty")
            score -= 10

    missing_count = max(0, 2 - non_empty_count)
    for _ in range(missing_count):
        errors.append("Missing required evidence item")
        score -= 10

    if confidence_valid and confidence > 0.80 and non_empty_count < 2:
        errors.append("High confidence is unsupported by sufficient evidence")
        score -= 20

    return {
        "status": "PASS" if not errors else "FAIL",
        "score": max(0, score),
        "errors": errors,
    }


def format_result(result):
    """Format a verification result for human-readable CLI output."""
    errors = "None" if not result["errors"] else "\n".join(
        f"- {error}" for error in result["errors"]
    )
    return (
        f"STATUS: {result['status']}\n"
        f"SCORE: {result['score']}\n"
        f"ERRORS: {errors}"
    )


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) != 1:
        print("Usage: python verifier.py <json-file>", file=sys.stderr)
        return 2

    try:
        data = json.loads(Path(argv[0]).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2

    candidates = data if isinstance(data, list) else [data]
    if not all(isinstance(candidate, dict) for candidate in candidates):
        print("Error: input must be an object or a list of objects", file=sys.stderr)
        return 2

    for index, candidate in enumerate(candidates):
        if len(candidates) > 1:
            print(f"EXAMPLE {index + 1}")
        print(format_result(verify(candidate)))
        if index < len(candidates) - 1:
            print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
