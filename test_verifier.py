import copy
import io
import json
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

from verifier import (
    format_result,
    main,
    validate_accuracy,
    verify,
    verify_case,
)


DATASET_PATH = Path(__file__).with_name("examples.json")
EXPECTED_RESULT_FIELDS = {
    "status",
    "score",
    "errors",
    "failed_stage",
    "structure_score",
    "accuracy_score",
}


class VerifierTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cases = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
        cls.cases_by_id = {case["id"]: case for case in cls.cases}

    def test_dataset_has_exactly_twenty_unique_cases(self):
        self.assertEqual(20, len(self.cases))
        self.assertEqual(20, len(self.cases_by_id))

    def test_every_case_has_an_explicit_complete_oracle(self):
        for case in self.cases:
            with self.subTest(case=case["id"]):
                self.assertIsInstance(case.get("description"), str)
                self.assertIsInstance(case.get("candidate"), dict)
                self.assertIsInstance(case.get("ground_truth"), dict)
                self.assertEqual(
                    EXPECTED_RESULT_FIELDS,
                    set(case.get("expected", {})),
                )

    def test_all_adversarial_cases_match_hand_reviewed_expectations(self):
        for case in self.cases:
            with self.subTest(case=case["id"]):
                self.assertEqual(case["expected"], verify_case(case))

    def test_factually_wrong_answer_passes_structure_but_fails_accuracy(self):
        case = self.cases_by_id["wrong_answer_good_evidence"]

        self.assertEqual("PASS", verify(case["candidate"])["status"])
        result = verify_case(case)
        self.assertEqual("FAIL", result["status"])
        self.assertEqual("accuracy", result["failed_stage"])
        self.assertEqual(50, result["score"])

    def test_expected_values_do_not_drive_computed_result(self):
        case = copy.deepcopy(self.cases_by_id["valid_baseline"])
        original_expected = copy.deepcopy(case["expected"])
        case["expected"] = {
            "status": "FAIL",
            "score": 0,
            "errors": ["fabricated oracle result"],
        }

        self.assertEqual(original_expected, verify_case(case))

    def test_malformed_ground_truth_is_a_dataset_error(self):
        case = copy.deepcopy(self.cases_by_id["valid_baseline"])
        case["ground_truth"]["accepted_evidence"] = ["same", "same"]

        with self.assertRaisesRegex(ValueError, "two distinct items"):
            verify_case(case)

    def test_accuracy_requires_a_structurally_valid_candidate(self):
        candidate = {"answer": "", "confidence": 0.5, "evidence": ["a", "b"]}
        ground_truth = {
            "accepted_answers": ["answer"],
            "accepted_evidence": ["a", "b"],
        }

        with self.assertRaisesRegex(ValueError, "structurally valid"):
            validate_accuracy(candidate, ground_truth)

    def test_legacy_verify_remains_structure_only(self):
        candidate = self.cases_by_id["wrong_answer_good_evidence"]["candidate"]
        self.assertEqual(
            {"status": "PASS", "score": 100, "errors": []},
            verify(candidate),
        )

    def test_readable_pass_output_is_backward_compatible(self):
        output = format_result({"status": "PASS", "score": 100, "errors": []})
        self.assertEqual("STATUS: PASS\nSCORE: 100\nERRORS: None", output)

    def test_cli_checks_all_twenty_expected_results(self):
        stdout = io.StringIO()
        stderr = io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            exit_code = main([str(DATASET_PATH)])

        self.assertEqual(0, exit_code)
        self.assertEqual("", stderr.getvalue())
        self.assertIn(
            "DATASET: PASS (20/20 cases matched expectations)",
            stdout.getvalue(),
        )


if __name__ == "__main__":
    unittest.main()
