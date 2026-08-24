# PINCH TraceNLI

TraceNLI is a browser-based provenance-preserving semantic evidence verification
lab. It accepts candidate prose, maps atomic claims, deterministically validates
candidate evidence against original source text, runs two independently-input
semantic decision procedures, applies deterministic consensus, evaluates action
permission separately, audits bounded action postconditions, and hashes a receipt.

## Run

```bash
npm run dev
```

## Check

```bash
npm run check
npm run experiment
```

## Epistemic scope

- The included semantic verifiers are deterministic lexical proxies. They execute
  real decision code but are not external LLM calls and do not establish truth.
- Model scores are raw decision signals with
  `NOT_EMPIRICALLY_CALIBRATED` status, not truth probabilities.
- The browser action adapter is in-memory, intent-digest-bound, and allowlisted.
  No live GitHub write connector or authority is configured.
- GitHub source support operates on supplied frozen snapshots; it does not fetch
  the public network from the browser.
- Passing tests demonstrate the programmed boundaries only. They do not prove
  production safety, factual correctness, or real-world accuracy gains.
