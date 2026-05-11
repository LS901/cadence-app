"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
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

export function SignInForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [authError, setAuthError] = useState<string | null>(null);
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: demoUser.email,
      password: demoUser.password,
    },
  });

  const onSubmit = (values: SignInValues) => {
    setAuthError(null);
    startTransition(async () => {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        redirectTo: "/dashboard",
      });

      if (result?.error) {
        setAuthError("Sign in failed. Check the demo credentials or wait a minute before trying again.");
        toast.error("Unable to sign in.");
        return;
      }

      toast.success("Welcome back to Cadence.");
      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <Card className="glass-card w-full max-w-md rounded-[32px] border-white/10 bg-card/70">
      <CardHeader className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Secure entry
        </p>
        <CardTitle className="text-3xl text-foreground">Sign in to Cadence</CardTitle>
        <CardDescription className="text-sm leading-7 text-muted-foreground">
          Use the seeded demo credentials to enter the MVP while PostgreSQL data seeding is being wired.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email ? (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...form.register("password")} />
            {form.formState.errors.password ? (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          {authError ? <p className="text-sm text-destructive">{authError}</p> : null}

          <Button className="h-11 w-full rounded-full" disabled={isPending} type="submit">
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Continue to dashboard
          </Button>
        </form>

        <div className="mt-6 rounded-3xl border border-border/70 bg-background/70 p-4 text-sm leading-7 text-muted-foreground">
          <p className="font-medium text-foreground">Demo credentials</p>
          <p>{demoUser.email}</p>
          <p>{demoUser.password}</p>
        </div>

        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          The root route redirects into the protected app shell. If you sign out, you&apos;ll return here.
        </p>

        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Review the <Link className="underline underline-offset-4" href="/privacy">privacy notes</Link> for this public demo before sharing personal reflections in the app.
        </p>
      </CardContent>
    </Card>
  );
}