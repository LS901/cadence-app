"use client";

import { useMemo, useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Database, Globe2, MonitorCog, Save, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { PageIntro } from "@/features/shared/components/page-intro";
import type { SettingsSurface } from "@/features/settings/types";
import {
  HOME_FOCUS_OPTIONS,
  SETTINGS_STORAGE_KEYS,
  TIMEZONE_OPTIONS,
  WEEK_START_OPTIONS,
  type HomeFocusValue,
  type WeekStartValue,
} from "@/lib/settings";
import { cn } from "@/lib/utils";
import { updateSettingsProfileAction } from "@/server/settings/actions";

type SettingsWorkspaceProps = {
  data: SettingsSurface;
};

type ProfileFormState = {
  name: string;
  timezone: (typeof TIMEZONE_OPTIONS)[number];
};

function createProfileFormState(data: SettingsSurface): ProfileFormState {
  return {
    name: data.profile.name,
    timezone: data.profile.timezone,
  };
}

function subscribeToWindowStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
  };
}

function subscribeToClientSnapshot() {
  return () => {};
}

function getSavedWeekStartsOn(): WeekStartValue {
  const savedWeekStart = window.localStorage.getItem(SETTINGS_STORAGE_KEYS.weekStartsOn);

  return savedWeekStart === "sunday" || savedWeekStart === "monday"
    ? savedWeekStart
    : "monday";
}

function getSavedHomeFocus(): HomeFocusValue {
  const savedHomeFocus = window.localStorage.getItem(SETTINGS_STORAGE_KEYS.homeFocus);

  return savedHomeFocus === "dashboard" ||
    savedHomeFocus === "planner" ||
    savedHomeFocus === "journal" ||
    savedHomeFocus === "mood"
    ? savedHomeFocus
    : "dashboard";
}

function PreferenceButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "justify-start rounded-full border-border/40 bg-transparent px-4",
        active && "border-primary/40 bg-primary/10 text-primary"
      )}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

