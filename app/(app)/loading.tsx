import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-72 rounded-full" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-36 rounded-[28px]" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Skeleton className="h-[380px] rounded-[32px]" />
        <div className="grid gap-6">
          <Skeleton className="h-[180px] rounded-[32px]" />
          <Skeleton className="h-[180px] rounded-[32px]" />
        </div>
      </div>
    </div>
  );
}