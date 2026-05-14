type CadencePreviewMarkProps = {
  width: number;
  height: number;
};

export function CadencePreviewMark({ width, height }: CadencePreviewMarkProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 167 182"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M145.569 149.5C131.277 162.838 112.092 171 91 171C46.8172 171 11 135.183 11 91C11 46.8172 46.8172 11 91 11C110.667 11 128.676 18.0966 142.607 29.8687"
        stroke="url(#cadence-preview-gradient)"
        strokeWidth="22"
      />
      <circle cx="156.069" cy="91.5" r="10.5" fill="#9DDCB0" />
      <defs>
        <linearGradient
          id="cadence-preview-gradient"
          x1="78.2846"
          y1="11"
          x2="78.2846"
          y2="171"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A8E6B7" />
          <stop offset="1" stopColor="#2E7D6B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

type PreviewPillProps = {
  label: string;
};

export function PreviewPill({ label }: PreviewPillProps) {
  return (
    <div
      style={{
        borderRadius: "999px",
        padding: "12px 22px",
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.14)",
        fontSize: "24px",
      }}
    >
      {label}
    </div>
  );
}