import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000/predict';
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 15 * 1024 * 1024;

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const cleanCaption = (raw) =>
  raw
    .split(' ')
    .filter((token) => token.trim() !== '' && token !== 'startseq' && token !== 'endseq')
    .join(' ')
    .trim();

const copyText = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

const ModelPage = () => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState('idle');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setCaption('');
    setError('');
    setCopied(false);
    setStatus('idle');
    if (inputRef.current) inputRef.current.value = '';
  };

  const acceptFile = (candidate) => {
    setError('');
    if (!candidate) return;
    if (!ACCEPTED.includes(candidate.type)) {
      setStatus('idle');
      setError('That file type is not supported. Please choose a JPG, PNG, WEBP, or GIF image.');
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setStatus('idle');
      setError('That image is larger than 15 MB. Please choose a smaller file.');
      return;
    }
    setCaption('');
    setCopied(false);
    setStatus('idle');
    setFile(candidate);
  };

  const onSelect = (e) => {
    const candidate = e.target.files?.[0];
    if (candidate) acceptFile(candidate);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const candidate = e.dataTransfer?.files?.[0];
    if (candidate) acceptFile(candidate);
  };

  const generate = async () => {
    if (!file || status === 'loading') return;
    const data = new FormData();
    data.append('file', file);
    setStatus('loading');
    setCopied(false);
    setError('');
    try {
      const response = await axios.post(API_URL, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const raw = response.data?.result;
      if (typeof raw === 'string' && raw.trim()) {
        setCaption(cleanCaption(raw));
        setStatus('success');
      } else {
        setStatus('error');
        setError('The model did not produce a caption. Please try another image.');
      }
    } catch (err) {
      const serverMsg = err?.response?.data?.error;
      setStatus('error');
      setError(
        typeof serverMsg === 'string' && serverMsg
          ? serverMsg
          : 'Something went wrong while generating the caption. Please try again later.'
      );
    }
  };

  const copyCaption = async () => {
    try {
      await copyText(caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-24 pt-28 sm:pt-32">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Image Captioning</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            Give your image a voice.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            Upload an image and generate a natural-language caption.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-2">
          {/* LEFT: upload / preview */}
          <div className="card flex flex-col justify-center p-5 sm:p-6">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={onSelect}
              className="sr-only"
              tabIndex={-1}
            />

            {!file ? (
              <div
                role="button"
                tabIndex={0}
                aria-label="Upload an image to generate a caption"
                onClick={openPicker}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openPicker();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                className={`flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors duration-200 ${
                  drag
                    ? 'border-accent bg-accent/5'
                    : 'border-line hover:border-accent/50'
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-elevated text-accent">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 16V5M12 5l-5 5M12 5l5 5" />
                    <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
                  </svg>
                </div>
                <p className="text-base font-medium text-ink">Drop an image here</p>
                <p className="text-sm text-muted">or browse from your device</p>
                <p className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-muted">
                  JPG · PNG · WEBP · GIF
                </p>
                <span className="mt-3 inline-flex items-center gap-2 rounded-lg border border-line bg-elevated px-4 py-2 text-xs font-medium text-muted transition-colors hover:border-accent/50 hover:text-accent">
                  Browse files
                </span>
              </div>
            ) : (
              <div className="animate-scale-in">
                <div className="relative overflow-hidden rounded-xl bg-elevated">
                  <img
                    src={previewUrl}
                    alt="Selected image preview"
                    className="mx-auto max-h-72 w-full object-contain"
                  />
                  <span className="absolute left-2 top-2 rounded-md bg-night/75 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-mint backdrop-blur-sm">
                    {formatBytes(file.size)}
                  </span>
                </div>
                <p className="mt-3 truncate px-1 text-sm font-medium text-ink" title={file.name}>
                  {file.name}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <button type="button" onClick={openPicker} className="btn-secondary px-4 py-2 text-xs">
                    Change image
                  </button>
                  <button type="button" onClick={reset} className="btn-ghost px-4 py-2 text-xs">
                    Remove
                  </button>
                </div>
                <button
                  type="button"
                  onClick={generate}
                  disabled={status === 'loading'}
                  className="btn-primary mt-4 w-full"
                >
                  {status === 'loading' ? (
                    <>
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-night/30 border-t-night"
                        aria-hidden="true"
                      />
                      Analyzing...
                    </>
                  ) : (
                    'Generate caption'
                  )}
                </button>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-3 text-center text-xs leading-relaxed text-danger">
                {error}
              </p>
            )}
          </div>

          {/* RIGHT: output */}
          <div className="card flex min-h-[320px] flex-col p-6">
            {status === 'idle' && (
              <div className="flex flex-1 animate-fade-up flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-elevated text-muted">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 6h16M4 12h16M4 18h10" />
                  </svg>
                </div>
                <p className="text-sm text-muted">Your generated caption will appear here.</p>
              </div>
            )}

            {status === 'loading' && (
              <div className="flex flex-1 animate-fade-up flex-col items-center justify-center gap-4 text-center">
                <span
                  className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent"
                  aria-hidden="true"
                />
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                  Analyzing image...
                </p>
                <p role="status" className="sr-only">
                  Analyzing image
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-1 animate-scale-in flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                    Generated caption
                  </p>
                  <span className="flex items-center gap-1.5 text-xs text-mint">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                    Complete
                  </span>
                </div>
                <blockquote className="flex-1 rounded-xl border border-line bg-elevated p-5">
                  <p className="text-lg leading-relaxed text-ink sm:text-xl">&ldquo;{caption}&rdquo;</p>
                </blockquote>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={copyCaption} className="btn-secondary px-4 py-2 text-xs">
                    {copied ? 'Caption copied' : 'Copy caption'}
                  </button>
                  <button type="button" onClick={reset} className="btn-ghost px-4 py-2 text-xs">
                    Upload another image
                  </button>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-1 animate-fade-up flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-danger/30 bg-elevated text-danger">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 9v4M12 17h.01" />
                    <path d="M10.3 3.9 1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
                  </svg>
                </div>
                <p className="text-sm leading-relaxed text-ink">
                  Something went wrong while generating the caption.
                </p>
                <p className="text-xs leading-relaxed text-muted">{error}</p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <button type="button" onClick={generate} className="btn-primary px-5 py-2 text-xs">
                    Try again
                  </button>
                  <button type="button" onClick={reset} className="btn-ghost px-4 py-2 text-xs">
                    Start over
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ModelPage;