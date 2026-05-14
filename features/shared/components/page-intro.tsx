type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <div className="max-w-3xl space-y-3">
      <p className="font-geist text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
        {eyebrow}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      <p className="text-sm leading-7 text-muted-foreground sm:text-base">
        {description}
      </p>
    </div>
  );
}