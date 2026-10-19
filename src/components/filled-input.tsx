import type { ComponentProps } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** MAX-style text field: filled background, border only on focus. */
export function FilledInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <Input
      className={cn(
        "h-12 rounded-xl border-transparent bg-field px-4 text-base placeholder:text-tertiary focus-visible:border-ring md:text-base dark:bg-field",
        className,
      )}
      {...props}
    />
  )
}
