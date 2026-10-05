# DATASET_RECOVERY.md

**Purpose:** define exactly what dataset the historical checkpoint
`python model/IC_MODEL.keras` was trained on, what state the local copy is in,
and what must be supplied before any retraining or re-evaluation is legitimate.

This document is **descriptive only**. It does not download anything, does not
repair files, and does not alter the model.

---

## 1. Dataset identity

| Property | Required value | Source |
|---|---|---|
| Dataset | **Flickr8k** | `README.md` L21, `py_model.ipynb` |
| Images | **8,091** JPEG files | `README.md` ("8,000 images"), confirmed by `features.pkl` key count |
| Captions per image | **5** | `README.md` L21 |
| Total caption rows | **40,455** | 8,091 x 5 |
| Image ID format | `<digits>_<hex>`, extension stripped | `py_model.ipynb`: `tokens[0].split('.')[0]` |
| Caption file format | CSV, header `image,caption`, one row per caption | `py_model.ipynb` |
| Image directory expected by notebook | `kaggle/Images` | `py_model.ipynb` |
| Caption file expected by notebook | `kaggle/captions.txt` | `py_model.ipynb` |

`Flickr30k` / `30kmodel` is a **separate, incompatible** experiment
(InceptionV3/GoogLeNet, 2048-d, 299x299) and must not be mixed with this model.

---

## 2. Exact training-time contract

Reproducing `IC_MODEL.keras` requires all of the following to match.

### 2.1 Image features

```
VGG16()                                     # keras.applications
Model(inputs=vgg.inputs, outputs=vgg.layers[-2].output)   # = fc2, 4096-d
target_size = (224, 224)
preprocess_input()                          # keras.applications.vgg16
feature[i] = model.predict(...)             # shape (1, 4096), dtype float32
key        = filename without extension     # e.g. "1001773457_577c3a7d70"
storage    = pickle dict {key: ndarray(1,4096) float32}
```

**Critical fidelity detail (verified).** The notebook resizes with
`keras.preprocessing.image.load_img(..., target_size=(224,224))`, whose default
interpolation is **`nearest`**. Reproducing a stored feature with PIL
`.resize((224,224))` (default bicubic) yields a **different** vector:

| resize path | cosine vs stored | max abs diff |
|---|---|---|
| `load_img` default (`nearest`) | **0.99999988** | 6.7e-06 |
| `load_img` `bilinear` | 0.94775796 | 2.49e+00 |
| `load_img` `bicubic` | 0.95736653 | 2.37e+00 |
| `load_img` `lanczos` | 0.95824808 | 2.52e+00 |

Consequence: **precomputed `features.pkl` is authoritative.** Do not recompute
features from images for training or evaluation. (`app.py` currently uses the
PIL/bicubic path, so live web predictions are computed from features ~4% less
aligned with training than they should be. This is a real bug, flagged here,
deliberately **not** fixed in this step.)

### 2.2 Caption cleaning

The notebook's `clean()` is:

```python
cap = cap.lower()
cap = cap.replace('[^A-Za-z]', '')   # literal substring replace -> NO-OP
cap = cap.replace('\s+', ' ')        # '\s' is not a valid escape -> NO-OP
return 'startseq ' + ' '.join(w for w in cap.split() if len(w) > 1) + ' endseq'
```

Verified behaviours that must be preserved:

- **Punctuation is NOT stripped.** `[^A-Za-z]` is a literal string, not a regex.
  Input `"a dog shakes its head near the shore red ball next to it ."` keeps its
  quotes and its space-before-period.
- **Whitespace is collapsed only by `split()` + `join()`**, not by the second
  `replace`.
- **Single-character tokens are dropped** (`len(w) > 1`), so `"a dog"` becomes
  `" dog"` and the quote attaches to the next token.

### 2.3 Tokenizer

```
Tokenizer()                                # keras.preprocessing.text
fit on every cleaned caption in the corpus
word_index  size = 8,484
vocab_size  = len(word_index) + 1 = 8,485  # equals model output dimension
```

