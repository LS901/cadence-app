"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, BookOpenText, BrainCircuit, CalendarDays, HeartPulse, Home, LogOut, Menu, Settings2, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CadenceMark } from "@/components/layout/cadence-mark";
import { ThemeToggleButton } from "@/components/layout/theme-toggle-button";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/habits", label: "Habits", icon: Activity },
  { href: "/mood", label: "Mood", icon: BrainCircuit },
  { href: "/life-events", label: "Life events", icon: HeartPulse },
  { href: "/journal", label: "Journal", icon: BookOpenText },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

type AppShellProps = {
  userName: string;
  userEmail: string;
  children: React.ReactNode;
};

export function AppShell({ userName, userEmail, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(144,174,173,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(130,143,158,0.14),transparent_30%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border/40 bg-sidebar px-5 py-6 backdrop-blur-xl lg:flex lg:flex-col">
          <div className=" p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-[22px] border border-white/8 bg-white/[0.04]">
                <CadenceMark className="h-10 w-9" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-geist text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                  Cadence
                </p>
                
              </div>
            </div>
            <h1 className="mt-5 max-w-[10ch] text-4xl font-semibold leading-[1.02] tracking-tight text-foreground">
              Reflect in rhythm.
            </h1>
          </div>

          <nav className="mt-10 flex flex-1 flex-col gap-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-11 justify-start gap-3 rounded-2xl px-4 text-sm text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground",
                    pathname === item.href && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="rounded-[28px] border border-border/40 bg-white/4 p-4">
            <p className="text-sm font-medium text-foreground">This week&apos;s tone</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Gentle consistency. Mood stability is strongest on days with low-friction routines.
            </p>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-border/40 bg-background/80 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="lg:hidden">
                  <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
                    <SheetTrigger
                      render={
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-full border-border/40 bg-white/5"
                          aria-label="Open navigation menu"
                        />
                      }
                    >
                      <Menu className="size-4" />
                    </SheetTrigger>
                    <SheetContent side="left" className="border-border/40 bg-sidebar/96 p-0 backdrop-blur-2xl">
                      <SheetHeader className="shrink-0 border-b border-border/40 px-5 py-5 text-left">
                        <div className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-[22px] border border-white/8 bg-white/[0.04]">
                              <CadenceMark className="h-10 w-9" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-geist text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                                Cadence
                              </p>
                            </div>
                          </div>
                          <SheetTitle className="mt-5 max-w-[10ch] text-3xl leading-[1.04]">Reflect in rhythm.</SheetTitle>
                          <SheetDescription className="mt-3 leading-6">
                            Move through the app without losing the calm, reflective shell on smaller screens.
                          </SheetDescription>
                        </div>
                      </SheetHeader>

                      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">
                        <div className="flex min-h-full flex-col">
                          <nav className="flex flex-col gap-1.5">
                            {navigation.map((item) => {
                              const Icon = item.icon;

                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  onClick={() => setIsMobileNavOpen(false)}
                                  className={cn(
                                    buttonVariants({ variant: "ghost", size: "lg" }),
                                    "justify-start gap-3 rounded-2xl px-4 text-sm text-sidebar-foreground/80 hover:bg-white/6 hover:text-sidebar-foreground",
                                    pathname === item.href && "bg-primary/10 text-primary font-medium"
                                  )}
                                >
                                  <Icon className="size-4" />
                                  {item.label}
                                </Link>
                              );
                            })}
                          </nav>

                          <div className="mt-6 rounded-[28px] border border-border/40 bg-white/4 p-4">
                            <p className="text-sm font-medium text-foreground">This week&apos;s tone</p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              Gentle consistency. Mood stability is strongest on days with low-friction routines.
                            </p>
                          </div>

                          <div className="mt-auto pt-6">
                            <div className="flex items-center gap-3 rounded-[24px] border border-border/40 bg-white/4 px-4 py-3">
                              <Avatar className="size-9 border border-border/40">
                                <AvatarFallback className="bg-white/8 text-xs">
                                  {userName
                                    .split(" ")
                                    .map((part) => part[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">{userName}</p>
                                <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                <div className="flex items-center gap-3 lg:hidden">
                  <div className="flex h-10 w-9 items-center justify-center rounded-xl border border-border/40 bg-card/65 backdrop-blur-xl">
                    <CadenceMark className="h-6 w-5" />
                  </div>
                  <div className="hidden sm:block">
                    <p className="font-geist text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                      Cadence
                    </p>
                  </div>
                </div>

                <p className="hidden max-w-[26ch] font-geist text-[11px] uppercase leading-5 tracking-[0.24em] text-muted-foreground lg:block">
                  Calm analytics for your inner life
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <ThemeToggleButton className="border-border/40 bg-white/5" />
                <Separator orientation="vertical" className="hidden h-8 lg:block" />
                <div className="flex items-center gap-2 rounded-full border border-border/40 bg-white/5 p-1 pr-1 sm:gap-3 sm:px-3 sm:py-2 lg:pr-3">
                  <Avatar className="size-8 border border-border/40 sm:size-9">
                    <AvatarFallback className="bg-white/8 text-xs">
                      {userName
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium">{userName}</p>
                    <p className="text-xs text-muted-foreground max-w-[120px] truncate xl:max-w-none">{userEmail}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full shrink-0"
                  onClick={() => {
                    void handleSignOut();
                  }}
                  aria-label="Sign out"
                >
                  <LogOut className="size-4" />
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}