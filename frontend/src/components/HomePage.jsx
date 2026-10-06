import React from 'react';
import { Link } from 'react-scroll';

const capabilities = [
  {
    title: 'Visual feature extraction',
    body: 'Extract visual information from an image.',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="9" cy="9" r="1.6" />
        <path d="M3 17l5-5 4 4 3-3 6 6" />
      </svg>
    ),
  },
  {
    title: 'Caption generation',
    body: 'Generate a natural-language description.',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  {
    title: 'Interactive inference',
    body: 'Upload an image and receive a generated caption.',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 16V5M12 5l-5 5M12 5l5 5" />
        <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
      </svg>
    ),
  },
];

const steps = [
  { title: 'Upload', body: 'Choose or drop an image from your device.' },
  { title: 'Analyze', body: 'The model extracts visual features.' },
  { title: 'Generate', body: 'A natural-language caption is produced.' },
];

function SectionHeading({ eyebrow, title, sub }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {title}
      </h2>
      {sub && <p className="mt-4 text-base leading-relaxed text-muted">{sub}</p>}
    </div>
  );
}

const StepArrow = () => (
  <svg
    className="h-5 w-5 shrink-0 rotate-90 text-accent lg:rotate-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 6l6 6-6 6" />
  </svg>
);

const HeroVisual = () => (
  <div className="relative mx-auto mt-14 w-full max-w-3xl overflow-hidden rounded-2xl border border-line bg-surface p-3 shadow-card">
    <div className="relative overflow-hidden rounded-xl bg-elevated">
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(#4ADE80 1px, transparent 1px), linear-gradient(90deg, #4ADE80 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden="true"
      />
      <div className="relative flex flex-col items-center gap-6 px-6 py-12 sm:py-16">
        <div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-xl border-2 border-accent/35 bg-night/50 sm:h-48 sm:w-48">
          <svg
            className="h-20 w-20 opacity-80"
            viewBox="0 0 64 64"
            fill="none"
            stroke="#86EFAC"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="20" cy="18" r="5" fill="#4ADE80" stroke="none" />
            <path d="M10 44 L24 30 L33 39 L41 31 L54 44" />
            <path d="M10 44 h44" />
          </svg>
          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent/70" />
        </div>
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
          Generated text
        </div>
      </div>
    </div>
  </div>
);

const HomePage = () => {
  return (
    <>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-24 pt-28 sm:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Computer Vision</p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-6xl">
              Turn images into <span className="text-accent">meaningful descriptions.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Upload an image and generate a natural-language description using the
              project&rsquo;s trained image-captioning model.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="model" smooth duration={400} offset={-90} className="btn-primary">
                Try Image Captioning
              </Link>
              <Link to="about" smooth duration={400} offset={-90} className="btn-secondary">
                Explore the Model
              </Link>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-24">
        <SectionHeading eyebrow="Capabilities" title="What the model does" />
        <div className="grid gap-4 md:grid-cols-3">
          {capabilities.map((item) => (
            <article
              key={item.title}
              className="card p-6 transition-colors duration-200 hover:border-accent/40"
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-elevated text-accent">
                {item.icon}
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-surface/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-20">
          <SectionHeading eyebrow="Workflow" title="How it works" />
          <div className="flex flex-col items-center gap-4 lg:flex-row lg:justify-center lg:gap-5">
            {steps.map((step, index) => (
              <React.Fragment key={step.title}>
                <div className="card w-full max-w-xs p-6 text-center">
                  <span className="font-mono text-xs tracking-[0.2em] text-accent">
                    0{index + 1}
                  </span>
                  <h3 className="mt-2 text-base font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
                {index < steps.length - 1 && <StepArrow />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-24 pt-20">
        <SectionHeading
          eyebrow="Architecture"
          title="CNN features and LSTM decoding"
          sub="A two-stage pipeline: visual features first, then natural-language generation."
        />
        <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-center">
          <article className="card p-6 md:flex-1">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-elevated text-accent">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M9 4v16M15 4v16M3 12h18" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink">
              CNN feature extraction
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              A VGG-16 backbone encodes each image into a compact 4096-dimension
              visual feature vector.
            </p>
          </article>
          <div className="self-center font-mono text-2xl text-accent" aria-hidden="true">
            +
          </div>
          <article className="card p-6 md:flex-1">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-elevated text-accent">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h10" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink">
              LSTM caption generation
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              A recurrent decoder turns that feature vector into a natural-language
              caption, word by word.
            </p>
          </article>
        </div>
      </section>
    </>
  );
};

export default HomePage;