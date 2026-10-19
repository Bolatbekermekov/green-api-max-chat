"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"

/**
 * Switches between light and dark. The icon follows the `dark` class via CSS,
 * so it is correct on the first paint without reading the theme in JS.
 */
export function ThemeToggle({
  className,
  withLabel = false,
}: {
  className?: string
  withLabel?: boolean
}) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label={withLabel ? undefined : "Сменить тему"}
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        withLabel ? "min-h-14 w-14 text-[11px] font-medium" : "size-10",
        className,
      )}
    >
      <SunIcon className="size-5 dark:hidden" aria-hidden="true" />
      <MoonIcon className="hidden size-5 dark:block" aria-hidden="true" />
      {withLabel && <span>Тема</span>}
    </button>
  )
}
