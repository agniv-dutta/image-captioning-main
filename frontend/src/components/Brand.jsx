export function BrandMark({ size = 26 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="14" fill="#171C19" />
      <rect
        x="1"
        y="1"
        width="62"
        height="62"
        rx="13"
        stroke="#26312B"
        strokeWidth="2"
      />
      <rect x="18" y="20" width="28" height="24" rx="4" stroke="#4ADE80" strokeWidth="3" />
      <circle cx="27" cy="28" r="3" fill="#86EFAC" />
      <path
        d="M21 42 L29 33 L35 38 L41 30 L45 42"
        stroke="#86EFAC"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}