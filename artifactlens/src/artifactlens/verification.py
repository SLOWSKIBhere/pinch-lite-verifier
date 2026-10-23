"""Deterministic evidence-integrity gate; never infers semantic truth."""
from __future__ import annotations
from collections import Counter
from typing import Any, Iterable

def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]

def build_event_index(events: Iterable[dict[str, Any]]) -> tuple[set[str], list[str]]:
    ids: list[str] = []
    errors: list[str] = []
    for index, event in enumerate(events):
        if not isinstance(event, dict):
            errors.append(f"Event {index} is not an object")
            continue
        event_id = event.get("event_id")
        if not isinstance(event_id, str) or not event_id.strip():
            errors.append(f"Event {index} has no non-empty event_id")
            continue
        ids.append(event_id)
    duplicates = sorted(key for key, count in Counter(ids).items() if count > 1)
    errors.extend(f"Duplicate event_id: {key}" for key in duplicates)
    return set(ids), errors

def review_gate(claims: Iterable[dict[str, Any]], events: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """Check provenance prerequisites before a separate human/source review."""
    event_rows = list(events)
    event_ids, event_errors = build_event_index(event_rows)
    decisions: list[dict[str, Any]] = []
    for index, claim in enumerate(claims):
        claim_id = claim.get("claim_id") if isinstance(claim, dict) else None
        decision: dict[str, Any] = {
            "schema_version": "1.0",
            "claim_id": claim_id if isinstance(claim_id, str) else f"claim_row_{index}",
            "status": None,
            "reasons": [],
            "evidence_event_ids": [],
            "external_source_ids": [],
            "semantic_truth_assessed": False,
        }
        if event_errors:
            decision["status"] = "BLOCK_INVALID_EVENT_LEDGER"
            decision["reasons"] = list(event_errors)
            decisions.append(decision)
            continue
        if not isinstance(claim, dict) or not isinstance(claim.get("text"), str) or not claim["text"].strip():
            decision["status"] = "BLOCK_INVALID_CLAIM"
            decision["reasons"] = ["Claim must be an object with non-empty text"]
            decisions.append(decision)
            continue
        evidence_ids = _string_list(claim.get("evidence_event_ids"))
        source_ids = _string_list(claim.get("external_source_ids"))
        decision["evidence_event_ids"] = evidence_ids
        decision["external_source_ids"] = source_ids
        if not evidence_ids:
            decision["status"] = "BLOCK_MISSING_EVIDENCE"
            decision["reasons"] = ["At least one event reference is required"]
        elif any(event_id not in event_ids for event_id in evidence_ids):
            missing = sorted(set(evidence_ids) - event_ids)
            decision["status"] = "BLOCK_INVALID_EVIDENCE_REFERENCE"
            decision["reasons"] = [f"Unknown event references: {', '.join(missing)}"]
        elif not source_ids:
            decision["status"] = "BLOCK_MISSING_EXTERNAL_SOURCES"
            decision["reasons"] = ["At least one independently reviewable source reference is required"]
        else:
            decision["status"] = "READY_FOR_HUMAN_REVIEW"
            decision["reasons"] = [
                "References are structurally present; semantic support and source quality remain unverified"
            ]
        decisions.append(decision)
    return decisions
