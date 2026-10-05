# TRAINING_PIPELINE_FORENSIC_REPORT

**Source of record:** `python model/py_model.ipynb` (nbformat 4.2, 26 cells, 10 with stored outputs)
**Corroborating source:** `python model/preprocessing.py`, `python model/caption_reader.py`
**Method:** read-only extraction of every code cell and every stored output.
**Status:** READ-ONLY. No project file was modified. Nothing was retrained.

All 26 requested items were recovered from the notebook itself. Cell numbers
refer to the notebook's cell order.

---

## 1. Dataset source

**Flickr8k.** `README.md` L21 states 8,000 images with five human-generated
captions each. The notebook's stored output for cell 10 is `40455`, which is
exactly `8091 x 5`; the notebook never states 8,091 explicitly but
`features.pkl` in this repository contains exactly **8,091** image ids, which
fixes the count.

`30kmodel/30k_model.ipynb` is a **separate Flickr30k experiment** and is not
part of this pipeline (see §27).

## 2. Caption file

```
kaggle/captions.txt          (cell 5)
```

Opened with `next(f)` to discard the header, then `f.read()`. Header is
`image,caption`.

## 3. Image directory

```
kaggle/Images                (cell 2, feature extraction - present but commented out)
```

Cell 21 also opens `os.path.join("kaggle/Images", image_name)` for display.
Neither `kaggle/Images` nor `kaggle/captions.txt` exists in this repository
today; the working copies are `8kdataset/Images` and `8kdataset/captions.txt`.

## 4. Caption cleaning function

Cell 7, verbatim:

```python
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

Three behaviours were verified by execution, not by reading:

| line | apparent intent | actual behaviour |
|---|---|---|
| `replace('[^A-Za-z]', '')` | strip punctuation | **no-op.** `'[^A-Za-z]'` is a plain string, not a regex. Nothing is removed. |
| `replace('\s+', ' ')` | collapse whitespace | **no-op.** `'\s'` is not a Python escape (backslash + s). Whitespace is instead normalised by `split()` + `join()` below. |
| `" ".join(w for w in ... if len(w) > 1)` | drop short words | **real.** Any 1-character token is dropped. |

Consequence: punctuation survives into the vocabulary, and ` , ` separators in
the corpus collapse into plain spaces because the mapping loop (cell 6) splits
every line on `,` and rejoins the tail with a space.

### Parser fidelity caveat (verified)

Cell 6 parses with `line.split(',')` and `" ".join(tokens[1:])`. Because many
corpus captions are double-quoted and contain ` , ` as a word separator, this
naive parse differs from a real CSV parse: it deletes the separator commas and
therefore preserves one extra surviving token per quoted caption beginning with
a short word (e.g. `"A` survives the `len(w) > 1` filter, `A` would not).

Measured consequence on the longest caption
(`2354456107_bf5c766a05.jpg`):

| parser | `max_length` |
|---|---|
| notebook `line.split(',')` (authoritative) | **35** |
| `csv.reader` | 34 |

The notebook's form is the one that produced `IC_MODEL.keras` and must be
reproduced. Any tool using `csv.reader` will disagree.

Cell 6 also has a latent bug: the guard is `if len(line) < 2` — the length of
the *string*, not the token count. A truncated final line such as `2869009633`
has length 10, so it is **not** skipped; it yields `image_id='2869009633'` with
an empty caption, adding one spurious mapping key. That is why the
notebook-faithful reconstruction produces **3,191** keys from this truncated
file (3,190 real ids + 1 degenerate) rather than 3,190.

## 5. Tokenizer implementation

```python
from tensorflow.keras.preprocessing.text import Tokenizer   # cell 0
tokenizer = Tokenizer()                                      # cell 11
```

**All Keras defaults.** Not one argument is passed, so the configuration is
`oov_token=None`, `filters='!"#$%&()*+,-./:;<=>?@[\]^_`{|}~\t\n'`,
`split=' '`, `lower=False` (the pipeline lowercases manually beforehand),
`num_words=None`, `mode='word'`.

The default `filters` matter: Keras strips punctuation characters during
`texts_to_sequences`, which merges/removes roughly 290 distinct token strings
versus a raw whitespace split.

## 6. Tokenizer fitting corpus

Cell 9 builds `all_captions` as **every cleaned caption of every image**, i.e.
all 40,455 of them, with **no train/test filtering**. The tokenizer is therefore
fitted on the full corpus, which is why the historical test split is not
independent of the vocabulary.

## 7. `word_index` creation

