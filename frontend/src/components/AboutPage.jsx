import React from 'react';
import { Link } from 'react-scroll';

const pipelineNodes = [
  {
    label: 'Image',
    body: 'A single uploaded photo.',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="M3 17l5-5 4 4 3-3 6 6" />
      </svg>
    ),
  },
  {
    label: 'CNN feature extraction',
    body: 'A VGG-16 network encodes the image into visual features.',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16M15 4v16M3 12h18" />
      </svg>
    ),
  },
  {
    label: 'Feature vector',
    body: 'A 4096-dimension representation of the image content.',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 5h.01M12 5h.01M19 5h.01M5 12h.01M12 12h.01M19 12h.01M5 19h.01M12 19h.01M19 19h.01" />
      </svg>
    ),
  },
  {
    label: 'LSTM caption generation',
    body: 'A recurrent decoder writes the caption word by word.',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  {
    label: 'Generated text',
    body: 'A natural-language description of the image.',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 7h16M7 12h13M7 17h13" />
      </svg>
    ),
  },
];

const Arrow = () => (
  <svg
    className="h-5 w-5 shrink-0 rotate-90 self-center text-accent lg:rotate-0"
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

const usageSteps = [
  'Open the Model workspace.',
  'Drop an image or browse your device.',
  'Read the generated caption and copy it if needed.',
];

const AboutPage = () => {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-24 pt-28 sm:pt-32">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">About</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          About Image Captioning
        </h2>
        <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
          A computer-vision tool that turns images into natural-language descriptions.
          It combines a convolutional neural network for image understanding with a
          recurrent network for language generation.
        </p>
      </div>

      <div className="mx-auto mt-20 max-w-5xl">
        <div className="mb-10 text-center">
          <p className="eyebrow">Pipeline</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            How the model works
          </h3>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
          {pipelineNodes.map((node, index) => (
            <React.Fragment key={node.label}>
              <div className="card flex flex-1 flex-col items-start gap-3 p-5 transition-colors duration-200 hover:border-accent/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-elevated text-accent">
                  {node.icon}
                </div>
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-ink">
                    {node.label}
                  </h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{node.body}</p>
                </div>
              </div>
              {index < pipelineNodes.length - 1 && <Arrow />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-20 grid max-w-5xl gap-5 md:grid-cols-2">
        <article className="card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ink">
            What it does
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Upload any image and the system produces a short, natural-language
            description of what it shows.
          </p>
        </article>
        <article className="card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ink">
            Model architecture
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            A VGG-16 convolutional network (trained on ImageNet weights) extracts a
            4096-dimension feature vector from the image. An LSTM language decoder
            then generates the caption token by token, starting from a start marker
            and stopping at an end marker.
          </p>
        </article>
        <article className="card p-6 md:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ink">
            How to use it
          </h3>
          <ol className="mt-3 flex flex-col gap-3 md:flex-row md:justify-between">
            {usageSteps.map((step, index) => (
              <li key={step} className="flex items-start gap-3 text-sm leading-relaxed text-muted md:flex-1">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line font-mono text-xs text-accent">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </article>
      </div>

      <div className="mx-auto mt-14 max-w-5xl text-center">
        <Link to="model" smooth duration={400} offset={-90} className="btn-primary">
          Try it now
        </Link>
      </div>
    </section>
  );
};

export default AboutPage;