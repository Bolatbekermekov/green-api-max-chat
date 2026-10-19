import { describe, expect, it } from "vitest"

import {
  formatChatTime,
  formatDayLabel,
  formatMessageTime,
  isSameDay,
} from "@/lib/format"

// Tests run with TZ=UTC (see vitest.config.mts).
const now = Date.UTC(2026, 9, 20, 12, 0)

describe("formatMessageTime", () => {
  it("formats hours and minutes with leading zeros", () => {
    expect(formatMessageTime(Date.UTC(2026, 9, 20, 9, 5))).toBe("09:05")
  })
})

describe("formatChatTime", () => {
  it("shows the time for today", () => {
    expect(formatChatTime(Date.UTC(2026, 9, 20, 9, 5), now)).toBe("09:05")
  })

  it("shows 'вчера' for yesterday", () => {
    expect(formatChatTime(Date.UTC(2026, 9, 19, 23, 0), now)).toBe("вчера")
  })

  it("shows day and short month within the current year", () => {
    expect(formatChatTime(Date.UTC(2026, 7, 28, 10, 0), now)).toBe("28 авг.")
  })

  it("shows the full date for previous years", () => {
    expect(formatChatTime(Date.UTC(2025, 7, 28, 10, 0), now)).toBe("28.08.2025")
  })
})

describe("formatDayLabel", () => {
  it("labels today and yesterday in words", () => {
    expect(formatDayLabel(Date.UTC(2026, 9, 20, 1, 0), now)).toBe("Сегодня")
    expect(formatDayLabel(Date.UTC(2026, 9, 19, 1, 0), now)).toBe("Вчера")
  })

  it("labels other days of the current year without the year", () => {
    expect(formatDayLabel(Date.UTC(2026, 7, 28, 1, 0), now)).toBe("28 августа")
  })

  it("adds the year for previous years", () => {
    expect(formatDayLabel(Date.UTC(2025, 7, 28, 1, 0), now)).toBe(
      "28 августа 2025 г.",
    )
  })
})

describe("isSameDay", () => {
  it("compares calendar days, not 24-hour windows", () => {
    expect(
      isSameDay(Date.UTC(2026, 9, 20, 0, 1), Date.UTC(2026, 9, 20, 23, 59)),
    ).toBe(true)
    expect(
      isSameDay(Date.UTC(2026, 9, 19, 23, 59), Date.UTC(2026, 9, 20, 0, 1)),
    ).toBe(false)
  })
})
