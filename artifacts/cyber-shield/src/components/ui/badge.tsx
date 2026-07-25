import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-display uppercase tracking-widest",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/20 text-primary shadow-[0_0_10px_-3px_hsl(var(--primary)/0.5)] border-primary/50",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive/20 text-destructive shadow-[0_0_10px_-3px_hsl(var(--destructive)/0.5)] border-destructive/50",
        outline: "text-foreground",
        warning:
          "border-transparent bg-warning/20 text-warning shadow-[0_0_10px_-3px_hsl(var(--warning)/0.5)] border-warning/50",
        success:
          "border-transparent bg-success/20 text-success shadow-[0_0_10px_-3px_hsl(var(--success)/0.5)] border-success/50",
        info:
          "border-transparent bg-primary/10 text-primary shadow-[0_0_10px_-3px_hsl(var(--primary)/0.3)] border-primary/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
