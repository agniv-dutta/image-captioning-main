#!/usr/bin/env python
"""
validate_dataset.py - READ-ONLY validator for the Flickr8k assets required by
IC_MODEL.keras.

Descriptive audit + hard acceptance gates. This script NEVER writes, repairs,
downloads, converts or deletes anything. It opens files in read mode only.

Usage
-----
    .venv\\Scripts\\python.exe -B python model\\validate_dataset.py
    .venv\\Scripts\\python.exe -B python model\\validate_dataset.py --dataset-root 8kdataset_full
    .venv\\Scripts\\python.exe -B python model\\validate_dataset.py --quiet

Exit code
---------
    0  every blocking gate passed
    1  one or more blocking gates failed
    2  the dataset root / captions file could not be read at all
"""

from __future__ import annotations

import argparse
import csv
import io
import os
import pickle
import sys
import zipfile
from collections import Counter

# ---------------------------------------------------------------- expectations
# Sourced from DATASET_RECOVERY.md; traced back to py_model.ipynb and README.md.
EXP_IMAGES = 8091
EXP_CAPTIONS_PER_IMAGE = 5
EXP_CAPTION_ROWS = 40455          # 8091 * 5
EXP_UNIQUE_IDS = 8091
EXP_VOCAB_SIZE = 8485             # == IC_MODEL.keras output dimension
EXP_MAX_LENGTH = 35
EXP_FEATURE_DIM = 4096
EXP_HEADER = "image,caption"
# Authentic Flickr8k contains a handful of exact duplicate caption rows
# (4 in 15,948 here, 0.025%). Only an *excess* indicates corruption.
MAX_DUP_PAIR_RATE = 0.01

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_ROOT = os.path.join(REPO, "8kdataset")
DEFAULT_FEATURES = os.path.join(REPO, "python model", "features.zip")

IMG_EXTS = (".jpg", ".jpeg", ".png")


# --------------------------------------------------------------------- helpers
def rule(title: str) -> None:
    print("\n" + "=" * 74)
    print(title)
    print("=" * 74)


def kv(label: str, value, flag: str = "") -> None:
    suffix = f"   {flag}" if flag else ""
    print(f"  {label:<44} {value}{suffix}")


def clean_caption(cap: str) -> str:
    """Verbatim port of the notebook's clean() - both no-op replaces preserved."""
    cap = cap.lower()
    cap = cap.replace('[^A-Za-z]', '')
    cap = cap.replace('\\s+', ' ')
    return 'startseq ' + ' '.join(w for w in cap.split() if len(w) > 1) + ' endseq'


def count_pct(part: int, whole: int) -> str:
    if not whole:
        return "n/a"
    return f"{100.0 * part / whole:.2f}%"


# ------------------------------------------------------------------ image scan
def scan_images(images_dir: str) -> dict:
    res = dict(
        total=0, valid=0, zero_byte=0, corrupt=0, other_ext=0,
        empty_names=0, sample_corrupt=[], zero_kb=0,
    )
    if not os.path.isdir(images_dir):
        return res

    kb = 1024
    for name in sorted(os.listdir(images_dir)):
        path = os.path.join(images_dir, name)
        if os.path.isdir(path):
            continue
        ext = os.path.splitext(name)[1].lower()
        if ext not in IMG_EXTS:
            res["other_ext"] += 1
            continue

        res["total"] += 1
        try:
            size = os.path.getsize(path)
        except OSError:
            res["corrupt"] += 1
            continue

        if size == 0:
            res["zero_byte"] += 1
            res["zero_kb"] += 0
            continue

        try:
            from PIL import Image
            with Image.open(path) as im:
                im.verify()
            with Image.open(path) as im:
                im.load()
            res["valid"] += 1
        except Exception:
            res["corrupt"] += 1
            if len(res["sample_corrupt"]) < 5:
                res["sample_corrupt"].append(name)
    return res


