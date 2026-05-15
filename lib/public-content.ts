import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "@/lib/site-config";

export const projectOwner = {
  contactEmail: "lewissaunders.dev@gmail.com",
  portfolioUrl: "https://lewissaunders.dev",
  portfolioLabel: "lewissaunders.dev",
} as const;

export type PublicFeaturePage = {
  slug: string;
  name: string;
  navLabel: string;
  title: string;
  description: string;
  summary: string;
  hero: string;
  primaryKeyword: string;
  outcomes: string[];
  sections: Array<{
    title: string;
    body: string;
  }>;
};

export const publicFeaturePages: PublicFeaturePage[] = [
  {
    slug: "mood-tracking",
    name: "Mood tracking",
    navLabel: "Mood tracking",
    title: "Mood tracking as part of a calmer reflection system",
    description:
      "Explore a concept surface for low-friction mood capture, fuller reflection, and weekly interpretation inside the Cadence product demo.",
    summary:
      "A concept surface for quick capture, context, and reflective review.",
    hero:
      "In Cadence, mood tracking is not treated like an isolated scorecard. The surface is designed to move from a quick emotional baseline into richer reflection, and then into a weekly read that stays grounded in lived context.",
    primaryKeyword: "mood tracking app",
    outcomes: [
      "Capture a fast score when the day is busy, then return for a fuller reflection.",
      "Track mood with notes, context, and weekly summaries instead of isolated numbers.",
      "Use repeated daily entries to see whether a shift is real or just noise.",
    ],
    sections: [
      {
        title: "Quick capture first, depth when the day allows",
        body:
          "Cadence treats fast logging as a legitimate first move. A lightweight score can hold onto the signal now, while a fuller reflection later gives that signal enough texture to become useful.",
      },
      {
        title: "Context matters as much as the score",
        body:
          "Life events, sleep patterns, planner follow-through, and journal reflections can all shape how a day feels. Cadence keeps those adjacent inputs close so mood is interpreted in context.",
      },
      {
        title: "Weekly reviews turn entries into a story",
        body:
          "Instead of treating each day as a verdict, Cadence rolls recent mood signals into a weekly synthesis that surfaces momentum, context, and what is worth testing or carrying forward.",
      },
    ],
  },
  {
    slug: "habit-tracking",
    name: "Habit tracking",
    navLabel: "Habit tracking",
    title: "Habit tracking designed to support reflection, not pressure",
    description:
      "Explore how Cadence treats routine data as behavioural context inside a premium product concept instead of reducing the experience to streak mechanics.",
    summary:
      "Routine tracking presented as behavioural signal, not streak theater.",
    hero:
      "Cadence treats habits as one layer inside a joined-up reflection loop. You can log what happened, compare it with mood and planning data, and keep routines visible without letting streak pressure dominate the experience.",
    primaryKeyword: "habit tracking app",
    outcomes: [
      "Log routines with enough consistency to compare them against mood and planner completion.",
      "Review whether supportive routines are strengthening your baseline over time.",
      "Keep friction low so the tracking system itself does not become another habit to fail.",
    ],
    sections: [
      {
        title: "Track routines that actually influence your week",
        body:
          "Cadence is designed around routines that shape energy, stability, and focus. That makes the habit layer useful as behavioural input, not just as a list of boxes to tick.",
      },
      {
        title: "Useful streaks, not streak worship",
        body:
          "The goal is not to manufacture guilt when a day breaks. Cadence helps you notice what happened, where routines slipped, and whether the broader pattern is still moving in a useful direction.",
      },
      {
        title: "Connect routine data to the rest of life",
        body:
          "Habits live alongside mood reflections, journal entries, and planning behavior so you can see whether a routine is helping in practice instead of assuming that it should.",
      },
    ],
  },
  {
    slug: "reflective-journaling",
    name: "Reflective journaling",
    navLabel: "Reflective journaling",
    title: "Reflective journaling that remains part of the product story",
    description:
      "See how Cadence keeps journaling close to mood, habit, and planning context so narrative reflection still has product value later.",
    summary:
      "Narrative reflection that still matters during review, not just while writing.",
    hero:
      "Cadence gives journaling a real role in the system. Narrative notes stay close to mood shifts, routines, and planning patterns, so reflection can inform decisions instead of disappearing into a detached archive.",
    primaryKeyword: "reflective journaling app",
    outcomes: [
      "Write entries that still make sense when you revisit them later.",
      "Use journal context to support or challenge the patterns suggested by your metrics.",
      "Carry useful themes forward into planning and weekly review.",
    ],
    sections: [
      {
        title: "Narrative helps the numbers stay honest",
        body:
          "Quantitative tracking is useful, but it can flatten a week too aggressively. Journal entries preserve texture, nuance, and the kind of detail that explains why two similar scores might mean different things.",
      },
      {
        title: "Reflection belongs inside the review loop",
        body:
          "Cadence is built so journal notes can sit near mood summaries and planning follow-through, which makes weekly review more grounded and less abstract.",
      },
      {
        title: "A calmer place to notice recurring themes",
        body:
          "Over time, reflective notes can reveal repeating tensions, supportive conditions, and language patterns that would be hard to catch from checklists alone.",
      },
    ],
  },
  {
    slug: "behavioral-insights",
    name: "Behavioral insights",
    navLabel: "Behavioral insights",
    title: "Behavioural insight surfaces for private pattern discovery",
    description:
      "Explore how Cadence frames joined-up signals from mood, habits, journaling, and planning as a trust-aware product concept rather than a diagnostic system.",
    summary:
      "A trust-aware interpretation layer built around uncertainty, context, and next-step experiments.",
    hero:
      "Cadence is designed to help you notice whether a pattern is emerging, what context might be shaping it, and what is worth testing next. The experience is framed as reflective analytics, not diagnosis.",
    primaryKeyword: "personal insights app",
    outcomes: [
      "See recent patterns without pretending every correlation is truth.",
      "Bring mood, routines, journal context, and planning behavior into one review surface.",
      "Leave each review with one practical next step instead of a vague sense of being tracked.",
    ],
    sections: [
      {
        title: "Pattern discovery should stay humble",
        body:
          "Cadence does not promise certainty from small amounts of data. The review language is meant to highlight signals, caveats, and useful next checks rather than overclaiming.",
      },
      {
        title: "Weekly reviews create the product payoff",
        body:
          "The product aims to turn recent activity into a readable weekly synthesis. That gives you a clearer way to carry one theme, one routine, or one hypothesis into the next week.",
      },
      {
        title: "Private reflection remains the core value",
        body:
          "The point of the insights layer is to support self-awareness. It exists to help you interpret your own rhythms, not to score you or replace thoughtful judgment.",
      },
    ],
  },
];

