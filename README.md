# PINCH-Lite

PINCH-Lite is a small, standard-library-only Python tool that checks structured
generated answers before they are accepted.

## Flow

```text
Generator -> Candidate -> Verifier -> Accept/Reject
```

The generator produces a candidate JSON object containing an answer, confidence
from `0.0` through `1.0`, and a list of evidence. The verifier checks the fields,
calculates a score from 100, and reports `PASS` only when there are no errors.

## Input

```json
{
  "answer": "A generated answer",
  "confidence": 0.85,
  "evidence": ["Evidence 1", "Evidence 2"]
}
```

The CLI accepts either one candidate object or a list of candidate objects.

## Rules and scoring

- Missing or empty answer: reject and subtract 30.
- Missing, non-numeric, or out-of-range confidence: reject and subtract 20.
- Missing evidence or evidence that is not a list: reject and subtract 20.
- Fewer than two non-empty evidence items: subtract 10 for each missing item.
- Each empty or non-string evidence item: subtract 10.
- Confidence above `0.80` with fewer than two non-empty evidence items: subtract 20.
- Scores never fall below zero.

## Usage

```console
python verifier.py examples.json
```

Output is formatted as:

```text
STATUS: PASS or FAIL
SCORE: number
ERRORS: None or a list of errors
```

Run the tests with:

```console
python -m unittest test_verifier.py -v
```
