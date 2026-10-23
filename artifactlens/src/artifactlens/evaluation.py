"""Metrics for manually labeled claim-verification evaluation sets."""
from __future__ import annotations
from collections import Counter
from typing import Any, Iterable

GOLD_LABELS = {"supported", "contradicted", "mixed", "insufficient_evidence"}
PREDICTED_LABELS = GOLD_LABELS | {"human_review"}
UNSUPPORTED_GOLD = {"contradicted", "mixed", "insufficient_evidence"}

class EvaluationError(ValueError):
    """Raised when evaluation rows are malformed."""

def evaluate_claims(rows: Iterable[dict[str, Any]]) -> dict[str, Any]:
    """Compute conservative metrics from adjudicated gold labels and predictions."""
    records = list(rows)
    if not records:
        raise EvaluationError("Evaluation dataset is empty")
    confusion: Counter[str] = Counter()
    correct = unsupported_count = unsupported_escapes = 0
    supported_count = supported_accepted = abstentions = 0
    for index, row in enumerate(records):
        if not isinstance(row, dict):
            raise EvaluationError(f"Row {index} must be an object")
        gold, predicted = row.get("gold_label"), row.get("predicted_label")
        if gold not in GOLD_LABELS:
            raise EvaluationError(f"Row {index} has invalid gold_label: {gold!r}")
        if predicted not in PREDICTED_LABELS:
            raise EvaluationError(f"Row {index} has invalid predicted_label: {predicted!r}")
        confusion[f"{gold} -> {predicted}"] += 1
        correct += int(gold == predicted)
        abstentions += int(predicted == "human_review")
        if gold in UNSUPPORTED_GOLD:
            unsupported_count += 1
            unsupported_escapes += int(predicted == "supported")
        if gold == "supported":
            supported_count += 1
            supported_accepted += int(predicted == "supported")
    return {
        "schema_version": "1.0",
        "items_evaluated": len(records),
        "exact_label_accuracy": correct / len(records),
        "unsupported_claim_escape_rate": unsupported_escapes / unsupported_count if unsupported_count else None,
        "unsupported_claims": unsupported_count,
        "unsupported_claims_accepted_as_supported": unsupported_escapes,
        "supported_claim_acceptance_rate": supported_accepted / supported_count if supported_count else None,
        "supported_claims": supported_count,
        "human_review_rate": abstentions / len(records),
        "human_review_count": abstentions,
        "confusion_counts": dict(sorted(confusion.items())),
        "metric_notes": [
            "Metrics are only as valid as the supplied human-reviewed gold labels.",
            "Split by source video to reduce leakage from adjacent or near-duplicate frames.",
            "A zero escape rate alone does not establish overall system quality.",
        ],
    }
