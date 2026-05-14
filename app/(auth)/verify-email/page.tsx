import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Demo only",
  description: "Email verification is disabled in this portfolio build.",
}

export default async function VerifyEmailPage() {
  redirect("/sign-in");
}