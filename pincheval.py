"""PINCHEVAL: deterministic evaluation of correctness and generalization.

This evaluates supplied candidate outputs against explicit ground truth. It does
not train a model or establish that a model has learned a capability.
"""
import json
import sys
from pathlib import Path

from verifier import verify


def _normalize(value):
    return " ".join(value.strip().casefold().split())


def evaluate(records, bins=5):
    """Evaluate records with split, expected_answer, and candidate fields."""
    if not isinstance(records, list) or not records:
        raise ValueError("records must be a non-empty list")
    if not isinstance(bins, int) or isinstance(bins, bool) or bins < 1:
        raise ValueError("bins must be a positive integer")

    rows = []
    for index, record in enumerate(records):
        if not isinstance(record, dict):
            raise ValueError(f"record {index} must be an object")
        split = record.get("split")
        expected = record.get("expected_answer")
        candidate = record.get("candidate")
        if split not in ("seen", "heldout"):
            raise ValueError(f"record {index}: split must be 'seen' or 'heldout'")
        if not isinstance(expected, str) or not expected.strip():
            raise ValueError(f"record {index}: expected_answer must be non-empty")
        if not isinstance(candidate, dict):
            raise ValueError(f"record {index}: candidate must be an object")

        actual = candidate.get("answer")
        correct = isinstance(actual, str) and _normalize(actual) == _normalize(expected)
        confidence = candidate.get("confidence")
        confidence_valid = (
            isinstance(confidence, (int, float))
            and not isinstance(confidence, bool)
            and 0.0 <= confidence <= 1.0
        )
        structural = verify(candidate)
        evidence = candidate.get("evidence")
        evidence_covered = (
            isinstance(evidence, list)
            and sum(isinstance(item, str) and bool(item.strip()) for item in evidence) >= 2
        )
        rows.append({
            "task_id": str(record.get("task_id", index)),
            "split": split,
            "correct": correct,
            "accepted": structural["status"] == "PASS",
            "confidence": float(confidence) if confidence_valid else None,
            "evidence_covered": evidence_covered,
            "structural_status": structural["status"],
        })

    total = len(rows)
    correct_count = sum(row["correct"] for row in rows)
    accepted = [row for row in rows if row["accepted"]]
    accepted_wrong = sum(not row["correct"] for row in accepted)
    calibrated = [row for row in rows if row["confidence"] is not None]
    brier = (
        sum((row["confidence"] - float(row["correct"])) ** 2 for row in calibrated)
        / len(calibrated)
        if calibrated else None
    )

    ece = 0.0
    if calibrated:
        for bin_index in range(bins):
            lower = bin_index / bins
            upper = (bin_index + 1) / bins
            members = [
                row for row in calibrated
                if lower <= row["confidence"] < upper
                or (bin_index == bins - 1 and row["confidence"] == 1.0)
            ]
            if members:
                confidence_mean = sum(row["confidence"] for row in members) / len(members)
                accuracy_mean = sum(row["correct"] for row in members) / len(members)
                ece += len(members) / len(calibrated) * abs(confidence_mean - accuracy_mean)

    def split_accuracy(name):
        subset = [row for row in rows if row["split"] == name]
        return sum(row["correct"] for row in subset) / len(subset) if subset else None

    seen_accuracy = split_accuracy("seen")
    heldout_accuracy = split_accuracy("heldout")
    gap = (
        seen_accuracy - heldout_accuracy
        if seen_accuracy is not None and heldout_accuracy is not None else None
    )

    return {
        "schema_version": 1,
        "sample_count": total,
        "accuracy": correct_count / total,
        "seen_accuracy": seen_accuracy,
        "heldout_accuracy": heldout_accuracy,
        "generalization_gap_seen_minus_heldout": gap,
        "structural_acceptance_rate": len(accepted) / total,
        "false_accept_rate_among_accepted": (
            accepted_wrong / len(accepted) if accepted else None
        ),
        "evidence_coverage_rate": sum(row["evidence_covered"] for row in rows) / total,
        "brier_score": brier,
        "expected_calibration_error": ece if calibrated else None,
        "calibration_sample_count": len(calibrated),
        "results": rows,
        "interpretation_limits": [
            "Ground-truth exact-match evaluation; semantic equivalence is not assessed.",
            "Structural acceptance checks candidate shape/evidence count, not evidence truth.",
            "Generalization is only estimated by the supplied seen/heldout split.",
            "A static fixture does not establish model training or learned capability.",
        ],
    }


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) != 1:
        print("Usage: python pincheval.py <records.json>", file=sys.stderr)
        return 2
    try:
        records = json.loads(Path(argv[0]).read_text(encoding="utf-8"))
        print(json.dumps(evaluate(records), indent=2))
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
