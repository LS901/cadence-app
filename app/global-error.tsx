"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { CadenceMark } from "@/components/layout/cadence-mark";
import { Button } from "@/components/ui/button";

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
        <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="panel-surface w-full max-w-2xl rounded-[32px] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-[20px] border border-border/40 bg-background/55">
                <CadenceMark className="size-8" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                  Cadence system fallback
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  Cadence needs a fresh restart.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                  A top-level error interrupted the app shell. Try reloading the application first. If the issue persists, reopen Cadence and return to your last task.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-border/40 bg-background/40 p-4 text-sm leading-6 text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground">
                <AlertTriangle className="size-4 text-primary" />
                <span className="font-medium">Fallback guidance</span>
              </div>
              <p className="mt-3">
                This view appears when a root-level route or layout fails. Retrying from here is safer than leaving the user on a generic framework error screen.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button className="rounded-full" onClick={reset}>
                <RefreshCcw className="size-4" />
                Retry app
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => window.location.assign("/")}
              >
                Go to home
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}