Never assigned explicitly. Produced as a side effect of
`tokenizer.fit_on_texts(all_captions)` (cell 11).

Keras assigns indices **1..N in descending word-count order**; ties are broken
by **first occurrence in the corpus**, because the implementation performs a
stable sort over an insertion-ordered `word_counts` dict. Verified empirically:
a corpus of `['a b b c c c d', 'b b c c c d d', 'e']` yields
`{'c':1,'b':2,'d':3,'a':4,'e':5}` — counts 6,4,3,1,1 — with the two count-1
words ordered by first appearance.

**This makes the vocabulary a pure function of the exact corpus bytes.**

## 8. Vocabulary size

```python
vocab_size = len(tokenizer.word_index) + 1     # cell 11
```

Stored output of cell 12: **`8485`**.

This explicitly confirms the `len(word_index) + 1` convention in the training
code itself, which is the confirmation Prompt 5 demands. It implies the
original `word_index` contained **8,484** entries.

The convention is consistent with the checkpoint: `IC_MODEL.keras` has
`Dense(..., 8485, activation='softmax')` and `Embedding(8485, 256)`.

## 9. `max_length`

```python
max_length = max(len(caption.split()) for caption in all_captions)   # cell 13
```

Stored output: **`35`**. Matches `IC_MODEL.keras`'s `text` input of `(None, 35)`.

## 10. Start token

```
'startseq '        (trailing space, then the first content word)
```

Prepended during cleaning (cell 7). At generation (cell 19) the decoder seeds
with the bare string `'startseq'`.

## 11. End token

```
' endseq'          (leading space)
```

Appended during cleaning. Generation halts when the decoded word equals
`'endseq'` (cell 19).

## 12. Sequence-generation logic

Cell 19, greedy / `argmax`, no beam search:

```python
in_text = 'startseq'
for i in range(max_length):
    sequence = tokenizer.texts_to_sequences([in_text])[0]
    sequence = pad_sequences([sequence], max_length)
    yhat = model.predict([image, sequence], verbose=0)
    yhat = np.argmax(yhat)
    word = idx_to_word(yhat, tokenizer)
    if word is None:
        break
    in_text += " " + word
    if word == 'endseq':
        break
```

`idx_to_word` (cell 18) is a **linear scan** over `tokenizer.word_index.items()`
returning the word whose stored index equals the argmax. It is O(V) per step and
it is the exact point where a wrong word_index produces wrong text from correct
logits.

## 13. Padding method

```python
pad_sequences([sequence], max_length)     # cell 19
```

Keras defaults: `maxlen=max_length`, `padding='post'`, `truncating='pre'`,
`value=0`, `dtype='int32'`. Because padding is post and truncating pre, the
sequence is right-padded with zeros and, if it ever exceeds 35 tokens, the
**front** is cut.

Index 0 is never a real word (Keras reserves 0 for padding/OOV), and
`Embedding(..., mask_zero=True)` tells the LSTM to ignore it. The corresponding
`not_equal_1` layer is visible in `IC_MODEL.keras`'s `config.json`.

Training-time encoding (cell 15) uses the same call with an explicit
`maxlen=max_length`; targets are produced by
`to_categorical([out_seq], num_classes=vocab_size)`.

## 14. Image feature extractor

Cells 1-4:

```python
model = VGG16()
model = Model(inputs=model.inputs, outputs=model.layers[-2].output)
```

`layers[-2]` of `VGG16()` is the `fc2` block, taken *before* the final
predictions layer. `python_implementation.py`'s note "we use the last layer for
feature extraction" is inaccurate — it is the second-to-last.

`preprocessing.py` L20-21 shows the original working directory was
`/home/saee-we/image-captioning/8kdataset`.

## 15. Image feature dimension

**4096.** Confirmed by the checkpoint's `image` input of `(None, 4096)` and by
`features.pkl`, whose 8,091 values are all `ndarray` of shape `(1, 4096)`,
dtype `float32`.

Preprocessing: `load_img(img_path, target_size=(224, 224))` ->
`img_to_array` -> `reshape(1, 224, 224, 3)` -> `preprocess_input`.

## 16. Decoder architecture

Cell 16, exactly:

```python
inputs1 = Input(shape=(4096,), name="image")
fe1 = Dropout(0.4)(inputs1)
fe2 = Dense(256, activation='relu')(fe1)

inputs2 = Input(shape=(max_length,), name="text")
se1 = Embedding(vocab_size, 256, mask_zero=True)(inputs2)
se2 = Dropout(0.4)(se1)
se3 = LSTM(256)(se2)

decoder1 = add([fe2, se3])
decoder2 = Dense(256, activation='relu')(decoder1)
outputs  = Dense(vocab_size, activation='softmax')(decoder2)
```

