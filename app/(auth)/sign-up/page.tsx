import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Demo only",
  description: "Private workspace creation is disabled in this portfolio build.",
};

export default async function SignUpPage() {
  redirect("/sign-in");
}