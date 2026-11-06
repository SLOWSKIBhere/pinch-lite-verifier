import unittest

from pincheval import evaluate


def row(task_id, split, expected, answer, confidence=0.8, evidence=None):
    return {
        "task_id": task_id,
        "split": split,
        "expected_answer": expected,
        "candidate": {
            "answer": answer,
            "confidence": confidence,
            "evidence": evidence if evidence is not None else ["source A", "source B"],
        },
    }


class PinchEvalTests(unittest.TestCase):
    def test_perfect_fixture_has_zero_gap_and_zero_brier(self):
        records = [
            row("s1", "seen", "4", "4", 1.0),
            row("h1", "heldout", "8", "8", 1.0),
        ]
        result = evaluate(records)
        self.assertEqual(1.0, result["accuracy"])
        self.assertEqual(0.0, result["generalization_gap_seen_minus_heldout"])
        self.assertEqual(0.0, result["brier_score"])
        self.assertEqual(0.0, result["false_accept_rate_among_accepted"])

    def test_detects_seen_heldout_gap(self):
        records = [
            row("s1", "seen", "4", "4"),
            row("s2", "seen", "5", "5"),
            row("h1", "heldout", "8", "0"),
            row("h2", "heldout", "9", "0"),
        ]
        result = evaluate(records)
        self.assertEqual(1.0, result["seen_accuracy"])
        self.assertEqual(0.0, result["heldout_accuracy"])
        self.assertEqual(1.0, result["generalization_gap_seen_minus_heldout"])

    def test_structural_pass_can_still_be_wrong(self):
        result = evaluate([row("h1", "heldout", "correct", "plausible but wrong")])
        self.assertEqual(1.0, result["structural_acceptance_rate"])
        self.assertEqual(1.0, result["false_accept_rate_among_accepted"])
        self.assertEqual(0.0, result["accuracy"])

    def test_evidence_coverage_is_separate_from_truth(self):
        records = [row("s1", "seen", "x", "x", evidence=["one"])]
        result = evaluate(records)
        self.assertEqual(0.0, result["evidence_coverage_rate"])
        self.assertEqual(0.0, result["structural_acceptance_rate"])

    def test_normalizes_case_and_whitespace(self):
        result = evaluate([row("s1", "seen", "New York", " new   YORK ")])
        self.assertEqual(1.0, result["accuracy"])

    def test_rejects_invalid_records(self):
        with self.assertRaises(ValueError):
            evaluate([])
        with self.assertRaises(ValueError):
            evaluate([{"split": "train"}])


if __name__ == "__main__":
    unittest.main()
