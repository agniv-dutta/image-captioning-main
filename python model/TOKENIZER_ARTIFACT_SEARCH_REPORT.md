# TOKENIZER ARTIFACT SEARCH REPORT

**Prompt 4 — READ-ONLY search for any recoverable original tokenizer.**
**8,163 files scanned** across repo root, `python model/`, `8kdataset/`,
`30kmodel/`, `documentation/`, `presentations/`, `frontend/` (excluding
`.git`, `node_modules`, `.venv`, `__pycache__`, build output).
**Nothing was modified, moved, renamed or deleted.**

---

## 1. File inventory

Every file whose name could plausibly hold vocabulary, caption, model or
serialized-preprocessing data:

| Path | Size | Type |
|---|---:|---|
| `30kmodel/30k_model.ipynb` | 26,132,806 | notebook |
| `8kdataset/captions.txt` | 1,310,720 | `.txt` |
| `CL_FD_MODEL_V2.keras/config.json` | 8,799 | `.json` |
| `CL_FD_MODEL_V2.keras/metadata.json` | 63 | `.json` |
| `CL_FD_MODEL_V2.keras/model.weights.h5` | 71,951,368 | `.h5` |
| `documentation/learnings.txt` | 903 | `.txt` |
| `frontend/package-lock.json` | 777,283 | `.json` |
| `frontend/package.json` | 969 | `.json` |
| `frontend/public/manifest.json` | 492 | `.json` |
| `frontend/public/robots.txt` | 67 | `.txt` |
| `python model/BLEU_EVALUATION_REPORT.txt` | 9,251 | `.txt` |
| `python model/IC_MODEL.keras` | 71,960,560 | SERIALIZED |
| `python model/MODEL_BASELINE_INFO.txt` | 7,647 | `.txt` |
| `python model/caption_reader.py` | 1,492 | `.py` |
| `python model/captions.txt` | 1,310,720 | `.txt` |
| `python model/features.zip` | 47,097,435 | SERIALIZED |
| `python model/py_model.ipynb` | 365,496 | notebook |
| `python model/requirements.txt` | 202 | `.txt` |

## 2. Content probe for a serialized `word_index` / `index_word`

Searched every text-readable file under 60 MB for `"word_index"`,
`'word_index'`, `"index_word"`, `'index_word'`, `word_index =`,
`index_word =`, `original_tokenizer`.

| File | matched |
|---|---|
| `python model/py_model.ipynb` | `vocab_size` only — the *code*, never a value |
| `python model/preprocessing.py` | `vocab_size` only — the code |
| `python model/caption_reader.py` | none |
| `python model/evaluate_bleu.py` | `vocab_size` — this project's own tooling |
| `python model/validate_dataset.py` | `vocab_size` — this project's own tooling |
| `python model/MODEL_BASELINE_INFO.txt` | `vocab_size` — this project's own report |
| `python model/BLEU_EVALUATION_REPORT.txt` | `vocab_size` — this project's own report |
| `30kmodel/30k_model.ipynb` | `vocab_size` — unrelated 30k experiment |

Every `vocab_size` occurrence is either training *code* or a value this audit
itself wrote. **No file contains a materialized word->index mapping.**

## 3. Notebook cell outputs — do any stored outputs contain vocabulary?

### `python model/py_model.ipynb` (26 cells, 10 with outputs)

| cell | output | contains vocabulary? |
|---|---|---|
| 1 | `<bound method Model.summary ...>` | no |
| 2 | the commented feature-extraction block echoed back | no |
| 10 | `40455` | no |
| 12 | `8485` | no |
| 13 | `35` | no |
| 16 | pydot warning | no |
| 17 | 50 loss lines, `5.7976 -> 1.7049` | no |
| 20 | `BLEU-1: 0.513414` / `BLEU-2: 0.290109` | no |
| 22 | 5 reference captions + 1 predicted caption | **captions only, no indices** |
| 25 | `<error NameError: name 'model' is not defined>` | no |

Only **scalar** values were committed. Cell 22 stores caption *text*, which is
already available from the corpus, and no token indices.

### `30kmodel/30k_model.ipynb` (25 cells, 26 MB)

This notebook does store much richer output, including cells with 158,915 lines
and cells containing `startseq ... endseq` strings plus a mapping dictionary
printout (cells 5, 7, 17). However it is the **Flickr30k / InceptionV3**
experiment: 2048-d features, 299x299 input, a different architecture and a
different vocabulary. Its indices are **incompatible** with `IC_MODEL.keras`'s
4096-d input and 8,485 classes. It cannot serve as a vocabulary source for this
checkpoint, and treating it as one would be exactly the "duplicate production
model confusion" the plan warns against.

## 4. Archive members — could a vocabulary hide inside a zip?