export function SettingsWorkspace({ data }: SettingsWorkspaceProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [optimisticData, setOptimisticData] = useOptimistic(data);
  const profileDefaults = useMemo(() => createProfileFormState(data), [data]);
  const [profileState, setProfileState] = useState(() => createProfileFormState(data));
  const storedWeekStartsOn = useSyncExternalStore<WeekStartValue>(
    subscribeToWindowStorage,
    getSavedWeekStartsOn,
    () => "monday"
  );
  const storedHomeFocus = useSyncExternalStore<HomeFocusValue>(
    subscribeToWindowStorage,
    getSavedHomeFocus,
    () => "dashboard"
  );
  const isClientReady = useSyncExternalStore(
    subscribeToClientSnapshot,
    () => true,
    () => false
  );
  const [weekStartsOnDraft, setWeekStartsOn] = useState<WeekStartValue | null>(null);
  const [homeFocusDraft, setHomeFocus] = useState<HomeFocusValue | null>(null);
  const weekStartsOn = weekStartsOnDraft ?? storedWeekStartsOn;
  const homeFocus = homeFocusDraft ?? storedHomeFocus;
  const activeTheme = isClientReady ? (resolvedTheme ?? "system") : null;

  const connectedSurfaceCount = useMemo(() => {
    return (
      optimisticData.summary.activityCount +
      optimisticData.summary.habitCount +
      optimisticData.summary.moodEntryCount +
      optimisticData.summary.journalEntryCount +
      optimisticData.summary.insightCount
    );
  }, [optimisticData.summary]);

  function handleSubmitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (optimisticData.dataSource === "mock") {
      toast.info("Profile saving is disabled in mock preview mode.");
      return;
    }

    const submittedState = { ...profileState };
    const previousData = optimisticData;

    startTransition(async () => {
      setOptimisticData((current) => ({
        ...current,
        profile: {
          ...current.profile,
          name: submittedState.name,
          timezone: submittedState.timezone,
          updatedLabel: "Just now",
        },
      }));

      try {
        await updateSettingsProfileAction(submittedState);
        toast.success("Settings updated.");
        setProfileState(submittedState);
        router.refresh();
      } catch (error) {
        setOptimisticData(previousData);
        setProfileState(profileDefaults);
        toast.error(error instanceof Error ? error.message : "Unable to update settings.");
      }
    });
  }

  function handleSaveLocalDefaults() {
    window.localStorage.setItem(SETTINGS_STORAGE_KEYS.weekStartsOn, weekStartsOn);
    window.localStorage.setItem(SETTINGS_STORAGE_KEYS.homeFocus, homeFocus);
    toast.success("Saved on this device.");
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <PageIntro
          eyebrow="Settings"
          title="Shape the app around your actual context."
          description="Keep your identity, timezone, and device defaults aligned so every page can interpret your data with the right frame instead of guessing."
        />
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="rounded-full border-border/40 px-3 py-1 text-[11px] uppercase tracking-[0.22em]">
            {optimisticData.dataSource === "mock" ? "Mock preview" : "Database connected"}
          </Badge>
          <Badge variant="outline" className="rounded-full border-border/40 px-3 py-1 text-[11px] uppercase tracking-[0.22em]">
            {connectedSurfaceCount} tracked records
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[28px] border-border/40 bg-card/70">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Account timezone</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              {optimisticData.profile.timezone}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-border/40 bg-card/70">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Joined Cadence</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              {optimisticData.profile.joinedLabel}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-border/40 bg-card/70">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Last profile update</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              {optimisticData.profile.updatedLabel}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-border/40 bg-card/70">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Insights generated</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              {optimisticData.summary.insightCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardHeader>
            <div className="flex items-center gap-3">
              <UserRound className="size-5 text-primary" />
              <div>
                <CardDescription>Profile</CardDescription>
                <CardTitle className="text-2xl text-foreground">Core identity and time context</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmitProfile}>
              <div className="space-y-2">
                <Label htmlFor="settingsName">Name</Label>
                <Input
                  id="settingsName"
                  value={profileState.name}
                  onChange={(event) =>
                    setProfileState((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Lewis Cadence"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settingsEmail">Email</Label>
                <Input id="settingsEmail" value={optimisticData.profile.email} readOnly disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settingsTimezone">Timezone</Label>
                <select
                  id="settingsTimezone"
                  className="flex h-11 w-full rounded-2xl border border-border/40 bg-background px-4 text-sm outline-none transition focus:border-primary/40"
                  value={profileState.timezone}
                  onChange={(event) =>
                    setProfileState((current) => ({
                      ...current,
                      timezone: event.target.value as (typeof TIMEZONE_OPTIONS)[number],
                    }))
                  }
                >
                  {TIMEZONE_OPTIONS.map((timezone) => (
                    <option key={timezone} value={timezone}>
                      {timezone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-[24px] border border-border/40 bg-background/35 p-4 text-sm leading-6 text-muted-foreground">
                Timezone is the durable settings field the app can already honor across planner, mood, and journal surfaces. More synchronized preferences can layer on this without a schema reset.
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <Button type="submit" className="rounded-full" disabled={isPending || optimisticData.dataSource === "mock"}>
                  <Save className="size-4" />
                  Save profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-[32px] border-border/40 bg-card/70">
            <CardHeader>
              <div className="flex items-center gap-3">
                <MonitorCog className="size-5 text-primary" />
                <div>
                  <CardDescription>Appearance</CardDescription>
                  <CardTitle className="text-2xl text-foreground">Theme is already global</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <PreferenceButton active={activeTheme === "light"} label="Light" onClick={() => setTheme("light")} />
                <PreferenceButton active={activeTheme === "dark"} label="Dark" onClick={() => setTheme("dark")} />
                <PreferenceButton active={activeTheme === "system"} label="System" onClick={() => setTheme("system")} />
              </div>
              <div className="rounded-[24px] border border-border/40 bg-background/35 p-4 text-sm leading-6 text-muted-foreground">
                {isClientReady ? (
                  <span>
                    Current theme mode: <span className="font-medium text-foreground">{resolvedTheme ?? "system"}</span>
                  </span>
                ) : (
                  <span>Loading current theme preference...</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-border/40 bg-card/70">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Globe2 className="size-5 text-primary" />
                <div>
                  <CardDescription>Device defaults</CardDescription>
                  <CardTitle className="text-2xl text-foreground">Local preferences for this machine</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Week starts on</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {WEEK_START_OPTIONS.map((option) => (
                    <PreferenceButton
                      key={option.value}
                      active={weekStartsOn === option.value}
                      label={option.label}
                      onClick={() => setWeekStartsOn(option.value)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Home focus</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {HOME_FOCUS_OPTIONS.map((option) => (
                    <PreferenceButton
                      key={option.value}
                      active={homeFocus === option.value}
                      label={option.label}
                      onClick={() => setHomeFocus(option.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" className="rounded-full" onClick={handleSaveLocalDefaults}>
                  <Save className="size-4" />
                  Save device defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-[32px] border-border/40 bg-card/70">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Database className="size-5 text-primary" />
            <div>
              <CardDescription>Data footprint</CardDescription>
              <CardTitle className="text-2xl text-foreground">What this account is already carrying</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-[24px] border border-border/40 bg-background/35 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Activities</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{optimisticData.summary.activityCount}</p>
            </div>
            <div className="rounded-[24px] border border-border/40 bg-background/35 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Habits</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{optimisticData.summary.habitCount}</p>
            </div>
            <div className="rounded-[24px] border border-border/40 bg-background/35 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Mood entries</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{optimisticData.summary.moodEntryCount}</p>
            </div>
            <div className="rounded-[24px] border border-border/40 bg-background/35 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Journal entries</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{optimisticData.summary.journalEntryCount}</p>
            </div>
            <div className="rounded-[24px] border border-border/40 bg-background/35 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Insights</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{optimisticData.summary.insightCount}</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-border/40 bg-background/35 p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="size-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Settings roadmap</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Appearance is live now, profile context is persisted now, and device defaults are saved locally. Notification rules, exports, and fully synced weekly-start behavior can slot into this surface next without rewriting the page structure.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}