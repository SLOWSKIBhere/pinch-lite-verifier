import unittest
from unittest.mock import patch

from artifactlens.cli import main
from artifactlens.pipeline import PipelineError, process_video


class CliTests(unittest.TestCase):
    def test_pipeline_error_returns_nonzero_without_claiming_success(self):
        with patch("artifactlens.cli.process_video", side_effect=PipelineError("failed")):
            self.assertEqual(2, main(["video.mp4", "--out", "runs/test"]))

    def test_nonpositive_interval_is_rejected_before_file_access(self):
        with self.assertRaises(ValueError):
            process_video("does-not-exist.mp4", "out", interval_seconds=0)


if __name__ == "__main__":
    unittest.main()
