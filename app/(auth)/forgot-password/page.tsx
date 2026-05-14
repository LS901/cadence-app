import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Demo only",
  description: "Account recovery is disabled in this portfolio build.",
};

export default async function ForgotPasswordPage() {
  redirect("/sign-in");
}