import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Demo only",
  description: "Password resets are disabled in this portfolio build.",
}

export default async function ResetPasswordPage() {
  redirect("/sign-in");
}