"""PINCH-Lite: verify structure, then compare against explicit ground truth."""

import json
import sys
import unicodedata
from pathlib import Path


ANSWER_MISMATCH = "Answer does not match ground truth"
INSUFFICIENT_SUPPORTED_EVIDENCE = (
    "Fewer than two distinct evidence items match ground truth"
)
UNSUPPORTED_EVIDENCE = "Candidate evidence includes unsupported item(s)"


def validate_structure(candidate):
    """Return the legacy structural status, score, and ordered error list."""
    if not isinstance(candidate, dict):
        candidate = {}

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


def verify(candidate):
    """Backward-compatible name for structural verification."""
    return validate_structure(candidate)


def _normalize_text(value):
    """Normalize harmless Unicode, case, and whitespace differences."""
    normalized = unicodedata.normalize("NFKC", value)
    return " ".join(normalized.casefold().split())


def _validated_ground_truth(ground_truth):
    """Return normalized truth sets or raise ValueError for a bad oracle."""
    if not isinstance(ground_truth, dict):
        raise ValueError("ground_truth must be an object")

    normalized_fields = {}
    for field in ("accepted_answers", "accepted_evidence"):
        values = ground_truth.get(field)
        if (
            not isinstance(values, list)
            or not values
            or any(not isinstance(value, str) or not value.strip() for value in values)
        ):
            raise ValueError(f"ground_truth.{field} must be a non-empty list of strings")
        normalized_fields[field] = {_normalize_text(value) for value in values}

    if len(normalized_fields["accepted_evidence"]) < 2:
        raise ValueError(
            "ground_truth.accepted_evidence must contain two distinct items"
        )
    return normalized_fields


def _accuracy_result(candidate, ground_truth):
    truth = _validated_ground_truth(ground_truth)
    answer = _normalize_text(candidate["answer"])
    evidence = [_normalize_text(item) for item in candidate["evidence"]]

    answer_matches = answer in truth["accepted_answers"]
    matched_evidence = set(evidence) & truth["accepted_evidence"]
    unsupported_evidence = [
        item for item in evidence if item not in truth["accepted_evidence"]
    ]

    answer_score = 50 if answer_matches else 0
    evidence_score = 25 * min(2, len(matched_evidence))
    precision_penalty = 10 if unsupported_evidence else 0
    score = max(0, answer_score + evidence_score - precision_penalty)

    errors = []
    if not answer_matches:
        errors.append(ANSWER_MISMATCH)
    if len(matched_evidence) < 2:
        errors.append(INSUFFICIENT_SUPPORTED_EVIDENCE)
    if unsupported_evidence:
        errors.append(UNSUPPORTED_EVIDENCE)

    return {
        "status": "PASS" if not errors else "FAIL",
        "score": score,
        "errors": errors,
    }


def validate_accuracy(candidate, ground_truth):
    """Score a structurally valid candidate against curated ground truth."""
    structure = validate_structure(candidate)
    if structure["status"] != "PASS":
        raise ValueError("accuracy validation requires a structurally valid candidate")
    return _accuracy_result(candidate, ground_truth)


def verify_case(case):
    """Run the structure gate followed by the explicit ground-truth gate."""
    if not isinstance(case, dict):
        raise ValueError("case must be an object")
    if not isinstance(case.get("id"), str) or not case["id"].strip():
        raise ValueError("case.id must be a non-empty string")
    if not isinstance(case.get("candidate"), dict):
        raise ValueError("case.candidate must be an object")

    # The oracle is dataset configuration, so validate it even when the
    # candidate will fail the structural gate.
    _validated_ground_truth(case.get("ground_truth"))

    candidate = case["candidate"]
    structure = validate_structure(candidate)
    if structure["status"] == "FAIL":
        return {
            "status": "FAIL",
            "score": structure["score"],
            "errors": structure["errors"],
            "failed_stage": "structure",
            "structure_score": structure["score"],
            "accuracy_score": None,
        }

    accuracy = _accuracy_result(candidate, case.get("ground_truth"))
    return {
        "status": accuracy["status"],
        "score": accuracy["score"],
        "errors": accuracy["errors"],
        "failed_stage": "none" if accuracy["status"] == "PASS" else "accuracy",
        "structure_score": structure["score"],
        "accuracy_score": accuracy["score"],
    }


def format_result(result):
    """Format a verification result for human-readable CLI output."""
    lines = [f"STATUS: {result['status']}", f"SCORE: {result['score']}"]
    if "failed_stage" in result:
        lines.append(f"FAILED_STAGE: {result['failed_stage']}")
    if result["errors"]:
        lines.append("ERRORS:")
        lines.extend(f"- {error}" for error in result["errors"])
    else:
        lines.append("ERRORS: None")
    return "\n".join(lines)


def _run_dataset(cases):
    matched = 0
    for index, case in enumerate(cases):
        actual = verify_case(case)
        expected = case.get("expected")
        regression_passed = actual == expected
        matched += int(regression_passed)

        description = case.get("description", "")
        suffix = f": {description}" if description else ""
        print(f"CASE {case['id']}{suffix}")
        print(format_result(actual))
        print(f"EXPECTED: {'MATCH' if regression_passed else 'MISMATCH'}")
        if index < len(cases) - 1:
            print()

    status = "PASS" if matched == len(cases) else "FAIL"
    print()
    print(f"DATASET: {status} ({matched}/{len(cases)} cases matched expectations)")
    return 0 if status == "PASS" else 1


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

    items = data if isinstance(data, list) else [data]
    if not items:
        print("Error: input list must not be empty", file=sys.stderr)
        return 2

    dataset_flags = [
        isinstance(item, dict) and "candidate" in item for item in items
    ]
    if any(dataset_flags) and not all(dataset_flags):
        print("Error: input cannot mix cases and plain candidates", file=sys.stderr)
        return 2

    if all(dataset_flags):
        try:
            return _run_dataset(items)
        except ValueError as exc:
            print(f"Error: {exc}", file=sys.stderr)
            return 2

    if not all(isinstance(candidate, dict) for candidate in items):
        print("Error: input must be an object or a list of objects", file=sys.stderr)
        return 2

    for index, candidate in enumerate(items):
        if len(items) > 1:
            print(f"EXAMPLE {index + 1}")
        print(format_result(verify(candidate)))
        if index < len(items) - 1:
            print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
