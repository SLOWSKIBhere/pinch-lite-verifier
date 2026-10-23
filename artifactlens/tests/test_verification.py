import unittest
from artifactlens.verification import review_gate

class ReviewGateTests(unittest.TestCase):
    def setUp(self):
        self.events = [{"event_id": "evt_1"}, {"event_id": "trn_1"}]

    def test_valid_references_only_reach_human_review(self):
        result = review_gate([{
            "claim_id": "c1", "text": "The artifact was used for astronomy.",
            "evidence_event_ids": ["evt_1", "trn_1"], "external_source_ids": ["source_1"],
        }], self.events)[0]
        self.assertEqual("READY_FOR_HUMAN_REVIEW", result["status"])
        self.assertFalse(result["semantic_truth_assessed"])

    def test_missing_evidence_is_blocked(self):
        result = review_gate([{
            "claim_id": "c2", "text": "A claim", "evidence_event_ids": [],
            "external_source_ids": ["source_1"],
        }], self.events)[0]
        self.assertEqual("BLOCK_MISSING_EVIDENCE", result["status"])

    def test_unknown_event_reference_is_blocked(self):
        result = review_gate([{
            "claim_id": "c3", "text": "A claim", "evidence_event_ids": ["missing"],
            "external_source_ids": ["source_1"],
        }], self.events)[0]
        self.assertEqual("BLOCK_INVALID_EVIDENCE_REFERENCE", result["status"])

    def test_missing_external_sources_is_blocked(self):
        result = review_gate([{
            "claim_id": "c4", "text": "A claim", "evidence_event_ids": ["evt_1"],
            "external_source_ids": [],
        }], self.events)[0]
        self.assertEqual("BLOCK_MISSING_EXTERNAL_SOURCES", result["status"])

    def test_duplicate_event_ids_block_claims(self):
        result = review_gate([{
            "claim_id": "c5", "text": "A claim", "evidence_event_ids": ["evt_1"],
            "external_source_ids": ["source_1"],
        }], self.events + [{"event_id": "evt_1"}])[0]
        self.assertEqual("BLOCK_INVALID_EVENT_LEDGER", result["status"])

if __name__ == "__main__":
    unittest.main()