# ----------------------------------------------------------------- caption scan
def scan_captions(captions_path: str) -> dict:
    res = dict(
        exists=False, size_bytes=0, physical_lines=0, header_ok=False,
        header_line="", complete_rows=0, malformed_rows=0,
        ids=[], unique_ids=0, duplicate_pairs=0, dup_pair_sample=[],
        per_image=Counter(), trailing_fragment=None, blank_rows=0,
        empty_caption_rows=0,
    )
    if not os.path.isfile(captions_path):
        return res

    res["exists"] = True
    res["size_bytes"] = os.path.getsize(captions_path)

    with open(captions_path, "r", encoding="utf-8", errors="replace") as fh:
        raw = fh.read()

    lines = raw.split("\n")
    if lines and lines[-1] == "":
        lines.pop()                      # normal trailing newline
    res["physical_lines"] = len(lines)

    if not lines:
        return res

    res["header_line"] = lines[0].strip()
    res["header_ok"] = res["header_line"].lower() == EXP_HEADER
    body = lines[1:]

    seen_pairs = set()
    # A row is complete only if it yields an id AND non-empty caption text.
    for row in body:
        stripped = row.strip()
        if not stripped:
            res["blank_rows"] += 1
            continue
        try:
            parts = next(csv.reader(io.StringIO(row)))
        except Exception:
            parts = row.split(",")

        if len(parts) < 2:
            res["malformed_rows"] += 1
            frag = stripped.replace(",", " ").strip()
            if frag:
                res["trailing_fragment"] = frag
            continue

        image_field = parts[0].strip()
        caption_field = ",".join(parts[1:]).strip()
        if not caption_field:
            res["empty_caption_rows"] += 1
            continue
        if not image_field:
            res["malformed_rows"] += 1
            continue

        key = os.path.splitext(image_field)[0]
        res["ids"].append(key)
        res["per_image"][key] += 1
        res["complete_rows"] += 1

        pair = (key, caption_field)
        if pair in seen_pairs:
            res["duplicate_pairs"] += 1
            if len(res["dup_pair_sample"]) < 5:
                res["dup_pair_sample"].append(f"{key}: {caption_field[:60]}")
        else:
            seen_pairs.add(pair)

    res["unique_ids"] = len(res["per_image"])
    res["off_count_ids"] = sum(
        1 for v in res["per_image"].values() if v != EXP_CAPTIONS_PER_IMAGE
    )
    return res


# --------------------------------------------------------------- feature scan
def scan_features(features_path: str) -> dict:
    res = dict(present=False, source="", keys=0, bad_shape=0, bad_dtype=0,
               zero_vectors=0, error="")
    if not os.path.isfile(features_path):
        res["error"] = "file not found"
        return res

    try:
        if features_path.lower().endswith(".zip"):
            res["source"] = "zip entry 'features.pkl'"
            with zipfile.ZipFile(features_path) as z:
                if "features.pkl" not in z.namelist():
                    res["error"] = "no features.pkl inside archive"
                    return res
                data = pickle.loads(z.read("features.pkl"))
        else:
            res["source"] = "plain pickle"
            with open(features_path, "rb") as fh:
                data = pickle.load(fh)

        res["present"] = True
        if not isinstance(data, dict):
            res["error"] = f"expected dict, got {type(data).__name__}"
            return res

        for k, v in data.items():
            res["keys"] += 1
            shape = getattr(v, "shape", None)
            if shape is None or len(shape) != 2 or shape[1] != EXP_FEATURE_DIM:
                res["bad_shape"] += 1
            if str(getattr(v, "dtype", "")) != "float32":
                res["bad_dtype"] += 1
            try:
                if float(abs(v).sum()) == 0.0:
                    res["zero_vectors"] += 1
            except Exception:
                pass
        res["key_set"] = set(data.keys())
    except Exception as exc:                       # noqa: BLE001 - diagnostic tool
        res["error"] = f"{type(exc).__name__}: {exc}"
    return res


