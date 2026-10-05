# CAPTION_RECOVERY_REQUIREMENTS

**Prompt 5 — exact specification of the caption corpus required to reconstruct
the tokenizer used by `IC_MODEL.keras`.**

**Nothing was downloaded. The existing `captions.txt` was not modified. Nothing
was retrained.**

---

## 0. The vocabulary-size convention is confirmed, not assumed

Prompt 5 explicitly warns:

> Do not assume `len(word_index) + 1 == 8485` unless the original training code
> confirms that convention.

**Confirmed.** `python model/py_model.ipynb` cell 11 reads, verbatim:

```python
tokenizer = Tokenizer()
tokenizer.fit_on_texts(all_captions)
vocab_size = len(tokenizer.word_index) + 1
```

and cell 12's stored output is `8485`. The `+ 1` reserves index 0 for
padding/OOV (`Embedding(vocab_size, 256, mask_zero=True)`, `pad_sequences`
`value=0`).

Cross-checks that all agree:

| source | evidence |
|---|---|
| notebook cell 12 output | `vocab_size = 8485` |
| notebook cell 11 code | `vocab_size = len(word_index) + 1` |
| `IC_MODEL.keras` final Dense | `(None, 8485)` |
| `IC_MODEL.keras` Embedding | `input_dim = 8485` |
| `IC_MODEL.keras` `text` input | `(None, 35)` == stored `max_length` |

Therefore the required condition is exactly:

```
len(word_index) == 8484        (i.e. 8,484 distinct tokens)
vocab_size    == 8485
```

---

## 1. Exact caption source

```
kaggle/captions.txt            # notebook cell 5
```

Flickr8k. In this repository the working copies are `8kdataset/captions.txt` and
`python model/captions.txt`, which are **byte-identical** to each other and are
both truncated.

The original directory in `preprocessing.py` L20 was
`/home/saee-we/image-captioning/8kdataset`.

## 2. Expected number of image IDs

**8,091.** Evidence: `README.md` L21 says "8,000 images, each with five
captions"; notebook cell 10's stored output is `40455`, and `40455 / 5 = 8091`;
`features.pkl` contains exactly 8,091 keys forming a 1:1 match with the 8,091
`.jpg` filenames in `8kdataset/Images`.

## 3. Expected number of captions

**40,455** = 8,091 x 5. This is the stored output of notebook cell 10 and is the
single most useful acceptance check: `len(all_captions)` must equal it exactly.

## 4. Expected caption format

CSV-ish, comma-separated, **with a header row**:

```
image,caption
1000268201_693b08cb0e.jpg,A man in a blue shirt holding a baby .
...
```

- `next(f)` discards the header (cell 5).
- Line 1 must be exactly `image,caption`.
- Column 0: filename **with** the `.jpg` extension.
- Column 1: the caption text.
- Captions frequently contain ` , ` as a word separator and are frequently
  wrapped in double quotes. This is a known quirk of this Flickr8k distribution
  and must be preserved verbatim — see §6.
- Some rows contain internal commas, so **row structure is what matters, not
  naive comma counting**.

## 5. Expected vocabulary size

```
vocab_size == 8485
word_index  == 8,484 entries
```

## 6. Exact caption preprocessing (must be reproduced verbatim)

Notebook cells 6-7:

```python
mapping = {}
for line in captions_doc.split('\n'):
    tokens = line.split(',')
    if len(line) < 2:
        continue
    image_id, caption = tokens[0], tokens[1:]
    image_id = image_id.split('.')[0]
    caption = " ".join(caption)
    if image_id not in mapping:
        mapping[image_id] = []
    mapping[image_id].append(caption)

def clean(mapping):
    for key, captions in mapping.items():
        for i in range(len(captions)):
            caption = captions[i]
            caption = caption.lower()
            caption = caption.replace('[^A-Za-z]', '')
            caption = caption.replace('\s+', ' ')
            caption = 'startseq ' + " ".join([word for word in caption.split() if len(word) > 1]) + ' endseq'
            captions[i] = caption
```

Three non-obvious behaviours, all verified by execution:

1. **`replace('[^A-Za-z]', '')` is a no-op.** `'[^A-Za-z]'` is a literal string,
   not a regex. Punctuation is **never removed** and therefore appears in the
   vocabulary.
2. **`replace('\s+', ' ')` is a no-op.** `'\s'` is not a valid Python escape
   (it is backslash + `s`). Whitespace is collapsed only as a side effect of
   `split()` then `join()`.
