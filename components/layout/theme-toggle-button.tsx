"use client";

import type { ComponentProps } from "react";
import { useSyncExternalStore } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeToggleButtonProps = {
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
};

export function ThemeToggleButton({
  className,
  variant = "outline",
  size = "icon",
}: ThemeToggleButtonProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const isDark = isMounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("rounded-full", className)}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
    </Button>
  );
}