A standard VGG16-fc2 + embedding/LSTM captioning model. Verified against the
loaded checkpoint: 11 config layers, **5,992,741** parameters, all trainable.

## 17. Optimizer

```python
model.compile(loss='categorical_crossentropy', optimizer='adam')   # cell 16
```

`'adam'` with Keras defaults: `lr=0.001`, `beta_1=0.9`, `beta_2=0.999`,
`epsilon=1e-7`, `amsgrad=False`. Note `IC_MODEL.keras` was saved **with**
optimizer state (the HDF5 contains `optimizer/vars/*` Adam slots).

## 18. Loss function

`categorical_crossentropy` over one-hot targets of width `vocab_size` (8,485).

## 19. Number of epochs

```python
epochs = 50          # cell 17
```

Stored output shows exactly **50** progress lines, `5.7976` down to `1.7049`.

(The revised plan's preamble says "50/50 epochs"; the notebook is
unambiguous — a loop of 50 single-epoch `model.fit` calls.)

## 20. `steps_per_epoch`

```python
steps = len(train) // batch_size     # cell 17
```

`len(train) = int(8091 * 0.90) = 7281`; `7281 // 32 = 227`. The stored output
shows `227/227` on every epoch, which confirms both the split size and the batch
size.

## 21. Train/test split logic

Cell 14:

```python
image_ids = list(mapping.keys())
split = int(len(image_ids) * 0.90)
train = image_ids[:split]
test  = image_ids[split:]
```

- **Sequential**, over `dict` insertion order — which is the order each image id
  is *first seen* while scanning `captions.txt` top to bottom.
- No shuffle, no stratification, no separate validation set.
- Result: **7,281 train / 810 test**.

Because the order depends on the corpus bytes, reproducing the historical test
membership requires the complete corpus in the original row order.

## 22. Random seed

**None.** All 26 cells were read: there is no `random.seed`, no
`np.random.seed`, no `tf.random.set_seed`, and no `PYTHONHASHSEED` setting.
Dropout masks and any internal shuffling were therefore **not** reproducible even
in the original run. This is expected for greedy-argmax inference (no sampling)
and does not affect caption generation.

## 23. BLEU evaluation code

Cell 20, verbatim:

```python
from nltk.translate.bleu_score import corpus_bleu
actual, predicted = list(), list()
for key in test:
    captions = mapping[key]
    y_pred = predict_caption(model, features[key], tokenizer, max_length)
    actual_captions = [caption.split() for caption in captions]
    y_pred = y_pred.split()
    actual.append(actual_captions)
    predicted.append(y_pred)
print("BLEU-1: %f" % corpus_bleu(actual, predicted, weights=(1.0, 0, 0, 0)))
print("BLEU-2: %f" % corpus_bleu(actual, predicted, weights=(0.5, 0.5, 0, 0)))
```

- NLTK `corpus_bleu`, **corpus-level** (not per-sentence averaged).
- References **retain** `startseq`/`endseq` because `mapping` was cleaned in
  place by cell 8; hypotheses come from `predict_caption`, which returns
  `in_text` still containing both markers. Both sides therefore include the
  markers as tokens.
- 5 references per hypothesis.
- No smoothing; `corpus_bleu` defaults to `smoothing_function=None`.
- BLEU-1 uses weights `(1.0, 0, 0, 0)`; BLEU-2 uses `(0.5, 0.5, 0, 0)`.
- **BLEU-3 and BLEU-4 were never computed** in the original project.

## 24. Stored BLEU-1 result

```
BLEU-1: 0.513414
```

## 25. Stored BLEU-2 result

```
BLEU-2: 0.290109
```

## 26. Sample generated caption

Cell 22, `generate_caption('124881487_36e668145d.jpg')`:

```
---------------------Actual---------------------
startseq man on bicycle riding down rocky hill endseq
startseq man rides his dirt bike down rocky trail endseq
startseq person rides bike down rocky hill endseq
startseq blurry picture of mountain biker descending rocky trail endseq
startseq the mountain biker in blue rides down rocky path endseq
--------------------Predicted--------------------
startseq woman rides bike down rocky path endseq
```

---

## 27. How the 8,485 output classes were mapped to words

This is the crux of the entire project.

1. `fit_on_texts` sorted all 40,455 cleaned captions and assigned
   `word_index[word] = 1..8484` by descending count, ties by first occurrence.
