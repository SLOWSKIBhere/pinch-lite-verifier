import hashlib
import tempfile
import unittest
from pathlib import Path

from artifactlens.pipeline import sha256_bytes, sha256_file


class PipelineHelperTests(unittest.TestCase):
    def test_sha256_bytes_matches_standard_library(self):
        payload = b"artifactlens-test"
        self.assertEqual(hashlib.sha256(payload).hexdigest(), sha256_bytes(payload))

    def test_sha256_file_is_stable(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sample.bin"
            path.write_bytes(b"same bytes")
            expected = hashlib.sha256(b"same bytes").hexdigest()
            self.assertEqual(expected, sha256_file(path))
            self.assertEqual(expected, sha256_file(path))

    def test_sha256_file_changes_when_content_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sample.bin"
            path.write_bytes(b"first")
            first = sha256_file(path)
            path.write_bytes(b"second")
            self.assertNotEqual(first, sha256_file(path))


if __name__ == "__main__":
    unittest.main()
