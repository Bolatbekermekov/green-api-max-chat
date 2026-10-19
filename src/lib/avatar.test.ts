import { describe, expect, it } from "vitest"

import { getAvatarTone, getInitials } from "@/lib/avatar"

describe("getInitials", () => {
  it.each([
    ["Иван Петров", "ИП"],
    ["анна", "А"],
    ["Мария Анна Иванова", "МА"],
    ["Чат 10000000", "Ч"],
    ["+7 999 123-45-67", "#"],
    ["   ", "#"],
  ])("%j → %j", (title, initials) => {
    expect(getInitials(title)).toBe(initials)
  })
})

describe("getAvatarTone", () => {
  it("is stable for the same seed and stays within 0..5", () => {
    const seeds = ["10000000", "20000000", "-1", "Иван", "", "79991234567"]
    for (const seed of seeds) {
      const tone = getAvatarTone(seed)
      expect(getAvatarTone(seed)).toBe(tone)
      expect(tone).toBeGreaterThanOrEqual(0)
      expect(tone).toBeLessThanOrEqual(5)
    }
  })

  it("spreads different chats across tones", () => {
    const tones = new Set(
      Array.from({ length: 30 }, (_, i) => getAvatarTone(String(10000000 + i))),
    )
    expect(tones.size).toBeGreaterThan(3)
  })
})
