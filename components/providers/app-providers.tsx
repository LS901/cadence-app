"use client";

import * as React from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

type AppProvidersProps = {
  children: React.ReactNode;
};

function ThemedToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      position="top-right"
      richColors
      theme={resolvedTheme === "light" ? "light" : "dark"}
      toastOptions={{
        classNames: {
          toast: "w-[calc(100vw-2rem)] max-w-full border-border bg-card text-card-foreground sm:w-auto",
        },
      }}
    />
  );
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      disableTransitionOnChange
      enableSystem
    >
      <TooltipProvider>
        {children}
        <ThemedToaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}