# ---------------------------------------------------------- tokenizer rebuild
def rebuild_tokenizer(captions_path: str) -> dict:
    """Faithful notebook-exact tokenizer/vocab-size reconstruction.

    Uses the notebook's own parsing (line.split(',') + " ".join(tokens[1:])).
    Do NOT substitute csv.reader here: the corpus writes ' , ' as a word
    separator, and the notebook's naive split turns it into a plain space while
    csv.reader preserves it as a 1-char token that len(w) > 1 then discards.
    The two disagree by exactly one token on the longest captions, which
    changes max_length. The notebook's behaviour is the one that produced
    IC_MODEL.keras, so it is the one that must be reproduced.
    """
    out = dict(ok=False, vocab_size=None, max_length=None, captions=0,
               note="", word_index_len=None)
    if not os.path.isfile(captions_path):
        out["note"] = "captions file missing"
        return out

    try:
        from tensorflow.keras.preprocessing.text import Tokenizer
    except Exception as exc:                        # noqa: BLE001
        out["note"] = f"keras unavailable: {exc}"
        return out

    cleaned = []
    with open(captions_path, "r", encoding="utf-8", errors="replace") as fh:
        fh.readline()                               # skip 'image,caption'
        captions_doc = fh.read()

    for line in captions_doc.split("\n"):
        tokens = line.split(",")
        if len(line) < 2:
            continue
        caption = " ".join(tokens[1:])
        cleaned.append(clean_caption(caption))

    if not cleaned:
        out["note"] = "no usable captions"
        return out

    tok = Tokenizer()
    tok.fit_on_texts(cleaned)

    out["ok"] = True
    out["captions"] = len(cleaned)
    out["word_index_len"] = len(tok.word_index)
    out["vocab_size"] = len(tok.word_index) + 1
    out["max_length"] = max(len(c.split()) for c in cleaned)
    out["note"] = "notebook-exact parsing; count-ordered, ties by first occurrence"
    return out


