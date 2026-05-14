export type MockScenarioKey = "flagship" | "alternate";

export const defaultMockScenario: MockScenarioKey = "flagship";

export const mockScenarioOptions = [
  {
    key: "flagship",
    label: "Recovery through routine",
    shortLabel: "Flagship story",
    summary: "Travel disruption and lingering cold symptoms make it clear that movement and routine are restoring the baseline.",
  },
  {
    key: "alternate",
    label: "Boundaries after overload",
    shortLabel: "Alternate story",
    summary: "A compressed work sprint and crowded stretch show how sleep, quieter evenings, and lower input rebuild steadiness.",
  },
] as const satisfies Array<{
  key: MockScenarioKey;
  label: string;
  shortLabel: string;
  summary: string;
}>;

export function normalizeMockScenario(value: string | null | undefined): MockScenarioKey {
  return value === "alternate" ? "alternate" : defaultMockScenario;
}

export function getMockScenarioOption(key: MockScenarioKey) {
  return mockScenarioOptions.find((option) => option.key === key) ?? mockScenarioOptions[0]!;
}