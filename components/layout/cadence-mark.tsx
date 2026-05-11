import { cn } from "@/lib/utils";

type CadenceMarkProps = {
  className?: string;
};

export function CadenceMark({ className }: CadenceMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("size-8", className)}
      fill="none"
    >
      <defs>
        <linearGradient id="cadence-mark-gradient" x1="10" y1="12" x2="54" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="color-mix(in oklch, var(--chart-2) 82%, white 18%)" />
          <stop offset="100%" stopColor="color-mix(in oklch, var(--primary) 88%, white 12%)" />
        </linearGradient>
      </defs>
      <path
        d="M47.5 17.5A22 22 0 1 0 48 46"
        stroke="url(#cadence-mark-gradient)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M20 46.5h23"
        stroke="url(#cadence-mark-gradient)"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M23 39.5h20"
        stroke="url(#cadence-mark-gradient)"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.72"
      />
      <path
        d="M26.5 32.5h16.5"
        stroke="url(#cadence-mark-gradient)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.58"
      />
      <circle cx="49.5" cy="17.5" r="3.5" fill="url(#cadence-mark-gradient)" />
    </svg>
  );
}