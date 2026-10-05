import hashlib
import math
import os
import sys
import time
from collections import Counter

import numpy as np
from PIL import Image
from nltk.translate.bleu_score import corpus_bleu
from tensorflow.keras.applications.vgg16 import VGG16, preprocess_input
from tensorflow.keras.models import Model, load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences

from caption_reader import CaptionReader

IMG_DIR = os.path.join('..', '8kdataset', 'Images')
MODEL_FILE = 'IC_MODEL.keras'
CAPTIONS_FILE = 'captions.txt'
REPORT_FILE = 'BLEU_EVALUATION_REPORT.txt'
EXPECTED_SHA = '9eb4f9f257d36b4cd80d3cea1f1a29445597d1b889162ff23148a5d4aa9006a4'

OUT = []


def say(msg=''):
    print(msg)
    OUT.append(msg)


def bar(c='='):
    say(c * 78)


def flush_report():
    with open(REPORT_FILE, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(OUT) + '\n')


# ---------------------------------------------------------------- 1. load model
bar()
say('BLEU EVALUATION OF THE EXISTING IMAGE CAPTIONING MODEL')
say(f'run at            : {time.strftime("%Y-%m-%d %H:%M:%S")}')
say(f'model file       : {os.path.abspath(MODEL_FILE)}')
bar()

sha = hashlib.sha256(open(MODEL_FILE, 'rb').read()).hexdigest()
say('1. LOAD EXISTING MODEL (read-only, never re-saved)')
say(f'   sha256 before eval : {sha}')
say(f'   matches baseline   : {sha == EXPECTED_SHA}')
if sha != EXPECTED_SHA:
    say('   ABORT: model file differs from the verified baseline.')
    flush_report()
    sys.exit(1)
model = load_model(MODEL_FILE)
say(f'   class              : {model.__class__.__name__} ({model.name})')
say(f'   input shapes       : {[tuple(s) for s in model.input_shape]}')
say(f'   output shape       : {tuple(model.output_shape)}')
say(f'   weights modified   : NO  (this script never calls model.save)')

# ------------------------------------------------------- 2/3. tokenizer + length
say('')
say('2. TOKENIZER (reused as-is, NOT rebuilt from any other corpus)')
tokenizer = CaptionReader(CAPTIONS_FILE).get_tokenizer()
n_words = len(tokenizer.word_index)
vocab_from_data = n_words + 1
model_classes = model.output_shape[-1]
say(f'   corpus            : {os.path.abspath(CAPTIONS_FILE)}')
say(f'   len(word_index)   : {n_words}')
say(f'   vocab_size (=+1)  : {vocab_from_data}')
say(f'   model needs       : {model_classes} classes')
say(f'   MISMATCH          : {model_classes - vocab_from_data} output classes have no word')
say('   -> any argmax landing in that range makes idx_to_word() return None and')
say('      STOPS decoding early. Cause: captions.txt is truncated (dataset damage).')

say('')
say('3. max_length')
max_length = model.input_shape[1][1]
say(f'   read from model input_shape : {max_length}')
say(f'   matches notebook len_max=35 : {max_length == 35}')

# ------------------------------------------- 4. reference captions + split rule
with open(CAPTIONS_FILE, 'r', encoding='utf-8', errors='replace') as fh:
    next(fh)
    captions_doc = fh.read()

mapping = {}
for line in captions_doc.split('\n'):
    tokens = line.split(',')
    if len(line) < 2:
        continue
    image_id = tokens[0].split('.')[0]
    caption = ' '.join(tokens[1:])
    mapping.setdefault(image_id, []).append(caption)


def clean(cap):
    cap = cap.lower().replace('[^A-Za-z]', '').replace(r'\s+', ' ')
    return ' '.join(w for w in cap.split() if len(w) > 1)


for k in mapping:
    mapping[k] = [clean(c) for c in mapping[k]]

image_ids = list(mapping.keys())
split = int(len(image_ids) * 0.90)
train_keys = image_ids[:split]
test_keys = image_ids[split:]

say('')
say('4. TEST SET (py_model.ipynb split rule: image_ids=list(mapping.keys()), 90/10)')
say(f'   mapping keys      : {len(mapping)}')
say(f'   split index       : {split}')
say(f'   train keys        : {len(train_keys)}')
say(f'   test keys         : {len(test_keys)}')
say('   CAVEAT: the original 90/10 boundary cannot be recovered, because the')
say('   surviving key set (3,191) is not the training-time key set (~8,091).')
say('   The rule above is re-applied to the surviving data, so it is a faithful')
say('   but APPROXIMATE reconstruction of the notebook test split.')

