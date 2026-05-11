import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-primary/15 bg-primary/92 text-primary-foreground shadow-[0_10px_30px_color-mix(in_srgb,var(--primary)_24%,transparent),inset_0_1px_0_rgba(255,255,255,0.18)] hover:-translate-y-0.5 hover:bg-primary dark:border-primary/18 dark:bg-primary/88 dark:shadow-[0_14px_36px_color-mix(in_srgb,var(--primary)_18%,transparent),inset_0_1px_0_rgba(255,255,255,0.16)]",
        outline:
          "panel-surface hover:-translate-y-0.5 hover:bg-card/90 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "border-border/45 bg-secondary/85 text-secondary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:-translate-y-0.5 hover:bg-secondary dark:border-white/8 dark:bg-white/[0.05] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        ghost:
          "hover:-translate-y-0.5 hover:bg-muted/55 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-sidebar-accent/80",
        destructive:
          "border-destructive/15 bg-destructive/92 text-destructive-foreground shadow-[0_10px_30px_rgba(160,38,38,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] hover:-translate-y-0.5 hover:bg-destructive",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),13px)] px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-4.5 text-[0.95rem] has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