export const useCases = [
  {
    title: "Reflection can feel premium instead of clinical",
    description:
      "Cadence explores a calmer visual language for private self-observation, with enough polish to feel like a funded product rather than a utility dashboard.",
  },
  {
    title: "Joined-up products tell better behavioural stories",
    description:
      "The concept is strongest when mood, routines, planning, context, and journaling stop behaving like separate apps and start reading like one coherent system.",
  },
  {
    title: "Insight interfaces should show uncertainty honestly",
    description:
      "Cadence uses context, evidence levels, and softer language to show how analytics products can feel intelligent without pretending to know too much.",
  },
] as const;

export const trustLinks = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
] as const;

export function getPublicFeaturePage(slug: string) {
  return publicFeaturePages.find((page) => page.slug === slug) ?? null;
}

export function createPublicMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: path,
      images: [
        {
          url: absoluteUrl("/opengraph-image"),
          width: 1200,
          height: 630,
          alt: "Cadence calm analytics and reflective tracking preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [absoluteUrl("/twitter-image")],
    },
  };
}

export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: absoluteUrl("/"),
    description: siteConfig.description,
    logo: absoluteUrl("/icon.svg"),
    sameAs: [],
  };
}

export function getWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: absoluteUrl("/"),
    description: siteConfig.description,
    inLanguage: "en",
  };
}