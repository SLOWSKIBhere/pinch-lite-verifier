import tempfile
import unittest
from pathlib import Path
from artifactlens.transcript import TranscriptError, parse_transcript

class TranscriptTests(unittest.TestCase):
    def test_srt_preserves_timestamps_and_text(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sample.srt"
            path.write_text("1\n00:00:01,200 --> 00:00:02,500\nThe mechanism is ancient.\n\n2\n00:00:03,000 --> 00:00:04,000\nSecond cue.\n", encoding="utf-8")
            events = parse_transcript(path)
        self.assertEqual(2, len(events))
        self.assertEqual(1.2, events[0]["timestamp_start"])
        self.assertEqual(2.5, events[0]["timestamp_end"])
        self.assertEqual("The mechanism is ancient.", events[0]["text"])
        self.assertIn("transcript_sha256", events[0]["provenance"])

    def test_plain_text_has_no_invented_timestamps(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "transcript.txt"
            path.write_text("First line.\n\nSecond line.", encoding="utf-8")
            events = parse_transcript(path)
        self.assertEqual(2, len(events))
        self.assertIsNone(events[0]["timestamp_start"])
        self.assertEqual("not_provided", events[0]["provenance"]["timing"])

    def test_end_before_start_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "bad.srt"
            path.write_text("1\n00:00:04,000 --> 00:00:02,000\nBad cue\n", encoding="utf-8")
            with self.assertRaises(TranscriptError):
                parse_transcript(path)

    def test_missing_file_is_rejected(self):
        with self.assertRaises(TranscriptError):
            parse_transcript("does-not-exist.srt")

if __name__ == "__main__":
    unittest.main()