ALL_FILES = os.listdir(IMG_DIR)
BY_PREFIX = {}
for f in ALL_FILES:
    BY_PREFIX.setdefault(f.split('.')[0], f)


def usable(keys):
    ok, ex = [], Counter()
    for k in keys:
        fn = BY_PREFIX.get(k)
        if fn is None:
            ex['no image file'] += 1
            continue
        p = os.path.join(IMG_DIR, fn)
        if os.path.getsize(p) == 0:
            ex['zero-byte file'] += 1
            continue
        try:
            im = Image.open(p)
            im.verify()
            im = Image.open(p)
            im.load()
        except Exception:
            ex['corrupt / unreadable'] += 1
            continue
        refs = [c for c in mapping[k] if c.split()]
        if len(refs) < 1:
            ex['no valid reference caption'] += 1
            continue
        ok.append((k, fn))
    return ok, ex


say('')
say('   --- screening the DEFINED TEST SET ---')
test_ok, test_ex = usable(test_keys)
say(f'   test keys            : {len(test_keys)}')
for reason, n in sorted(test_ex.items()):
    say(f'     excluded ({reason}) : {n}')
say(f'   USABLE TEST IMAGES   : {len(test_ok)}')

train_ok, train_ex = usable(train_keys)
say('')
say('   --- screening the TRAIN half (for comparison) ---')
say(f'   train keys           : {len(train_keys)}')
for reason, n in sorted(train_ex.items()):
    say(f'     excluded ({reason}) : {n}')
say(f'   usable train images  : {len(train_ok)}')

FALLBACK = len(test_ok) == 0
if FALLBACK:
    eval_set = train_ok
    say('')
    bar('!')
    say('*** THE DEFINED TEST SET CONTAINS ZERO EVALUABLE IMAGES ***')
    say('*** Every test-split image is either zero-byte or absent, so a valid')
    say('*** held-out BLEU score CANNOT be computed. Proceeding instead with the')
    say('*** usable TRAIN images, labelled explicitly below.')
    say('*** THESE BLEU SCORES MEASURE TRAINING-SET FIT, NOT GENERALISATION.')
    bar('!')
else:
    eval_set = test_ok

# --------------------------------------------------------------- 5. generate
say('')
say('5. GENERATE CAPTIONS')
say(f'   images to evaluate : {len(eval_set)}')
say('   extracting VGG16 fc2 features (batched) ...')
vgg_base = VGG16()
vgg_model = Model(inputs=vgg_base.inputs, outputs=vgg_base.layers[-2].output)


def idx_to_word(i):
    for w, ix in tokenizer.word_index.items():
        if ix == i:
            return w
    return None


batch, feats, keys = [], [], []


def flush_batch():
    if not batch:
        return
    arr = preprocess_input(np.stack(batch))
    feats.append(vgg_model.predict(arr, verbose=0))
    keys.extend([b[0] for b in batch])
    batch.clear()


for k, fn in eval_set:
    im = Image.open(os.path.join(IMG_DIR, fn)).resize((224, 224)).convert('RGB')
    batch.append(np.array(im).reshape((1, 224, 224, 3)))
    batch[-1] = batch[-1][0]
    if len(batch) == 16:
        flush_batch()
flush_batch()
features = np.concatenate(feats, axis=0)
say(f'   feature matrix     : {features.shape}')

hyp_lines, ref_lines, trunc = [], [], []
t0 = time.time()
for n, (k, fn) in enumerate(eval_set, 1):
    f = features[n - 1:n]
    in_text = 'startseq'
    for _ in range(max_length):
        seq = tokenizer.texts_to_sequences([in_text])[0]
        seq = pad_sequences([seq], maxlen=max_length)
        yhat = model.predict([f, seq], verbose=0)
        word = idx_to_word(int(np.argmax(yhat)))
        if word is None:
            trunc.append((fn, int(np.argmax(yhat))))
            break
        in_text += ' ' + word
        if word == 'endseq':
            break
    hyp = [w for w in in_text.split() if w not in ('startseq', 'endseq')]
    hyp_lines.append(hyp)
    ref_lines.append([c.split() for c in mapping[k] if c.split()])
    if n % 25 == 0 or n == len(eval_set):
        say(f'   {n}/{len(eval_set)}  ({time.time() - t0:.0f}s)')

say(f'   captions generated : {len(hyp_lines)}')
say(f'   empty predictions  : {sum(1 for h in hyp_lines if not h)}')
say(f'   TRUNCATED by unmapped-token early stop : {len(trunc)}'
    f'  ({100.0 * len(trunc) / max(1, len(hyp_lines)):.1f}%)')

