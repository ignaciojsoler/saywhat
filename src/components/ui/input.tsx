import * as React from "react"
import { cn } from "@/lib/utils"

/** Comfortable-size text field for forms outside the dense editor UI. */
function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "border-input bg-input/30 placeholder:text-muted-foreground/70 h-11 w-full min-w-0 rounded-lg border px-3.5 text-base md:text-[15px] transition-[color,box-shadow,border-color] outline-none",
        "focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/25 aria-invalid:ring-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