2. `vocab_size = len(word_index) + 1 = 8485` sized both `Embedding(8485, 256)`
   and `Dense(8485, 'softmax')`.
3. Training targets were `to_categorical(out_seq, num_classes=8485)`, so output
   unit *i* is trained to predict word_index value *i*.
4. Inference reversed it with a linear scan in `idx_to_word`.

Therefore **output class *i* is word `word_index⁻¹(i)`, and the mapping lives
only in the tokenizer object.**

**The mapping was never persisted.** Keras `.keras` archives serialise only
`config.json`, `metadata.json` and `model.weights.h5` — no tokenizer. The
`word_index` existed solely as notebook variable `tokenizer` (cells 11-12) and
was discarded when the session ended. `model.save('IC_MODEL.keras')` in cell 25
therefore produced a checkpoint that is **unusable without an external
reconstruction of that tokenizer**.

`config.json` records only the *width* 8,485 — never the identity of any class.

## 28. Two divergent preprocessing variants exist in the repository

| source | start token | end token | notes |
|---|---|---|---|
| `py_model.ipynb` (cell 7) | `'startseq '` | `' endseq'` | has real stored outputs |
| `caption_reader.py` L44 | `'startseq '` | `' endseq'` | used by `app.py` at runtime |
| `preprocessing.py` L75 | `'<start>'` | `'<end>'` | original Linux script, hardcoded `/home/saee-we/...` |

`IC_MODEL.keras` belongs to the **`startseq`/`endseq`** family:

- Two independent sources agree on `startseq`/`endseq`
  (`py_model.ipynb` and `caption_reader.py`), one disagrees
  (`preprocessing.py`).
- The notebook's stored outputs contain literal `startseq ... endseq` strings
  from a real run, so the notebook's variant is the one that executed.
- `IC_MODEL.keras` is saved by notebook cell 25.

Quantified impact of getting this wrong: `startseq` and `endseq` each occur
40,455 times (once per caption), as do `<start>` and `<end>`. Both pairs are
therefore the two highest-frequency tokens and occupy indices **1 and 2** either
way. Every index from 3 upward is **identical** between the two variants. So a
wrong variant corrupts exactly **2 of 8,485** classes — still fatal for decoding
(it would emit the end marker immediately, or never terminate), but the
*bulk* of the vocabulary is variant-independent.

**`preprocessing.py` is a legacy variant and must not be used to rebuild the
tokenizer.**

## 29. Provenance anomaly in the save cell

Notebook cell 25 is `model.save('IC_MODEL.keras')` followed by
`load_model('IC_MODEL.keras')`. Its stored output is:

```
<error NameError: name 'model' is not defined>
```

and its `execution_count` is `1`, whereas cells 1-22 ran at counts 51-87. So the
committed notebook state is **not a single continuous session**: cells 1-22
belong to an earlier session than the save cell. `IC_MODEL.keras` on disk is
valid, loads cleanly, and is architecturally self-consistent, so it was produced
by *some* successful run — but not by the exact committed cell ordering. This is
recorded as a provenance caveat, not as evidence of model damage.

## 30. Summary of the exact contract to reproduce

```
corpus            kaggle/captions.txt, header 'image,caption', 8,091 ids, 40,455 rows
parse             line.split(',') -> " ".join(tokens[1:])   [NOT csv.reader]
clean             lower; both replaces are no-ops; drop len==1 tokens;
                  'startseq ' + words + ' endseq'
tokenizer         keras Tokenizer(), all defaults, fit on ALL 40,455 captions
vocab_size        len(word_index) + 1 = 8485  (confirmed in code, cell 11)
max_length        35
padding           pad_sequences(..., maxlen=35) -> post / value 0 / truncating pre
features          VGG16 layers[-2] (fc2), 224x224, preprocess_input, float32 (1,4096)
architecture      Dropout(.4)-Dense(256)- + Embedding(8485,256,mask)-Dropout(.4)-LSTM(256)
optimizer/loss    adam / categorical_crossentropy
epochs/batch      50 / 32, steps_per_epoch = len(train)//32 = 227
split             int(0.90 * 8091) = 7281 train / 810 test, sequential, unshuffled
seed              none
decode            greedy argmax, seed 'startseq', stop on 'endseq' or unknown
eval              nltk corpus_bleu over the 810 test images, markers included
```

---

**READ-ONLY FORENSIC AUDIT COMPLETE. NOTHING WAS MODIFIED. NOTHING WAS RETRAINED.**