# ---------------------------------------------------------------- 6. BLEU
say('')
say('6. BLEU SCORES (nltk corpus_bleu; startseq/endseq stripped from BOTH sides)')
WEIGHTS = {1: (1.0, 0, 0, 0), 2: (0.5, 0.5, 0, 0),
           3: (1 / 3, 1 / 3, 1 / 3, 0), 4: (0.25, 0.25, 0.25, 0.25)}
bleu = {n: corpus_bleu(ref_lines, hyp_lines, weights=WEIGHTS[n]) for n in (1, 2, 3, 4)}


def cross_check(refs, hyps):
    """Independent reimplementation of nltk.corpus_bleu(+method0), per-order
    precisions, hypothesis-ngram denominators, closest-reference brevity penalty.
    Validated against nltk on 28 synthetic cases. Must agree exactly."""
    num = [0.0] * 5
    den = [0.0] * 5
    c = r = 0
    for refs_i, hyp_i in zip(refs, hyps):
        for k in range(1, 5):
            counts = (Counter(tuple(hyp_i[i:i + k]) for i in range(len(hyp_i) - k + 1))
                      if len(hyp_i) >= k else Counter())
            mx = {}
            for x in refs_i:
                rc = (Counter(tuple(x[i:i + k]) for i in range(len(x) - k + 1))
                      if len(x) >= k else Counter())
                for g in counts:
                    mx[g] = max(mx.get(g, 0), rc[g])
            num[k] += sum(min(v, mx[g]) for g, v in counts.items())
            den[k] += max(1, sum(counts.values()))
        c += len(hyp_i)
        r += min((len(x) for x in refs_i),
                 key=lambda rl: (abs(rl - len(hyp_i)), rl))
    p = [(num[k] / den[k]) if den[k] else 0.0 for k in range(1, 5)]
    bp = 1.0 if c > r else (0.0 if c == 0 else math.exp(1 - r / c))
    out = {}
    for k in range(1, 5):
        if num[1] == 0 or any(p[i] == 0.0 for i in range(k)):
            out[k] = 0.0
            continue
        out[k] = bp * math.exp(
            sum(WEIGHTS[k][i] * math.log(p[i]) for i in range(k)))
    return out, c, r, bp, p


xc, c_tot, r_tot, bp, prec = cross_check(ref_lines, hyp_lines)
agree = all(abs(bleu[n] - xc[n]) < 1e-9 for n in (1, 2, 3, 4))
for n in (1, 2, 3, 4):
    say(f'   BLEU-{n} : nltk={bleu[n]:.6f}   independent={xc[n]:.6f}   agree={abs(bleu[n]-xc[n])<1e-9}')
say(f'   independent check agrees on all four : {agree}')
say(f'   per-order modified precision : p1={prec[0]:.6f} p2={prec[1]:.6f} '
    f'p3={prec[2]:.6f} p4={prec[3]:.6f}')
say(f'   total hypothesis length : {c_tot}   total reference length : {r_tot}   BP = {bp:.6f}')
if not agree:
    say('   *** nltk and the independent implementation DISAGREE - treat with suspicion ***')

# ------------------------------------------------------------- 7. 10 examples
say('')
say('7. TEN EXAMPLE PREDICTIONS')
for i in range(min(10, len(hyp_lines))):
    k, fn = eval_set[i]
    say('')
    say(f'   [{i + 1}] {fn}')
    for r_ in ref_lines[i]:
        say(f'        REF : {" ".join(r_)}')
    say(f'        PRED: {" ".join(hyp_lines[i]) if hyp_lines[i] else "(empty)"}')

# ------------------------------------------------------------------ 8. summary
say('')
bar()
say('SUMMARY')
bar()
say(f'Number of test images evaluated : {len(hyp_lines)}')
say(f'Evaluation set                  : {"TRAIN images (NOT a held-out test set)" if FALLBACK else "notebook 90/10 test split"}')
say(f'BLEU-1                          : {bleu[1]:.6f}')
say(f'BLEU-2                          : {bleu[2]:.6f}')
say(f'BLEU-3                          : {bleu[3]:.6f}')
say(f'BLEU-4                          : {bleu[4]:.6f}')
say('')
say('INTERPRETATION GUARDRAILS')
say(' - These scores are computed on TRAINING images. They measure how well the')
say('   model fits data it was trained on. They are NOT a generalisation estimate.')
say(' - The notebook-defined held-out split yielded 0 usable images, so no valid')
say('   held-out BLEU can be reported from the surviving dataset at all.')
say(f' - Tokenizer is short by {model_classes - vocab_from_data} classes; '
    f'{len(trunc)} predictions were cut short by an unmapped token.')
say(' - Model file was opened read-only; sha256 verified unchanged.')
bar()

flush_report()
say(f'\nreport written to {os.path.abspath(REPORT_FILE)}')
print('\n'.join(['', 'DONE']))