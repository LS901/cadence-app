# Cadence

Cadence is a portfolio-first concept product exploring how mood, routines, planning, life context, and reflection could live inside one calm behavioural analytics experience.

The project is intentionally positioned as a polished product-design and frontend-engineering showcase rather than a launch-stage SaaS. The goal is to make viewers feel like they are moving through a believable, emotionally intelligent startup product while keeping the work grounded in real interaction design, real architecture, and authored mock data.

## What the project demonstrates

- a weekly review loop that turns capture into interpretation and next-step planning
- a joined-up product model across mood, habits, journal, planner, and life context
- trust-aware insight framing that makes room for uncertainty and confounding context
- a premium public surface that feels like a real product, even while remaining concept-first

## Current positioning

Cadence should be read as:

- a conceptual product
- a frontend and product-engineering showcase
- a UX and UI exploration
- a behavioural analytics prototype
- a flagship portfolio project

Cadence should not be read as:

- a production medical or wellbeing platform
- a real-user analytics business
- a fully commercialized SaaS optimizing for pricing and growth

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS and shared UI primitives
- Prisma with PostgreSQL
- Auth.js credentials auth
- Recharts and Framer Motion

## Local development

Run the app from the repository root:

```bash
npm run dev
```

For local auth flows, make sure `APP_BASE_URL` or `NEXTAUTH_URL` point at the dev host you are using.

## Validation

- `npm run lint`
- `npm run build`
- `npm run test:stage1`
- `npm run test:stage2`
- `npm run test:stage3`
- `npm run test:stage4`

See `testing-plan.md` for the staged automated strategy and `manual-qa-plan.md` for manual coverage.

## Auth email setup

Cadence uses a shared demo login in this portfolio build. Private account creation and recovery flows are intentionally disabled.

You only need auth email configuration if you later reintroduce private-account flows:

- `APP_BASE_URL` or `NEXTAUTH_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`

In non-production environments, auth email can fall back to local preview links instead of SMTP if those flows are turned back on.
