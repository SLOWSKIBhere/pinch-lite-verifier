import unittest

from verifier import format_result, verify


class VerifierTests(unittest.TestCase):
    def test_valid_candidate_passes(self):
        result = verify({
            "answer": "Paris is the capital of France.",
            "confidence": 0.8,
            "evidence": ["A reference atlas", "A geography textbook"],
        })
        self.assertEqual("PASS", result["status"])
        self.assertEqual(100, result["score"])
        self.assertEqual([], result["errors"])

    def test_empty_answer_costs_thirty(self):
        result = verify({"answer": "  ", "confidence": 0.5, "evidence": ["a", "b"]})
        self.assertEqual("FAIL", result["status"])
        self.assertEqual(70, result["score"])

    def test_missing_confidence_costs_twenty(self):
        result = verify({"answer": "answer", "evidence": ["a", "b"]})
        self.assertEqual(80, result["score"])
        self.assertIn("Confidence must be between 0.0 and 1.0", result["errors"])

    def test_out_of_range_confidence_is_invalid(self):
        result = verify({"answer": "answer", "confidence": 1.1, "evidence": ["a", "b"]})
        self.assertEqual(80, result["score"])

    def test_missing_evidence_applies_list_and_item_penalties(self):
        result = verify({"answer": "answer", "confidence": 0.5})
        self.assertEqual(60, result["score"])
        self.assertEqual(2, result["errors"].count("Missing required evidence item"))

    def test_empty_evidence_item_is_penalized(self):
        result = verify({"answer": "answer", "confidence": 0.8, "evidence": ["source", ""]})
        self.assertEqual(80, result["score"])
        self.assertIn("Evidence item must be non-empty", result["errors"])

    def test_unsupported_high_confidence_is_penalized(self):
        result = verify({"answer": "answer", "confidence": 0.81, "evidence": ["source"]})
        self.assertEqual(70, result["score"])
        self.assertIn(
            "High confidence is unsupported by sufficient evidence", result["errors"]
        )

    def test_score_never_falls_below_zero(self):
        result = verify({"answer": "", "confidence": 2, "evidence": [None, "", 3]})
        self.assertEqual(0, result["score"])

    def test_readable_pass_output(self):
        output = format_result({"status": "PASS", "score": 100, "errors": []})
        self.assertEqual("STATUS: PASS\nSCORE: 100\nERRORS: None", output)


if __name__ == "__main__":
    unittest.main()
