import unittest
from artifactlens.evaluation import EvaluationError, evaluate_claims

class EvaluationTests(unittest.TestCase):
    def test_escape_rate_and_acceptance_rate(self):
        result = evaluate_claims([
            {"gold_label": "supported", "predicted_label": "supported"},
            {"gold_label": "contradicted", "predicted_label": "supported"},
            {"gold_label": "insufficient_evidence", "predicted_label": "human_review"},
            {"gold_label": "supported", "predicted_label": "human_review"},
        ])
        self.assertEqual(0.25, result["exact_label_accuracy"])
        self.assertEqual(0.5, result["unsupported_claim_escape_rate"])
        self.assertEqual(0.5, result["supported_claim_acceptance_rate"])
        self.assertEqual(0.5, result["human_review_rate"])

    def test_empty_dataset_is_rejected(self):
        with self.assertRaises(EvaluationError):
            evaluate_claims([])

    def test_invalid_gold_label_is_rejected(self):
        with self.assertRaises(EvaluationError):
            evaluate_claims([{"gold_label": "guess", "predicted_label": "supported"}])

    def test_non_string_label_is_rejected_without_type_error(self):
        with self.assertRaises(EvaluationError):
            evaluate_claims([{"gold_label": ["supported"], "predicted_label": "supported"}])

if __name__ == "__main__":
    unittest.main()