# ------------------------------------------------------------------------ main
def main() -> int:
    ap = argparse.ArgumentParser(
        description="Read-only validator for IC_MODEL.keras dataset requirements.")
    ap.add_argument("--dataset-root", default=DEFAULT_ROOT,
                    help=f"dataset root containing images/ + captions.txt "
                         f"(default: {DEFAULT_ROOT})")
    ap.add_argument("--features", default=DEFAULT_FEATURES,
                    help="features.pkl or features.zip (default: python model/features.zip)")
    ap.add_argument("--quiet", action="store_true", help="summary only")
    args = ap.parse_args()

    root = os.path.abspath(args.dataset_root)
    images_dir = os.path.join(root, "Images")
    captions_path = os.path.join(root, "captions.txt")

    print("=" * 74)
    print("DATASET VALIDATION (read-only)")
    print("=" * 74)
    kv("dataset root", root)
    kv("images dir", images_dir)
    kv("captions file", captions_path)

    if not os.path.isdir(root):
        print(f"\nFATAL: dataset root does not exist -> {root}")
        print("       Place a recovered dataset here (see DATASET_RECOVERY.md).")
        return 2

    # ---- images
    im = scan_images(images_dir)
    if not args.quiet:
        rule("IMAGES")
    kv("total image files", im["total"], "" if im["total"] == EXP_IMAGES else "<-- EXPECTED 8091")
    kv("valid (decodable)", im["valid"], "" if im["valid"] == EXP_IMAGES else "<-- BLOCKING")
    kv("zero-byte", im["zero_byte"], "" if im["zero_byte"] == 0 else "<-- BLOCKING")
    kv("corrupt (non-zero, undecodable)", im["corrupt"], "" if im["corrupt"] == 0 else "<-- BLOCKING")
    kv("valid share", count_pct(im["valid"], im["total"]))
    if im["sample_corrupt"]:
        kv("corrupt samples", ", ".join(im["sample_corrupt"]))

    # ---- captions
    cap = scan_captions(captions_path)
    if not args.quiet:
        rule("CAPTIONS")
    if not cap["exists"]:
        kv("status", "MISSING", "<-- BLOCKING")
    else:
        kv("size", f"{cap['size_bytes']:,} bytes")
        kv("physical lines", f"{cap['physical_lines']:,}")
        kv("header", repr(cap["header_line"]), "" if cap["header_ok"] else "<-- EXPECTED 'image,caption'")
        kv("complete rows", f"{cap['complete_rows']:,}",
           "" if cap["complete_rows"] == EXP_CAPTION_ROWS else "<-- EXPECTED 40,455")
        kv("malformed / truncated rows", cap["malformed_rows"],
           "" if cap["malformed_rows"] == 0 else "<-- note")
        if cap["trailing_fragment"]:
            kv("trailing fragment", repr(cap["trailing_fragment"]))
        kv("unique IDs", f"{cap['unique_ids']:,}",
           "" if cap["unique_ids"] == EXP_UNIQUE_IDS else "<-- BLOCKING")
        kv("duplicate (id, caption) pairs", f"{cap['duplicate_pairs']:,} "
               f"({count_pct(cap['duplicate_pairs'], cap['complete_rows'])} of rows)",
           "" if cap["duplicate_pairs"] == 0
           else f"note: tolerated up to {MAX_DUP_PAIR_RATE:.0%} (authentic Flickr8k has some)")
        if cap["dup_pair_sample"]:
            kv("  duplicate samples", " | ".join(cap["dup_pair_sample"]))
        kv("IDs without exactly 5 captions", cap["off_count_ids"],
           "" if cap["off_count_ids"] == 0 else "<-- BLOCKING")

        per = cap["per_image"]
        if per:
            hist = Counter(per.values())
            kv("captions per image", f"min {min(per.values())} / max {max(per.values())}",
               "" if min(per.values()) == EXP_CAPTIONS_PER_IMAGE else "<-- EXPECTED 5")
            kv("  distribution", ", ".join(f"{c}img->{n}cap" for c, n in sorted(hist.items())))

    # ---- referential integrity
    if not args.quiet:
        rule("REFERENTIAL INTEGRITY")
    image_ids = set()
    if os.path.isdir(images_dir):
        image_ids = {
            os.path.splitext(n)[0] for n in os.listdir(images_dir)
            if os.path.splitext(n)[1].lower() in IMG_EXTS
            and os.path.isfile(os.path.join(images_dir, n))
        }
    cap_ids = set(cap["ids"]) if cap["exists"] else set()

    if not cap["exists"] or not im["total"]:
        kv("cross-check", "skipped (missing captions or images)")
        missing_images = images_no_caps = 0
    else:
        missing_images = len(cap_ids - image_ids)
        images_no_caps = len(image_ids - cap_ids)
        kv("captions with no image file", missing_images,
           "" if missing_images == 0 else "<-- BLOCKING")
        kv("images with no captions", images_no_caps,
           "" if images_no_caps == 0 else "<-- BLOCKING")

    readable_ids = set()
    if os.path.isdir(images_dir) and im["valid"]:
        from PIL import Image
        for n in sorted(os.listdir(images_dir)):
            if os.path.splitext(n)[1].lower() not in IMG_EXTS:
                continue
            p = os.path.join(images_dir, n)
            try:
                if os.path.getsize(p) == 0:
                    continue
                with Image.open(p) as t:
                    t.verify()
                readable_ids.add(os.path.splitext(n)[0])
            except Exception:
                pass
    kv("readable images with captions", len(readable_ids & cap_ids),
       "<-- need > 0 for honest held-out eval")

    # ---- split preview (sequential, as in the notebook)
    if not args.quiet:
        rule("NOTEBOOK SPLIT PREVIEW (sequential 90/10, no shuffle)")
    keys = list(dict.fromkeys(cap["ids"])) if cap["exists"] else []
    test_ids = set()
    if keys:
        cut = int(len(keys) * 0.90)
        tr, te = keys[:cut], keys[cut:]
        test_ids = set(te)
        kv("mapping keys", len(keys), "" if len(keys) == EXP_UNIQUE_IDS else "<-- EXPECTED 8091")
        kv("train / test", f"{len(tr)} / {len(te)}")
        kv("test images readable", f"{len(test_ids & readable_ids)} of {len(te)}",
           "" if len(test_ids & readable_ids) > 0 else "<-- no honest held-out set")
    else:
        kv("split", "unavailable (no captions)")

    # ---- features
    ft = scan_features(args.features)
    if not args.quiet:
        rule("PRECOMPUTED FEATURES (training-time input side)")
    kv("artifact", args.features)
    kv("source", ft["source"] or "-")
    kv("entries", f"{ft['keys']:,}", "" if ft["keys"] == EXP_IMAGES else "<-- EXPECTED 8091")
    kv(f"shape ({EXP_FEATURE_DIM}-d)", "all correct" if ft["bad_shape"] == 0 else f"{ft['bad_shape']} bad",
       "" if ft["bad_shape"] == 0 else "<-- BLOCKING")
    kv("dtype float32", "all correct" if ft["bad_dtype"] == 0 else f"{ft['bad_dtype']} bad",
       "" if ft["bad_dtype"] == 0 else "<-- BLOCKING")
    if ft.get("error"):
        kv("error", ft["error"], "<-- BLOCKING")

    # ---- tokenizer / vocab compatibility
    if not args.quiet:
        rule("TOKENIZER COMPATIBILITY WITH IC_MODEL.keras")
    tk = rebuild_tokenizer(captions_path)
    if not tk["ok"]:
        kv("status", f"unavailable - {tk['note']}", "<-- BLOCKING")
    else:
        kv("captions tokenized", f"{tk['captions']:,}")
        kv("word_index size", f"{tk['word_index_len']:,}", "")
        kv("vocab_size", f"{tk['vocab_size']:,}",
           "OK matches model" if tk["vocab_size"] == EXP_VOCAB_SIZE
           else f"<-- CRITICAL: model requires {EXP_VOCAB_SIZE}")
        kv("max_length", tk["max_length"],
           "OK matches model" if tk["max_length"] == EXP_MAX_LENGTH
           else f"<-- note: model trained at {EXP_MAX_LENGTH}")
        if tk["vocab_size"] != EXP_VOCAB_SIZE:
            delta = EXP_VOCAB_SIZE - tk["vocab_size"]
            kv("shortfall vs model", f"{delta:,} indices",
               "<-- tokenizer CANNOT drive this checkpoint")

    # ---- verdict
    gates = [
        ("G1 image count == 8091", im["total"] == EXP_IMAGES),
        ("G2 zero-byte images == 0", im["zero_byte"] == 0),
        ("G3 corrupt images == 0", im["corrupt"] == 0),
        ("G4 caption rows == 40,455", cap["complete_rows"] == EXP_CAPTION_ROWS),
        ("G5 unique IDs == 8091", cap["unique_ids"] == EXP_UNIQUE_IDS),
        ("G6 duplicate pair rate <= 1%",
         cap["complete_rows"] > 0
         and cap["duplicate_pairs"] <= MAX_DUP_PAIR_RATE * cap["complete_rows"]),
        ("G6b every ID has exactly 5 captions", cap["off_count_ids"] == 0),
        ("G7 captions without images == 0", cap["exists"] and missing_images == 0),
        ("G8 images without captions == 0", cap["exists"] and images_no_caps == 0),
        ("G9 vocab_size == 8485", bool(tk["ok"]) and tk["vocab_size"] == EXP_VOCAB_SIZE),
        ("G10 max_length == 35", bool(tk["ok"]) and tk["max_length"] == EXP_MAX_LENGTH),
        ("G11 feature coverage == 8091", ft["present"] and ft["keys"] == EXP_IMAGES
                                         and ft["bad_shape"] == 0 and ft["bad_dtype"] == 0),
        ("G12 readable held-out images > 0", bool(keys) and len(test_ids & readable_ids) > 0),
    ]

    rule("ACCEPTANCE GATES")
    failed = 0
    for name, passed in gates:
        print(f"  [{'PASS' if passed else 'FAIL'}] {name}")
        if not passed:
            failed += 1

    rule("VERDICT")
    if failed == 0:
        print("  ALL GATES PASSED - dataset is fit for retraining/evaluation.")
        print("  Next step may proceed.")
        return 0

    print(f"  {failed} of {len(gates)} BLOCKING GATES FAILED.")
    print("  STOP. Do not retrain, do not re-evaluate, do not substitute.")
    binding = [n for n, p in gates if not p]
    print("  Binding failures:")
    for n in binding:
        print(f"    - {n}")
    return 1


if __name__ == "__main__":
    sys.exit(main())