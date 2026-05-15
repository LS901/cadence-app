"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { CadenceMark } from "@/components/layout/cadence-mark";
import { Button } from "@/components/ui/button";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="panel-surface w-full max-w-2xl rounded-[32px] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-[20px] border border-border/40 bg-background/55">
            <CadenceMark className="size-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-geist text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              Cadence recovery
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Something slipped out of rhythm.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              This part of the app hit an unexpected problem. Your data has not been intentionally cleared, and you can try this view again without leaving the app.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-border/40 bg-background/40 p-4 text-sm leading-6 text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="size-4 text-primary" />
            <span className="font-medium">What to do next</span>
          </div>
          <p className="mt-3">
            Retry this route first. If the problem persists, refresh the page or move back to another area of Cadence and try again.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button className="rounded-full" onClick={reset}>
            <RefreshCcw className="size-4" />
            Try again
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => window.location.assign("/dashboard")}
          >
            Return to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}