import assert from "node:assert/strict";
import test from "node:test";
import { cn } from "./utils";

test("cn merges conflicting Tailwind utility classes with the later value winning", () => {
  const result = cn("px-2 text-sm", "px-4", "text-base");

  assert.equal(result, "px-4 text-base");
});

test("cn ignores falsy and conditional values while preserving valid classes", () => {
  const result = cn("rounded-md", false, null, undefined, ["bg-slate-900", "text-white"], {
    hidden: false,
    block: true,
  });

  assert.equal(result, "rounded-md bg-slate-900 text-white block");
});