import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  createPublicMetadata,
  getPublicFeaturePage,
  publicFeaturePages,
} from "@/lib/public-content";

type FeatureDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return publicFeaturePages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: FeatureDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getPublicFeaturePage(slug);

  if (!page) {
    return {};
  }

  return createPublicMetadata({
    title: page.name,
    description: page.description,
    path: `/features/${page.slug}`,
  });
}

export default async function FeatureDetailPage({ params }: FeatureDetailPageProps) {
  const { slug } = await params;
  const page = getPublicFeaturePage(slug);

  if (!page) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <section className="space-y-5 rounded-[32px] border border-border/40 bg-card/60 p-8 sm:p-10">
          <Link href="/features" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to features
          </Link>
          <p className="font-geist text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            {page.primaryKeyword}
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            {page.title}
          </h1>
          <p className="max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
            {page.hero}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/sign-in" className={buttonVariants({ className: "rounded-full" })}>
              Open the demo <ArrowRight className="ml-2 size-4" />
            </Link>
            <Link
              href="/features"
              className={buttonVariants({
                variant: "outline",
                className: "rounded-full border-border/40 bg-transparent",
              })}
            >
              Back to concept surfaces
            </Link>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {page.outcomes.map((outcome) => (
            <article key={outcome} className="rounded-[24px] border border-border/40 bg-muted/30 p-5 text-sm leading-7 text-muted-foreground">
              {outcome}
            </article>
          ))}
        </section>

        <section className="grid gap-6">
          {page.sections.map((section) => (
            <article key={section.title} className="glass-card rounded-[28px] border border-border/40 bg-card/55 p-7 sm:p-8">
              <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground sm:text-base">
                {section.body}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}