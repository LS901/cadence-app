Planner:
- Planner would look cleaner I think if the calendar was on one row and the other components were displayed below it
- For activtities where the start date is in the future, there shouldn't be a completed button
- Upon clicking complete, a small dialog should appear where the user can put in the mood score there
- When adding activites, there should be a prepopulated list of activtities that have been done before, if it's a new one you should have the option to add it. If we do this, it will be easier to keep track of when an activity is done several times and there are several mood scores attached to it. creating more accurate insights. For example, I want to do yoga, i complete it and give it a mood score of 80, next week i want to do yoga again, when i go to add it as an activity it should be an option in the dropdown where, in the BE, there is a mood score of 80 attached to it, if I then put 70 for this one, the overall average is 75, if that makes sense
- You shouldn't have the option to put a mood score into adding an activity as it hasn't been done it yet. However, we can add a seperate button like 'add retrospective activity' where this exists.
-Clicking on 'keep this activity recurring' doesn't seem to allow the user to add more information like 'daily, weekly, custom' etc

General:
-Complete the day dialog, we get ebs and flows of mood without the day, we should allow the user to input some sort of quantitative data that says for example: 'between 9am - 11am had a high mood of 80'. 'between 1-4pm i dipped with a mood of 40' etc. Then on the BE using statistical models we should use this and compare it against activites/habits that were done throughout the day and see if there is a link, this will help provide very useful insights. We should maybe look at previous days aswell, for example 'your mood was low today becuase you drank alcohol yesterday'

- We need to add 'events' for things that aren't linked to an activity or a habit that could affect mood. E.g. sickness, family greivance along those lines. As if we do exercise on the same day that we're sick, mood will be low but that will be due too the sickness not the exercise neccessarily, so we need to be careful as this can skew the insights.

- We are going to need state management for both client and server

Life Events / Context system:
- Product framing: expose this as `Context` or `Life context` in the UI, while keeping `LifeEvent` as the internal domain model.
- Primary goal: treat meaningful external events as confounders and contextual modifiers in the insights engine rather than as behavioural actions.

Implementation plan:
1. Data model
- Add `LifeEvent`, `LifeEventSeries`, and `LifeEventDayExposure` to Prisma.
- Support title, category, optional custom category label, description, severity, sentiment, start/end timestamps, ongoing state, tags, recurrence linkage, and analytics-ready daily exposure rows.
- Extend `InsightMetric` with `LIFE_EVENT_TO_MOOD`, while keeping context-adjusted behavioural insights in payload metadata first.

2. Analytics scaffolding
- Extend `server/insights/types.ts` with `AnalyticsLifeEvent` and daily context fields such as `negativeLifeEventLoad`, `positiveLifeEventLoad`, `totalLifeEventLoad`, `activeLifeEventCount`, `confoundedDay`, and context tags/categories.
- Update `server/insights/analysis.ts` to project interval events onto daily mood rows using day overlap, severity, and sentiment.
- Lower candidate confidence when the exposure is concentrated on confounded days, without discarding the behavioural signal entirely.

3. Server surface
- Add `server/life-events/queries.ts` and `server/life-events/actions.ts` following the same auth + mock fallback pattern as habits, journal, and settings.
- Start with interval CRUD plus optional recurring series creation, but defer auto-generation rules until the first slice is stable.
- Integrate life-event reads into `server/insights/queries.ts`, `server/dashboard/queries.ts`, and `server/mood/queries.ts` once the schema is generated.

4. Feature UI
- Add `features/life-events/types.ts` and `features/life-events/components/life-events-workspace.tsx`.
- First UX surface should stay light: preset context chips, optional title/description, calm severity labels, ongoing toggle, and a timeline-style list.
- Surface contextual markers on mood and journal charts before building a full dedicated history workspace.

5. Insight UX
- Add payload metadata for `confoundedDayShare`, dominant life-event categories, and adjusted-vs-raw correlation.
- Insight copy should stay human and non-clinical, for example: `Exercise remains mildly positive overall, but its lift is reduced during illness-heavy days.`
- Avoid diagnosis-like language and avoid implying that life context invalidates healthy behaviours.

6. Build phases
- Phase 1: schema + analytics row scaffolding + mock data shape.
- Phase 2: CRUD UI for context logging.
- Phase 3: context-aware confidence and first direct life-event insights.
- Phase 4: contextual overlays in mood, insights, and dashboard.
- Phase 5: recurring events, richer adjustment models, and long-window analysis.

Outstanding follow-ups after current implementation:
- Add a dedicated `Context` management surface so life events are not only created from insights; users should be able to review, edit, filter, and understand their full context history in one place.
- Add recurring life-event authoring and editing on top of the existing series/domain model, including clear controls for ongoing events, future occurrences, and series-level edits.
- Improve the analytics model beyond `confoundedDayShare` by showing adjusted vs raw relationships more explicitly and using longer-window analysis where there is enough data.
- Add a scheduled/backfill mechanism for `LifeEventDayExposure` so ongoing or future-spanning events stay accurate without relying only on create/update mutations.
- Surface context more deeply in journal and planner flows, especially when creating or editing entries, so users can attach or review same-day context without needing to infer it after the fact.
- Add focused tests for life-event overlap mapping, exposure syncing, and context-aware insight calculations so later analytics changes do not silently regress the model.

- seo optimisation [X]
- sonarqube []
- testing [X]
- 9 pillars [X]
- figure out costing to run [X]
- potential law/gdpr? [X]
- fix ui on light mode (also need to add the switch to landing page) [X]
- mobile [X]
- manual QA plan [X]
- logo design [X]
- setup Brevo [X]
- change side bars to modals/overlays [X]
- need to remove the private workspace entireley [X]