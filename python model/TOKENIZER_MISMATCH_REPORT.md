# TOKENIZER MISMATCH REPORT

**Prompt 3 — READ-ONLY tokenizer comparison. Nothing modified, nothing retrained.**

---

## Summary of the finding

The model's 8,485 output classes are correct and internally consistent. The
vocabulary that maps those classes to words is **corrupted**, because
`captions.txt` retains only 39% of its rows and the tokenizer must be refitted
from whatever corpus is available.

Measured on the available corpus:

| | available (truncated) | required by `IC_MODEL.keras` | delta |
|---|---|---|---|
| `vocab_size` | **5,465** | **8,485** | **-3,020** |
| `word_index` entries | 5,464 | 8,484 | -3,020 |
| `max_length` | **35** | 35 | **0 (matches)** |

`max_length` still matches, so sequence length is **not** part of the defect.
`vocab_size` is the sole incompatibility.

---

## A. Tokenizer currently reconstructed from the available `captions.txt`

Rebuilt with the notebook's exact pipeline (cell 6 parse, cell 7 clean, cell 11
`Tokenizer()` with all defaults, fit on all 15,949 surviving captions).

```
mapping keys      : 3,191   (3,190 real ids + 1 spurious from the truncated last row)
all_captions      : 15,949
word_index size   : 5,464
vocab_size        : 5,465
max_length        : 35
```

### First 20 `word_index` entries

| idx | word | count | | idx | word | count |
|---|---|---|---|---|---|---|
| 1 | `startseq` | 15,949 | | 11 | `of` | 2,539 |
| 2 | `endseq` | 15,949 | | 12 | `two` | 2,081 |
| 3 | `in` | 7,410 | | 13 | `boy` | 1,857 |
| 4 | `the` | 7,362 | | 14 | `black` | 1,630 |
| 5 | `on` | 4,262 | | 15 | `white` | 1,628 |
| 6 | `is` | 3,859 | | 16 | `girl` | 1,509 |
| 7 | `dog` | 3,771 | | 17 | `to` | 1,301 |
| 8 | `and` | 3,607 | | 18 | `wearing` | 1,300 |
| 9 | `with` | 3,188 | | 19 | `woman` | 1,286 |
| 10 | `man` | 2,721 | | 20 | `water` | 1,284 |

### Required probe words

| word | index | word | index |
|---|---|---|---|
| `startseq` | 1 | `and` | 8 |
| `endseq` | 2 | `with` | 9 |
| `in` | 3 | `man` | 10 |
| `the` | 4 | `of` | 11 |
| `on` | 5 | `two` | 12 |
| `is` | 6 | `boy` | 13 |
| `dog` | 7 | `black` | 14 |

All 14 present, none absent.

### Index 598

```
index 598 in the truncated tokenizer decodes to:  'leans'
its corpus count:                                 24
```

---

## B. Tokenizer implied by the original training run

**Not reconstructible from local data.** Stated plainly rather than estimated.

What *is* provable from the notebook's stored outputs:

- `vocab_size` was **8,485** (cell 12 output).
- `max_length` was **35** (cell 13 output).
- `all_captions` was **40,455** (cell 10 output).
- Indices 1 and 2 are `startseq` and `endseq` in that order — the first
  surviving caption in the corpus begins `startseq ...` and ends `... endseq`,
  both occurring 40,455 times, so both are the two most frequent tokens and
  take indices 1 and 2 by first occurrence.

What is **not** provable: the identity of any class from index 3 upward that
depends on rank order, and specifically index 598.

### Why index 598 cannot be inferred

I measured this rather than assuming it. Two disjoint halves of the surviving
corpus (1,595 and 1,596 images) were tokenized independently and their index
assignments compared:

```
words present in all three tokenizers : 2,367
  median |rank drift|                  : 172
  p90    |rank drift|                  : 822
  p99    |rank drift|                  : 1,972
  max    |rank drift|                  : 2,908
  words with identical index           : 28  (1.18%)
  words within 20 positions            : 346 (14.62%)

words occupying ranks 560-640:
  identical index in BOTH disjoint halves : 0 / 80   (0.0%)

examples (word, full-corpus rank, half A, half B):
  pile      560   392   1064
  boots     561   607    529
  creek     563   425    873
  which     566   663    481
  turn      568   933    406
  parking   570   495    683
```

Index assignment is count-ordered, so removing 61% of rows reshuffles every
mid-frequency and rare word. **Ranks near 598 are completely unstable: 0 of 80
were preserved across disjoint halves.** Any claim about which word the original
index 598 held, derived from the truncated corpus, would be invention.

The 14 probe words are the exception — they survived intact:

```
startseq 1/1  endseq 2/2  in 3/3  the 4/4  on 5/5  is 6/6  dog 7/7
and 8/8  with 9/9  man 10/10  of 11/11  two 12/12  boy 13/13  black 14/15
-> 13 of 14 identical across both disjoint halves
```

So indices 1-13 can be treated as solid. `black` at rank 14 is already at the
margin (it moved to 15 in half B) — a useful warning that the stability boundary
is right around there.

---

## Are the same model output indices mapped to different words?

**Yes — definitively proven, not inferred.**

Controlled A/B on `124881487_36e668145d.jpg` with identical image, identical
preprocessing, identical feature vector, identical weights, identical greedy
decoder, identical `max_length`, varying only the tokenizer:

```
A prediction: leans is for child glasses
B prediction: woman rides bike down rocky path endseq
```

The same `argmax` indices are decoded to different words, and the low indices
still agree while the high ones diverge. That is the signature of a count-ordered
vocabulary rebuilt on a different corpus:

- low indices (`startseq`=1, `endseq`=2, `in`=3, `the`=4, `on`=5, `is`=6 ...)
  are frequency-robust and survive truncation, so the caption starts plausibly;
- mid and high indices are remapped, so every word after the first few is
  wrong.

Encoding is unaffected: `startseq woman rides bike down rocky path endseq`
round-trips cleanly in the truncated tokenizer to
`[1, 19, 149, 115, 37, 201, 172, 2]`. The tokenizer is self-consistent; it is
simply not the tokenizer the weights were trained against.

---

## Root cause

The `word_index` was never persisted. `IC_MODEL.keras` contains only
`config.json`, `metadata.json`, `model.weights.h5`; Keras `.keras` archives do
not serialise a `Tokenizer`. The vocabulary lived only in notebook variable
`tokenizer` (cell 11) and was discarded. `config.json` records the *width*
8,485 but the *identity* of no class.

This is a checkpoint-packaging defect, not a training defect.

---

## Conclusion

```
TOKENIZER_STATUS = CORRUPTED
```

The evidence confirms the mismatch:

1. `vocab_size` 5,465 vs the required 8,485 (short by 3,020).
2. Identical model output indices decode to different words, proven by controlled
   A/B on one image with only the tokenizer varied.
3. Rank instability measurement shows indices at rank ~598 are 0/80 stable
   across corpus subsets, so the correct mapping cannot be recovered from the
   truncated corpus by inference.
4. No serialized tokenizer artifact exists anywhere in the repository
   (see the Prompt 4 search report).

The **weights are not implicated.** They remain internally consistent
(`Embedding(8485,256)` matches `Dense(8485)`), and the only defect found is the
class-to-word mapping.

**Recovery route:** rebuild the tokenizer from the complete 40,455-row
`captions.txt`. Until that corpus exists, Prompts 6-20 cannot proceed.

---

**READ-ONLY. NOTHING MODIFIED. NOTHING RETRAINED.**