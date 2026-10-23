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
            media_hash = "b" * 64
            self.assertEqual(0, main([
                "parse-transcript", str(source), "--out", str(output), "--media-sha256", media_hash
            ]))
            event = json.loads(output.read_text(encoding="utf-8").splitlines()[0])
            self.assertEqual("transcript_observation", event["event_type"])
            self.assertEqual(1.0, event["timestamp_start"])
            self.assertEqual(media_hash, event["media_sha256"])

    def test_combine_events_rejects_duplicate_ids(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            first, second, output = root / "a.jsonl", root / "b.jsonl", root / "all.jsonl"
            first.write_text('{"event_id":"evt_1"}\n', encoding="utf-8")
            second.write_text('{"event_id":"evt_1"}\n', encoding="utf-8")
            self.assertEqual(2, main([
                "combine-events", "--inputs", str(first), str(second), "--out", str(output)
            ]))
            self.assertFalse(output.exists())

    def test_combine_events_merges_distinct_ids(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            first, second, output = root / "a.jsonl", root / "b.jsonl", root / "all.jsonl"
            first.write_text('{"event_id":"evt_1"}\n', encoding="utf-8")
            second.write_text('{"event_id":"trn_1"}\n', encoding="utf-8")
            self.assertEqual(0, main([
                "combine-events", "--inputs", str(first), str(second), "--out", str(output)
            ]))
            self.assertEqual(2, len(output.read_text(encoding="utf-8").splitlines()))

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
