# 06 · Evals — Braintrust harness

The eval harness is the senior-engineer signal in 2026. Without it, your AI portfolio reads as toy. With it, it reads as production.

## Step 1 — Install + envs

```bash
pnpm add braintrust autoevals
```

Sign up at https://www.braintrust.dev (free tier ample for portfolio scale).

```dotenv
BRAINTRUST_API_KEY=...
```

## Step 2 — Project setup

In Braintrust dashboard, create a new project named after your repo. Note the project ID.

## Step 3 — Eval directory structure

```
evals/
├── datasets/              # gold sets (input → expected output pairs)
│   ├── classification.jsonl
│   └── retrieval.jsonl
├── scorers/               # per-rubric scoring functions
│   ├── tone-match.ts
│   ├── grounding.ts
│   └── contradiction-detect.ts
├── tasks/                 # the things you eval
│   ├── classifier.eval.ts
│   └── retrieval.eval.ts
└── package.json           # eval-only dependencies
```

## Step 4 — Sample dataset format

`evals/datasets/classification.jsonl`:

```jsonl
{"input": "We should consider switching to Postgres.", "expected": {"category": "opinion", "confidence": 0.6}}
{"input": "PostgreSQL outperforms MongoDB on our query patterns by 3x.", "expected": {"category": "factual", "confidence": 0.95}}
{"input": "MongoDB might one day replace Postgres entirely.", "expected": {"category": "speculation", "confidence": 0.4}}
```

## Step 5 — Sample eval

`evals/tasks/classifier.eval.ts`:

```typescript
import { Eval } from 'braintrust';
import { Factuality, Levenshtein } from 'autoevals';
import { classifyClaim } from '@/lib/ai/structured';
import dataset from '../datasets/classification.json';

Eval('classifier-v1', {
  data: () => dataset,
  task: async (input) => await classifyClaim(input),
  scores: [
    // factuality from autoevals
    Factuality,
    // custom: category match
    async ({ output, expected }) => ({
      name: 'category_match',
      score: output.category === expected.category ? 1 : 0,
    }),
    // custom: confidence within tolerance
    async ({ output, expected }) => ({
      name: 'confidence_within_0.2',
      score: Math.abs(output.confidence - expected.confidence) < 0.2 ? 1 : 0,
    }),
  ],
});
```

## Step 6 — Run eval locally

```bash
pnpm braintrust eval evals/tasks/classifier.eval.ts
```

Output:

```
classifier-v1
  category_match: 0.92
  confidence_within_0.2: 0.78
  Factuality: 0.85
  Average: 0.85
View at: https://www.braintrust.dev/...
```

## Step 7 — CI integration (eval-gated deploys)

`.github/workflows/eval.yml`:

```yaml
name: eval

on:
  pull_request:
    branches: [main]

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm braintrust eval evals/
        env:
          BRAINTRUST_API_KEY: ${{ secrets.BRAINTRUST_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      - name: regression check
        run: |
          # fail if score drops more than 0.05 below baseline
          pnpm tsx scripts/eval-gate.ts
```

`scripts/eval-gate.ts`:

```typescript
// Read latest eval from Braintrust API; compare to baseline.json
// If avg score dropped > 0.05, exit 1.
// Implementation: braintrust SDK call to fetch run, compare, exit code.
```

## Step 8 — Add scorers as you find failure modes

Senior pattern: every time the agent fails on a real user request, capture it as a new gold-set entry. Eval set grows over time; behavior compounds.

```typescript
// scripts/capture-failure.ts — invoked manually when a user reports a bad output
import { promises as fs } from 'node:fs';
const newEntry = { input: '...', expected: { ... } };
const path = 'evals/datasets/regressions.jsonl';
await fs.appendFile(path, JSON.stringify(newEntry) + '\n');
```

## Step 9 — LLM-judge scorer (when ground truth is subjective)

```typescript
import { LLMClassifier } from 'autoevals';

const ToneMatch = LLMClassifier({
  name: 'tone_match',
  promptTemplate: `Does the output match the tone of the brand voice?
Brand voice example: {{voice_example}}
Output: {{output}}
Choose A or B:
A. yes, matches voice
B. no, drifts from voice`,
  choiceScores: { A: 1, B: 0 },
  model: 'claude-haiku-4-5-20251001',
});
```

## Senior callouts

- **Why eval-gated deploys?** Catching regressions in CI is the difference between a portfolio piece that "works on my machine" and one that demonstrates production discipline. Senior reviewers explicitly look for this.
- **Why Braintrust over rolling-your-own?** The dashboard + run history + comparison views save real time; the SDK is unintrusive; free tier is generous.
- **Why grow gold-sets over time?** Each failure is data. Compounding eval coverage = compounding agent reliability.
- **Why LLM-judge for subjective scoring?** Sometimes "is this on-voice" has no ground-truth label; LLM-as-judge with a deterministic rubric (and a small calibration set) is the right tool.
