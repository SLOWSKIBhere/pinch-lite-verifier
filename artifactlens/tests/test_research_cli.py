import json
import tempfile
import unittest
from pathlib import Path

from artifactlens.research_cli import main


class ResearchCliTests(unittest.TestCase):
    def test_parse_transcript_command_writes_jsonl(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "clip.srt"
            output = root / "events.jsonl"
            source.write_text("1\n00:00:01,000 --> 00:00:02,000\nA spoken line.\n", encoding="utf-8")
            self.assertEqual(0, main(["parse-transcript", str(source), "--out", str(output)]))
            event = json.loads(output.read_text(encoding="utf-8").splitlines()[0])
            self.assertEqual("transcript_observation", event["event_type"])
            self.assertEqual(1.0, event["timestamp_start"])

    def test_review_gate_command_writes_decision(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            events = root / "events.jsonl"
            claims = root / "claims.jsonl"
            output = root / "decisions.jsonl"
            events.write_text('{"event_id":"trn_000000"}\n', encoding="utf-8")
            claims.write_text(
                '{"claim_id":"c1","text":"A claim","evidence_event_ids":["trn_000000"],"external_source_ids":["src1"]}\n',
                encoding="utf-8",
            )
            self.assertEqual(0, main([
                "review-gate", "--events", str(events), "--claims", str(claims), "--out", str(output)
            ]))
            decision = json.loads(output.read_text(encoding="utf-8").splitlines()[0])
            self.assertEqual("READY_FOR_HUMAN_REVIEW", decision["status"])
            self.assertFalse(decision["semantic_truth_assessed"])

    def test_evaluate_command_writes_metrics(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            dataset = root / "eval.jsonl"
            output = root / "metrics.json"
            dataset.write_text(
                '{"gold_label":"contradicted","predicted_label":"supported"}\n'
                '{"gold_label":"insufficient_evidence","predicted_label":"human_review"}\n'
                '{"gold_label":"supported","predicted_label":"supported"}\n',
                encoding="utf-8",
            )
            self.assertEqual(0, main(["evaluate", "--dataset", str(dataset), "--out", str(output)]))
            metrics = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(0.5, metrics["unsupported_claim_escape_rate"])
            self.assertAlmostEqual(2 / 3, metrics["exact_label_accuracy"])


if __name__ == "__main__":
    unittest.main()
