import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type PlaceholderSurfaceProps = {
  items: string[];
};

export function PlaceholderSurface({ items }: PlaceholderSurfaceProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card key={item} className="glass-card rounded-[28px]">
          <CardContent className="space-y-4 py-6">
            <Badge
              variant="secondary"
              className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em]"
            >
              Planned
            </Badge>
            <p className="text-sm leading-7 text-muted-foreground">{item}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}