3. **1-character tokens are dropped** by `len(word) > 1`.

### Parse fidelity: `split(',')` is required, `csv.reader` is wrong

Because ` , ` is used as a word separator and many captions are double-quoted,
the notebook's naive `line.split(',')` deletes separator commas, turning them
into spaces, and thereby preserves one extra surviving token per quoted caption
that begins with a short word (`"A` survives; `A` would not).

Measured on the longest caption (`2354456107_bf5c766a05.jpg`):

| parser | resulting `max_length` |
|---|---|
| notebook `line.split(',')` — **authoritative** | **35** |
| `csv.reader` + `.strip()` | 34 |

`csv.reader` is the *better* parser and the *wrong* one. Using it produces a
different vocabulary and a different `max_length`. Reproduction must use the
notebook's parse. `python model/validate_dataset.py` implements the
notebook-exact form deliberately for this reason.

### Known latent bug in the guard

`if len(line) < 2` tests the length of the *string*, not the token count. A
truncated final row such as `2869009633` is 10 characters long, so it is **not**
skipped; it yields key `'2869009633'` with an empty caption. That is why the
notebook-faithful reconstruction of the damaged file yields **3,191** mapping
keys (3,190 real + 1 degenerate) rather than 3,190. The full corpus has no such
trailing fragment, so this does not affect a good recovery — but it explains the
key count and must not be "fixed" in a reproduction, or `max_length` and the
corpus size will differ.

## 7. Special tokens

```
start : 'startseq '      (trailing space)
end   : ' endseq'        (leading space)
```

They are **not** Keras special tokens. They are ordinary words appearing in
every one of the 40,455 captions, so they are the two most frequent tokens and
take indices **1** and **2**.

### Variant warning: three preprocessing variants exist in this repo

| source | start | end |
|---|---|---|
| `py_model.ipynb` cell 7 | `'startseq '` | `' endseq'` |
| `caption_reader.py` L44 | `'startseq '` | `' endseq'` |
| `preprocessing.py` L75 | `'<start>'` | `'<end>'` |

`IC_MODEL.keras` belongs to the **`startseq`/`endseq`** family: two independent
sources agree, and the notebook's committed outputs contain literal
`startseq ... endseq` strings from a real run.

Quantified if you get it wrong: each pair occurs 40,455 times, so each pair
occupies indices 1 and 2 either way, and **every index from 3 upward is
identical**. So the two variants differ in exactly **2 of 8,485** classes. Still
fatal for decoding — it would emit the end marker immediately or never
terminate — but the bulk of the vocabulary is variant-independent.

**Use `startseq`/`endseq`. Do not use `preprocessing.py`.**

## 8. Tokenizer settings

```python
Tokenizer()          # every default
fit_on_texts(all_captions)
```

All defaults, none overridden:

| parameter | value |
|---|---|
| `num_words` | `None` |
| `filters` | `'!"#$%&()*+,-./:;<=>?@[\]^_`{|}~\t\n'` (default) |
| `lower` | `False` (default; the pipeline lowercases manually) |
| `split` | `' '` |
| `oov_token` | `None` |
| `mode` | `'word'` |

Two consequences:

- The default `filters` strip punctuation during `texts_to_sequences`, merging
  ~290 token strings relative to a raw whitespace split.
- With `oov_token=None`, any unseen word encodes to `[]` — **not** to 0. This
  matters at inference: a caption built from out-of-vocabulary words silently
  loses them.

**Index assignment rule** (critical, and the reason this project is stuck):
Keras sorts by **descending word count**, breaking ties by **first occurrence in
corpus order** (stable sort over an insertion-ordered dict). Verified:
`['a b b c c c d', 'b b c c c d d', 'e']` -> `{'c':1,'b':2,'d':3,'a':4,'e':5}`.

So `word_index` is a pure function of the exact corpus bytes, **including row
order**.

## 9. `max_length`

```
max_length = max(len(caption.split()) for caption in all_captions)   # must be 35
```

Derived, not configured. Note this counts `startseq` and `endseq` as tokens, so
the longest content caption is 33 words.

## 10. Which corpus was used

**Flickr8k**, not Flickr30k. `30kmodel/30k_model.ipynb` is a different
experiment: InceptionV3/GoogLeNet, 2048-d features, 299x299 input — structurally
incompatible with `IC_MODEL.keras`'s 4096-d input. Its captions must never be
mixed in.

## 11. Were captions sorted or processed in any particular order?

