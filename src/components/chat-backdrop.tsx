import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** The conversation wallpaper: a theme gradient with a doodle pattern on top. */
export function ChatBackdrop({
  className,
  children,
}: {
  className?: string
  children?: ReactNode
}) {
  return <div className={cn("chat-backdrop", className)}>{children}</div>
}