Keras assigns indices **count-descending**, with ties broken by **first
occurrence** in corpus order (stable sort over `word_counts`). Therefore the
index mapping is a function of the *exact corpus bytes*. A re-downloaded
`captions.txt` that differs by a single caption can shift indices and silently
break the checkpoint.

### 2.4 Sequence and split

```
split      = int(len(image_ids) * 0.90)      # 8091 -> 7281 train / 810 test
train      = image_ids[:split]
test       = image_ids[split:]
```

- Split is **sequential over dict insertion order**: no seed, no shuffle,
  no separate validation set. Reproducing historical test membership requires
  the same corpus *and* the same insertion order.
- `steps_per_epoch = len(train) // batch_size` = `7281 // 32` = **227**, which
  matches the `227/227` progress output stored in the notebook.
- `epochs = 50`, `batch_size = 32`.

---

## 3. Local state (measured, read-only)

### 3.1 Images — `8kdataset/Images/`

| Metric | Value |
|---|---|
| `.jpg` files present | 8,091 |
| Readable (non-zero, decodable) | **389** (4.81%) |
| Zero-byte | **7,702** (95.19%) |
| Corrupt non-zero | 0 |

`kaggle/Images` (the path the notebook actually uses) does not exist.
No Git LFS pointers — the zero-byte files are genuinely empty, not stubs.

### 3.2 Captions — `8kdataset/captions.txt`

| Metric | Value |
|---|---|
| Size | 1,310,720 bytes |
| Physical lines | 15,950 |
| Header | `image,caption` (present) |
| Complete rows | 15,948 |
| Truncated trailing row | 1 (`2869009633`, no caption) |
| Unique IDs from complete rows | **3,190** |
| Unique IDs with notebook's `<2` guard (includes degenerate key) | **3,191** |
| Duplicate `(id, caption)` pairs | 4 (0.025%) — authentic Flickr8k rows |
| IDs without exactly 5 captions | 1 (`2869009633`, truncated mid-file) |

`8kdataset/captions.txt` and `python model/captions.txt` are byte-identical.
The file is **tracked in Git** and truncated at commit time; it is not a local
edit and cannot be restored from history.

Referential integrity:

| Metric | Value |
|---|---|
| Caption IDs whose image is zero-byte | 2,801 |
| Caption IDs with no image file at all | 0 |
| Image files with no caption row | 4,901 |
| Readable images that have captions | 389 (100% of readable) |

### 3.3 Reconstructed split consequence

```
mapping keys : 3,191     (3,190 real + 1 degenerate from truncated row)
train        : 2,871
test         :   320
   -> 319 point to zero-byte images
   ->  1 has no file
   -> 0 usable held-out images
```

All 389 readable images fall in `train`. **No honest held-out evaluation is
possible from the current data.**

### 3.4 Tokenizer consequence

```
vocab_size from current captions : 5,465   (word_index = 5,464)
vocab_size required by IC_MODEL  : 8,485
short by                         : 3,020
max_length from current captions : 35
max_length used by IC_MODEL      : 35
```

`max_length` still matches, so it is **not** evidence of truncation. `vocab_size`
is the sole hard incompatibility.

### 3.5 Parser fidelity caveat (verified)

The corpus writes ` , ` as a word separator inside captions, e.g.
`... in front of his face ,   while standing ...`. Two parsers disagree:

| parser | tokens kept for that caption | resulting `max_length` |
|---|---|---|
| notebook `line.split(',')` + `" ".join(tokens[1:])` | keeps `"A` as a 2-char token | **35** |
| `csv.reader` + `.strip()` | `A` and `,` are 1-char, dropped by `len(w) > 1` | 34 |

The notebook's naive split deletes the separator commas (turning them into
spaces), so quoted captions retain one extra surviving token. Any reproduction
of the training-time tokenizer **must** use the notebook's parsing; a
"more correct" CSV parse silently produces a different `max_length` and a
different word count. `validate_dataset.py` therefore implements the
notebook-exact form deliberately.

Because index assignment is count-ordered, the shortfall does not merely remove
rare words — it **renumbers the frequent ones**. Observed on
`124881487_36e668145d.jpg`: historical tokenizer yields
`woman rides bike down rocky path`, the current one yields
`leans is for child glasses`. Low indices agree; high indices (e.g. 598) diverge.
This is the primary cause of the poor live BLEU, and is **not** evidence that
the weights are bad.