**No explicit sorting or shuffling anywhere.** But order is still decisive, for
two reasons:

1. **Tokenizer order** — `word_index` tie-breaking follows first-occurrence
   order, so reordering rows can renumber words whose counts are equal.
2. **Split membership** — cell 14 splits
   `list(mapping.keys())[:int(0.90*n)]`, and `mapping` insertion order is the
   order ids are first seen while scanning `captions.txt` top to bottom. Row
   order therefore determines which 810 ids are the historical test set.

Consequently a replacement corpus is acceptable only if it has the same 8,091 ids
**and the same row order** as the original, or Prompt 12's held-out recovery
cannot succeed even after the vocabulary is rebuilt.

---

## 12. Acceptance conditions for a recovered corpus

A candidate corpus is acceptable only if **all** hold:

| # | condition | required | how to check |
|---|---|---|---|
| A1 | header row | exactly `image,caption` | line 1 |
| A2 | readable | yes | UTF-8 text |
| A3 | caption rows | **40,455** | `len(all_captions)` after cell 6 |
| A4 | unique image ids | **8,091** | `len(mapping)` |
| A5 | ids match `features.pkl` keys | 8,091, 1:1 | set comparison |
| A6 | caption file free of LFS pointers | no `version https://` | grep |
| A7 | file not truncated | final row complete | last line parses to id + non-empty caption |
| A8 | `word_index` size | **8,484** | `len(tokenizer.word_index)` |
| A9 | `vocab_size` | **8,485** | `len(...) + 1` — **the decisive check** |
| A10 | `max_length` | **35** | `max(len(c.split()))` |
| A11 | indices 1 and 2 | `startseq`, `endseq` | `word_index['startseq'] == 1` |
| A12 | preprocessing | `startseq`/`endseq` variant | grep the variant source |
| A13 | no duplicate `(id, caption)` pairs beyond natural rate | ~0.03% tolerated | pairwise count |

**A9 is decisive.** If `vocab_size != 8485`, the tokenizer cannot drive this
checkpoint and Prompt 6 must STOP.

### Image files are NOT required for tokenizer recovery

A useful relaxation. `features.pkl` is **complete and intact for all 8,091
images** (each `(1, 4096)` float32, exact 1:1 key match), verified reproducible
from a readable image at cosine `0.99999988` via
`load_img(interpolation='nearest')`. Since VGG16 is frozen and never fine-tuned,
rebuilding the tokenizer and even retraining the decoder needs only
**`features.pkl` + `captions.txt`**. The 7,702 zero-byte images block live
inference on *new* uploads and visual inspection, not vocabulary recovery.

---

## 13. Why the tokenizer cannot be recovered without the corpus

Measured, not assumed. Two disjoint halves of the surviving corpus (1,595 and
1,596 images) were tokenized independently:

```
words in all three tokenizers            : 2,367
  identical index                        : 28    (1.18%)
  within 20 positions                     : 346   (14.62%)
  median |rank drift|                     : 172

words occupying ranks 560-640:
  identical index in BOTH halves          : 0 / 80   (0.0%)
```

Index assignment is count-ordered, so dropping 61% of rows reshuffles every
mid-frequency and rare word. **Ranks around 598 are entirely unstable.**

Consequence: fitting on the truncated corpus would yield a tokenizer that looks
plausible — indices 1-13 are genuinely correct and stable — while being wrong
for the large majority of classes. That is precisely the failure the plan
forbids, and precisely why Prompt 7 must not run before Prompt 6 succeeds.

Indices 1-13 currently established as safe:
`startseq`=1, `endseq`=2, `in`=3, `the`=4, `on`=5, `is`=6, `dog`=7, `and`=8,
`with`=9, `man`=10, `of`=11, `two`=12, `boy`=13.
`black` sits at 14 in the available corpus but moved to 15 in half B — it is
already at the stability boundary.

---

## 14. Placement and tooling

Put the recovered corpus **separately**, leaving the damaged copy untouched:

```
8kdataset_full/captions.txt     # 40,455 rows
8kdataset_full/Images/          # optional; see section 12
```

Validate with:

```
.venv\Scripts\python.exe -B python model\validate_dataset.py --dataset-root 8kdataset_full
```

Exit code `0` only if every blocking gate passes. It reproduces the
notebook-exact parse, so its `vocab_size` and `max_length` are directly
comparable to A9/A10.

---

**NOTHING DOWNLOADED. EXISTING captions.txt UNTOUCHED. MODEL UNTOUCHED. NOT RETRAINED.**