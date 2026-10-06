# Image Captioning

Deep-learning system that generates descriptive captions for images using a
CNN encoder + LSTM decoder (VGG16 features -> sequence model -> text), with a
Flask inference API and a React/Tailwind web app. This repository contains the
model, training code, dataset assets and the web frontend.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Dataset](#dataset)
- [Results](#results)
- [Status and known issues](#status-and-known-issues)
- [Project layout](#project-layout)
- [Getting started](#getting-started)
- [Prediction API](#prediction-api)
- [Acknowledgements](#acknowledgements)

## Features

- Generate a caption for any uploaded image (JPG, PNG, WEBP, GIF) via a web UI
  or the REST API.
- **Model page** - drag-and-drop upload with live preview and size badge,
  client-side file validation, loading / success / error states, and a caption
  result card with copy feedback. Errors are presented as clean messages; raw
  backend stack traces are never exposed.
- **Home page** - explains the product, the `UPLOAD -> ANALYZE -> GENERATE`
  workflow and the model architecture.
- **About page** - describes how the model works with a responsive
  `IMAGE -> CNN -> FEATURE VECTOR -> LSTM -> TEXT` pipeline diagram.
- Responsive navigation with scroll-spy, mobile menu, dark UI, and a
  reduced-motion mode for accessibility.

## Architecture

Single-image captioning pipeline, Keras 3 / TensorFlow 2.16:

| Stage | Component | Details |
| --- | --- | --- |
| Encoder | VGG16 (ImageNet weights) | 224x224 RGB input; `fc2` activation is taken as the 4096-d image feature vector (auto-downloaded on first run). |
| Decoder | `IC_MODEL.keras` (Functional) | `image (None, 4096)` and `text (None, 35)` inputs; `Embedding(8485 -> 256)` + `LSTM(256)`, fused with the image branch via `Add`, then `Dense(256) -> Dense(8485)` softmax over the caption vocabulary. |
| Generation | Greedy argmax decode | Starts from `startseq`, samples one word per timestep up to 35 tokens, stops on `endseq`. |

Model checkpoint: `python model/IC_MODEL.keras` (5,992,741 params).

## Dataset

**Flickr8k** - 8,091 images, each annotated with five human-written captions
(40,455 captions total). Distributed under the Flickr data license.

> The copy of `captions.txt` committed in this repository is **truncated
> (15,949 of 40,455 rows)**. This is a known defect that degrades the
> tokenizer - see [Status and known issues](#status-and-known-issues).

The repo also contains a `features.zip` extracting to a complete feature
matrix (8,091 x 4096) produced by `preprocessing.py` for training.

## Results

- **Historical (recorded in the training notebook, original full corpus):**
  loss `5.7976 -> 1.7049` (50 epochs), `vocab_size = 8485`,
  `max_length = 35`; sample caption
  `startseq woman rides bike down rocky path endseq`.
- **Notebook-recorded BLEU:** BLEU-1 `0.513414`, BLEU-2 `0.290109`. These are
  the numbers recorded during training, **not** a held-out evaluation.
- **Current measured BLEU** (`python model/evaluate_bleu.py`): a true held-out
  score is currently impossible - 319 of 320 test-split images are zero-byte
  files and the remaining one is missing. On the **389 usable training images**
  (fallback, explicitly training-fit only and **not** generalization):
  BLEU-1 `0.302159`, BLEU-2 `0.107995`, BLEU-3 `0.020670`, BLEU-4 `0.000000`.

## Status and known issues

- **Tokenizer / corpus truncation (root cause of low-quality captions).** The
  shipped `captions.txt` is truncated, so the tokenizer built from it maps only
  5,465 vocabulary slots against the model's 8,485 output classes. 3,020
  classes have no word, so greedy argmax can land on an unmapped index and
  `idx_to_word` returns `None`, stopping caption generation early. Live
  predictions are therefore garbled (`"to is outfit child bat on the bat"`).
  Restoring full captions requires the complete 40,455-row corpus at
  `8kdataset_full/captions.txt`; validate with
  `python model/validate_dataset.py --dataset-root 8kdataset_full`. See
  `python model/CAPTION_RECOVERY_REQUIREMENTS.md` and
  `python model/DATASET_RECOVERY.md`.
- **`CL_FD_MODEL_V2.keras` is a redundant duplicate** of `IC_MODEL.keras` (same
  architecture and weights). `IC_MODEL.keras` is the active checkpoint; the
  duplicate can be deleted. Full comparison in
  `python model/TRAINING_PIPELINE_FORENSIC_REPORT.md`.
- Detailed audits: `MODEL_BASELINE_INFO.txt`, `BLEU_EVALUATION_REPORT.txt`,
  `TOKENIZER_MISMATCH_REPORT.md`, `TOKENIZER_ARTIFACT_SEARCH_REPORT.md`.

## Project layout

```
README.md
run.bat                     Windows launcher for the Flask backend
python model/
  app.py                    Flask API (POST /predict), served on port 5000
  IC_MODEL.keras            trained decoder checkpoint
  CL_FD_MODEL_V2.keras      duplicate of the above, safe to delete
  captions.txt              caption corpus (truncated - see known issues)
  features.zip              8,091 x 4096 VGG16 features for training
  caption_reader.py         corpus loader / tokenizer
  preprocessing.py          dataset -> features pipeline
  python_implementation.py  standalone training implementation
  py_model.ipynb            training notebook
  evaluate_bleu.py          BLEU evaluation script
  validate_dataset.py       corpus-integrity validator
  requirements.txt
8kdataset/
  Images/                   8,091 image files
  captions.txt              copy of the (truncated) corpus
frontend/                   React + Tailwind web app
documentation/learnings.txt
```

## Getting started

Requirements: Python 3.11, Node.js, ~8 GB free RAM.

### Backend (Flask, port 5000)

```powershell
py -3.11 -m venv .venv
.venv\Scripts\python.exe -m pip install -r "python model\requirements.txt"
.\run.bat
```

`run.bat` sets `PYTHONUTF8=1` (required: TensorFlow's progress bar uses
U+2501, which crashes on the Windows cp1252 console) and launches
`app.py` with `use_reloader=False` so a single process is held. VGG16
ImageNet weights download on first run. The Flask app enables CORS.

### Frontend (React, port 3000)

```powershell
cd frontend
npm install
npm start        # dev server
npm run build    # production build
npm test         # test runner
```

Open `http://localhost:3000`. The Model page expects the backend at
`http://127.0.0.1:5000/predict`.

## Prediction API

`POST /predict` - multipart form field `file` (an image).

```powershell
curl.exe -F "file=@C:\path\to\image.jpg" http://127.0.0.1:5000/predict
```

| Response | HTTP | Body |
| --- | --- | --- |
| Success | 200 | `{"result": "a woman rides a bike down a rocky path"}` |
| No `file` field | 400 | `{"error": "no image file provided"}` |
| Undecodable image | 400 | `{"error": "not a valid image"}` |
| Feature extraction failure | 500 | `{"error": "error processing image"}` |

## Acknowledgements

- **Flickr8k dataset** (Hodosh et al., 2013) - training data and captions.
- **VGG16** (Simonyan & Zisserman, 2014) - ImageNet-pretrained CNN encoder.
- Built with Keras, TensorFlow, Flask, React and Tailwind CSS.