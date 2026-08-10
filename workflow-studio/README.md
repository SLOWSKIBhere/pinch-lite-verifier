# PINCH Workflow Studio

PINCH Workflow Studio is a browser-based React prototype for designing and
deterministically simulating verification-gated agent workflows.

The application separates generation, evidence checking, ground-truth checking,
consensus, permission, bounded execution, and post-execution auditing. It does
not call external models, tools, or networks. Every run is labeled and implemented
as a deterministic simulation.

## Run locally

Requirements:

- Node.js 24 or a compatible current Node.js release
- npm

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Validate

```bash
npm run build
npm test
```

Run only the controlled experiment:

```bash
npm run experiment
```

## Controlled experiment

The automated experiment holds the application version, state-machine logic,
interaction procedure, and execution environment constant while changing the
seeded workflow condition:

1. verified research control;
2. adversarial treatment;
3. unresolved creative workflow with human rejection.

The assertions check that the control reaches `EXECUTE`, the adversarial workflow
reaches `BLOCK` without running the executor, and the unresolved workflow pauses
for approval before rejection blocks execution.

See [docs/controlled-experiment.md](docs/controlled-experiment.md) for the design,
results, and interpretation limits.

## Important limitations

- This is a workflow-simulation prototype, not a live multi-agent runtime.
- Seeded evidence and ground-truth labels are fixtures, not independently
  researched facts.
- Passing tests establish the programmed state-machine behavior; they do not
  establish that PINCH improves real-world model accuracy.
- Automated interaction tests run in jsdom. A real-browser visual and responsive
  layout check remains separate.