---

## 4. Recovery assets

### 4.1 AVAILABLE: complete precomputed features — `python model/features.zip`

| Metric | Value |
|---|---|
| Archive entry | `features.pkl`, 133,064,982 bytes uncompressed |
| Entries | **8,091** |
| Key set vs image files | **exact 1:1 match** (0 orphans either direction) |
| Value shape / dtype | `(1, 4096)` / `float32` |
| Degenerate (all-zero) rows | 0 (sampled 500) |

**This is the single most important recoverable asset in the repository.**
The CNN input side of the dataset is *fully intact* even though 95% of the
image bytes are gone.

> **Implication:** the missing images are **not** required to retrain the
> decoder. `features.pkl` + a complete `captions.txt` is sufficient, because
> VGG16 is frozen and never fine-tuned. Image recovery is needed only for
> qualitative visual inspection and for future live inference on *new* uploads.

### 4.2 MISSING and NOT locally recoverable

- **Complete `captions.txt` (40,455 rows).** This is the binding blocker.
  Present copy holds 15,948 rows (~39%). Recovering it requires an external
  copy of the original corpus.
- **7,702 zero-byte image files.** Not required for training (see 4.1);
  recoverable only from an external source.

### 4.3 Accepted external source characteristics

A replacement corpus is acceptable only if it yields
`word_index` size **8,484** -> `vocab_size` **8,485**, `max_length` **35**,
and ideally the same 8,091 IDs so the split boundary and `features.pkl` keys
line up. Confirm with `validate_dataset.py`; do not assume.

---

## 5. Acceptance gates (blocking)

Any dataset offered as recovered must satisfy all of the following. Failing any
one means STOP — do not retrain, do not re-evaluate, do not substitute.

| # | Gate | Required |
|---|---|---|
| G1 | Image count | 8,091 |
| G2 | Readable images | 8,091 (zero-byte = 0) |
| G3 | Corrupt non-zero images | 0 |
| G4 | Caption rows | 40,455 |
| G5 | Unique IDs | 8,091 |
| G6 | Duplicate `(id, caption)` pair rate | <= 1% of rows |
| G6b | IDs without exactly 5 captions | 0 |
| G7 | Captions referencing missing images | 0 |
| G8 | Images lacking captions | 0 |
| G9 | `vocab_size` from rebuilt tokenizer | **8,485** (critical) |
| G10 | `max_length` from training captions | 35 |
| G11 | `features.pkl` coverage | 8,091 keys, each `(1,4096)` float32 |
| G12 | Held-out images that are readable | > 0 |

G9 is the critical gate: it is the only one that directly tests whether the
rebuilt tokenizer is compatible with the frozen checkpoint.

**On G6.** Do not require *zero* duplicates. Authentic Flickr8k contains a small
number of exactly repeated caption rows — this corpus has 4 such rows in 15,948
(0.025%), affecting IDs `2305437797_e6c3460190`, `2335619125_2e2034f2c3`,
`2441629086_52f68eb316`, `2737729252_b3fd9c05b1`. These are present in the
committed blob, so they are original data rather than a truncation artifact,
and a gate demanding zero duplicates would reject the legitimate dataset. A rate
tolerance is used instead.

---

## 6. Explicitly out of scope

- Retraining, fine-tuning, or replacing `IC_MODEL.keras` or `CL_FD_MODEL_V2.keras`.
- Auto-downloading any dataset or archive.
- Editing `py_model.ipynb` output cells or `documentation/`.
- Silently "fixing" `app.py`'s resize interpolation before a model decision.
- Reporting BLEU on training images as if it were held-out performance.

---

## 7. Verification tooling

```
.venv\Scripts\python.exe -B python model\validate_dataset.py
.venv\Scripts\python.exe -B python model\validate_dataset.py --dataset-root 8kdataset_full
```

Strictly read-only. Exit code `0` only if every blocking gate passes;
non-zero otherwise, so it can gate the next automated step.