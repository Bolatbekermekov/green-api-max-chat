import { describe, expect, it } from "vitest"

import { cn } from "@/lib/utils"

describe("cn", () => {
  // Components override shadcn defaults through className, which relies on
  // conflicting Tailwind classes being merged (last one wins).
  it("merges conflicting Tailwind classes and drops falsy values", () => {
    expect(cn("px-2", false && "hidden", "px-4")).toBe("px-4")
  })
})
