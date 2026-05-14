"use client";

import Link from "next/link";
import { useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { demoUser } from "@/lib/data/mock-cadence";
import { signInSchema, type SignInValues } from "@/lib/validation/auth";

function subscribeToHydration() {
  return () => {};
}

export function SignInForm() {
  const router = useRouter();
  const isReady = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [isPending, startTransition] = useTransition();
  const dashboardHref = "/dashboard?entry=guided-demo";
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: demoUser.email,
      password: demoUser.password,
    },
  });

  const onSubmit = (values: SignInValues) => {
    startTransition(async () => {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl: dashboardHref,
      });

      if (result?.error) {
        toast.error("Unable to open the shared demo.");
        return;
      }

      toast.success("Opening the shared demo.");
      router.push(dashboardHref);
      router.refresh();
    });
  };

  return (
    <Card className="glass-card w-full max-w-md rounded-[32px] border-white/10 bg-card/70">
      <CardHeader className="space-y-3">
        <p className="font-geist text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Secure entry
        </p>
        <CardTitle className="text-3xl text-foreground">Open the Cadence demo</CardTitle>
        <CardDescription className="text-sm leading-7 text-muted-foreground">
          The shared demo workspace is prefilled so you can move straight into the weekly review and planner handoff.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 rounded-3xl border border-border/70 bg-background/70 p-4 text-sm leading-7 text-muted-foreground">
          <p className="font-medium text-foreground">Read-only shared workspace</p>
          <p className="mb-3">
            Start with the shared account below, land in the dashboard weekly review, and follow the planner carry-forward step to see the strongest product story.
          </p>
          <p className="font-mono text-xs">{demoUser.email}</p>
          <p className="font-mono text-xs mt-1">{demoUser.password}</p>
          <p className="mt-4 text-[13px] leading-6 text-muted-foreground">
            Account creation is intentionally disabled for this read-only portfolio demonstration.
          </p>
        </div>

        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              defaultValue={demoUser.email}
              readOnly
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              defaultValue={demoUser.password}
              readOnly
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          <Button
            className="h-11 w-full rounded-full"
            disabled={!isReady || isPending}
            onClick={form.handleSubmit(onSubmit)}
            type="button"
          >
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Open guided demo
          </Button>
        </form>

        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          The demo path opens directly into the protected app shell. If you sign out, you&apos;ll return here.
        </p>

        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Review the <Link className="underline underline-offset-4 hover:text-foreground" href="/privacy">privacy notes</Link> to read more about this statelessly-mocked architecture.
        </p>
      </CardContent>
    </Card>
  );
}