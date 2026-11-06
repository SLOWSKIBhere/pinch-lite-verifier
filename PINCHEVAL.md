# PINCHEVAL: first controlled benchmark slice

PINCHEVAL evaluates candidate answers against explicit ground truth and reports
seen/held-out accuracy, the seen-minus-held-out gap, calibration, evidence
coverage, and the rate of incorrect answers among structurally accepted outputs.

## Run

```console
python pincheval.py pincheval_demo.json
python -m unittest test_pincheval.py -v
```

## Important boundaries

- The included demo is a deterministic synthetic fixture, not a model-generated
  benchmark result.
- The existing PINCH verifier checks candidate structure and evidence quantity.
  It does not establish that cited evidence is true or relevant.
- Exact-match scoring does not assess semantic equivalence.
- A seen/held-out gap is meaningful only when the split is designed to test
  transfer rather than merely changing surface wording.
- This tool evaluates outputs; it does not train, fine-tune, or inspect neural
  network weights.

## Next research step

Replace synthetic candidates with frozen outputs from identified model versions.
Keep the ground-truth set separate from candidate generation, preregister the
split, record model/version/prompt/decoding metadata, and compare baseline,
additional-inference, and PINCH-verified conditions.
