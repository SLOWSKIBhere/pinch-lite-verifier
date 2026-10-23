"""Local research CLI for transcript ingestion, review gating, and evaluation."""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path
from typing import Any, Iterable

from artifactlens.evaluation import EvaluationError, evaluate_claims
from artifactlens.transcript import TranscriptError, parse_transcript
from artifactlens.verification import review_gate

def _read_jsonl(path: str | Path) -> list[dict[str, Any]]:
    source = Path(path).expanduser().resolve()
    if not source.is_file():
        raise ValueError(f"Input file does not exist: {source}")
    rows: list[dict[str, Any]] = []
    for line_number, line in enumerate(source.read_text(encoding="utf-8-sig").splitlines(), 1):
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"{source.name}:{line_number}: invalid JSON: {exc}") from exc
        if not isinstance(value, dict):
            raise ValueError(f"{source.name}:{line_number}: each JSONL row must be an object")
        rows.append(value)
    return rows

def _write_jsonl(path: str | Path, rows: Iterable[dict[str, Any]]) -> None:
    destination = Path(path).expanduser().resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="artifactlens-research")
    commands = parser.add_subparsers(dest="command", required=True)
    transcript = commands.add_parser("parse-transcript", help="Parse local SRT/VTT/plain transcript")
    transcript.add_argument("input")
    transcript.add_argument("--out", required=True)
    gate = commands.add_parser("review-gate", help="Validate claim evidence references")
    gate.add_argument("--events", required=True)
    gate.add_argument("--claims", required=True)
    gate.add_argument("--out", required=True)
    evaluate = commands.add_parser("evaluate", help="Evaluate predictions against reviewed labels")
    evaluate.add_argument("--dataset", required=True)
    evaluate.add_argument("--out", required=True)
    return parser

def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "parse-transcript":
            events = parse_transcript(args.input)
            _write_jsonl(args.out, events)
            print(json.dumps({
                "status": "PARSED", "event_count": len(events),
                "output": str(Path(args.out).expanduser().resolve()),
                "warning": "Transcript observations do not establish factual truth.",
            }, indent=2))
            return 0
        if args.command == "review-gate":
            decisions = review_gate(_read_jsonl(args.claims), _read_jsonl(args.events))
            _write_jsonl(args.out, decisions)
            counts: dict[str, int] = {}
            for decision in decisions:
                status = decision["status"]
                counts[status] = counts.get(status, 0) + 1
            print(json.dumps({
                "status": "GATE_COMPLETED", "claims_checked": len(decisions),
                "decision_counts": counts, "output": str(Path(args.out).expanduser().resolve()),
                "warning": "READY_FOR_HUMAN_REVIEW is not a verified truth judgment.",
            }, indent=2))
            return 0
        if args.command == "evaluate":
            metrics = evaluate_claims(_read_jsonl(args.dataset))
            output = Path(args.out).expanduser().resolve()
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
            print(json.dumps({"status": "EVALUATED", "items_evaluated": metrics["items_evaluated"], "output": str(output)}, indent=2))
            return 0
    except (OSError, ValueError, TranscriptError, EvaluationError) as exc:
        print(f"ArtifactLens research error: {exc}", file=sys.stderr)
        return 2
    return 2

if __name__ == "__main__":
    raise SystemExit(main())
