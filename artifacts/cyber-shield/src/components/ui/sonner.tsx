import * as React from "react"
import { Root } from "@radix-ui/react-slot"

// Stub sonner Toaster for App.tsx. The real implementation is more complex, 
// so we use sonner directly.
import { Toaster as SonnerToaster } from "sonner"

export function Toaster(props: React.ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg font-mono rounded-sm border-primary/20",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-display uppercase",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-display uppercase",
          error: "group-[.toaster]:border-destructive/50 group-[.toaster]:text-destructive",
          success: "group-[.toaster]:border-success/50 group-[.toaster]:text-success",
          warning: "group-[.toaster]:border-warning/50 group-[.toaster]:text-warning",
          info: "group-[.toaster]:border-primary/50 group-[.toaster]:text-primary",
        },
      }}
      {...props}
    />
  )
}
