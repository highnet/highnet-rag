# evals

Offline evaluation of the highnet-rag pipeline. It runs the real pipeline stages in-process, over the golden sets, and publishes `results/latest.json`, which the site's `/evals` page renders. The site never shows a number that is not in that file.

## Golden sets (`golden/*.jsonl`)

| Set          | Rows              | How relevance is known                                                                                                                                                   |
| ------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `squad_auto` | 150 (105 + 45)    | Picked from the SQuAD 2.0 dev set: 3 answerable questions per article and 45 unanswerable ones, in a fixed hash order. Each gold answer is a character span in its article. |
| `owner`      | written by owner  | Each answerable row quotes its evidence verbatim from the article; the quote's position is the span. Rows whose quote is not found are left out of retrieval metrics.     |
| `compound`   | 10                | Questions that join two articles. They are scored by whether the passages sent to the model come from every article the question needs.                                |

`squad_auto.jsonl` is generated: `uv run highnet-rag-evals build-golden`. An `owner.jsonl` row looks like this:

```json
{"id": "owner-01", "article": "Normans", "question": "Who were the Normans descended from?", "answerable": true, "answer": "Norse raiders", "evidence": "descended from Norse (\"Norman\" comes from \"Norseman\") raiders"}
```

For an unanswerable row, set `"answerable": false` and leave `answer` and `evidence` empty.

## Metrics

- **Retrieval** (every answerable question × mode × chunk size × reranker): each question is ranked once to depth 10. recall@k is the share of questions with a relevant chunk in the top k; MRR is the mean of 1 / rank of the first relevant chunk. A chunk is relevant when it contains a whole gold span.
- **Answers** (the default configuration, end to end): the judge (`CLAUDE_MODEL_JUDGE`) sees the question, the passages sent, the answer split into sentences and the expected answer. It marks each sentence supported or not and the answer correct or not. Faithfulness is the mean share of supported sentences. Answers that abstain ("I can't find this in the retrieved passages.") are not graded; abstention is reported on its own, split by answerable and unanswerable questions.
- **Compound**: the same questions through the classic pipeline and through agentic mode.
- **Cost**: every call is priced by `pricing.py` and recorded in the run's own ledger; the total is published with the results. Eval runs are paid by the owner and never count against the visitor budget.

## Running

```bash
uv run highnet-rag-evals run --fake            # offline providers; illustrative numbers, no cost
uv run highnet-rag-evals run                   # real models: needs ANTHROPIC_API_KEY and VOYAGE_API_KEY
uv run highnet-rag-evals schema                # regenerate the results JSON Schema for web/
```

A run writes `results/latest.json`, a dated copy and a dated `*.details.jsonl` with every question's answer and grade, and prints its cost. The real run normally goes through the **Evals** GitHub workflow (run by hand): it downloads the live corpus from Fly, runs a one-question smoke test, runs the full set and pushes the results to a new `evals/run-<id>` branch.

Run the tests with `uv run pytest evals`.
