"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="panel-surface w-full max-w-2xl rounded-[32px] p-6 sm:p-8">
            <p className="font-geist text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              Cadence system fallback
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Cadence needs a fresh restart.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              A top-level error interrupted the app shell. Try reloading the application first. If the issue persists, reopen Cadence and return to your last task.
            </p>

            <div className="mt-6 rounded-[24px] border border-border/40 bg-background/40 p-4 text-sm leading-6 text-muted-foreground">
              This view appears when a root-level route or layout fails. Retrying from here is safer than leaving the user on a generic framework error screen.
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-primary/15 bg-primary/92 px-3.5 text-sm font-medium text-primary-foreground shadow-[0_10px_30px_color-mix(in_srgb,var(--primary)_24%,transparent),inset_0_1px_0_rgba(255,255,255,0.18)] transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200 hover:-translate-y-0.5 hover:bg-primary"
                onClick={reset}
              >
                Retry app
              </button>
              <button
                type="button"
                className="panel-surface inline-flex h-9 items-center justify-center rounded-full border border-border/45 px-3.5 text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200 hover:-translate-y-0.5 hover:bg-card/90 hover:text-foreground"
                onClick={() => window.location.assign("/")}
              >
                Go to home
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}