```
python model/IC_MODEL.keras  (71,960,560 bytes)
    metadata.json                    63
    config.json                   8,799
    model.weights.h5           71,951,368

python model/features.zip  (47,097,435 bytes)
    features.pkl              133,064,982
```

Neither contains a tokenizer.

## 5. `features.pkl` payload — could it carry a vocabulary?

```
type            : dict
entries         : 8,091
sample key      : '1000268201_693b08cb0e'
sample value    : ndarray shape (1, 4096) dtype float32
all keys are strings (image ids) : True
```

**Image id -> VGG16 feature vector, and nothing else.** No text, no vocabulary,
no captions. It cannot recover a tokenizer.

(Worth recording separately: this asset is *complete* for all 8,091 images, so
the CNN input side of the dataset is fully intact even though 7,702 image files
are zero-byte. See `DATASET_RECOVERY.md`.)

## 6. Caption sources found

| Path | Size | SHA256 |
|---|---:|---|
| `8kdataset/captions.txt` | 1,310,720 | `05a7f6f5284dd7376bdbac7285919312323d375de5bc3af8a97a4ffee9636ef5` |
| `python model/captions.txt` | 1,310,720 | `05a7f6f5284dd7376bdbac7285919312323d375de5bc3af8a97a4ffee9636ef5` |

**Byte-identical to each other** — one copy of the damaged corpus, not two
independent sources. `python model/captions.txt` is tracked in Git and is
truncated in the committed blob itself, so `git show HEAD` yields the same
15,950 truncated lines. No earlier, longer revision exists in history.

## 7. Per-candidate classification table

| Path | Type | Size | Vocab size | Likely training-time artifact | Can recover exact mapping | Confidence |
|---|---|---:|---|---|---|---|
| `python model/IC_MODEL.keras` | Keras v3 archive | 71,960,560 | none stored | YES (weights) | **NO** — no tokenizer in archive | certain |
| `CL_FD_MODEL_V2.keras/` | Keras v3 unpacked dir | 71,960,560 | none stored | YES — **bit-identical to IC_MODEL**, all 32 tensors, max abs diff `0.0` | **NO** — same omission | certain |
| `python model/features.zip` | zip -> `features.pkl` | 47,097,435 | none | YES (image features) | **NO** — numeric vectors only | certain |
| `python model/py_model.ipynb` | notebook | 365,496 | 8,485 referenced | YES (source of record) | **NO** — code and scalars only | certain |
| `python model/caption_reader.py` | source | 1,492 | computes at runtime | runtime helper | **NO** — refits from damaged corpus | certain |
| `python model/preprocessing.py` | source | — | computes at runtime | legacy variant (`<start>`/`<end>`) | **NO** — and wrong token variant | certain |
| `8kdataset/captions.txt` | text | 1,310,720 | 5,465 | NO — truncated | **NO** — 39% of rows missing | certain |
| `python model/captions.txt` | text | 1,310,720 | 5,465 | NO — byte-identical copy | **NO** | certain |
| `30kmodel/30k_model.ipynb` | notebook | 26,132,806 | 30k vocab | NO — different experiment | **NO** — incompatible architecture | certain |
| `documentation/learnings.txt` | text | 903 | — | NO | **NO** — prose | certain |
| `frontend/package*.json` | json | — | — | NO | **NO** | certain |

## 8. Root cause of the absence

Keras `.keras` archives serialize only `config.json`, `metadata.json` and
`model.weights.h5`. **The `Tokenizer` is never included.** In the original
notebook the vocabulary existed solely as variable `tokenizer` created in cell 11
and referenced in cell 12; cell 25 saved the model but never saved the tokenizer.

This is the whole defect: a checkpoint was persisted without its
class-to-word contract, and the corpus needed to rebuild that contract was
separately truncated.

---

## Classification

```
A. Exact original tokenizer recovered          -> NO
B. Full vocabulary recoverable from an artifact -> NO
C. No exact tokenizer artifact found           -> YES   <-- ANSWER
```

**The only route to the original `word_index` is to rebuild the tokenizer from
the complete 40,455-row `captions.txt` corpus.** That corpus is not present
locally and cannot be reconstructed from any artifact in this repository.

Per the plan's stop rule, **Prompts 6-20 are blocked.** Specifically:

- Prompt 6 cannot run (no corpus at `8kdataset_full/`).
- Prompt 7 must not run (it is explicitly gated on Prompt 6).
- Prompt 8 onward depends on a recovered tokenizer.

Reconstructing a tokenizer from the truncated corpus and calling it correct is
explicitly forbidden by the plan and by the evidence above: 0 of 80 words
occupying ranks 560-640 kept their index across disjoint halves of the
available corpus, so any such reconstruction would be wrong for the large
majority of classes while still *appearing* plausible on the 13 or so
high-frequency indices that survive.

---

**READ-ONLY. NOTHING MODIFIED. NOTHING MOVED. NOTHING DELETED. NOTHING RETRAINED.**