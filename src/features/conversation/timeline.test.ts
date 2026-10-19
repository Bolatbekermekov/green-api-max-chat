import { describe, expect, it } from "vitest"

import { buildTimeline } from "@/features/conversation/timeline"
import type { ChatMessage } from "@/store/chat-store"

const now = Date.UTC(2026, 9, 20, 12, 0)
const at = (day: number, hour: number, minute: number) =>
  Date.UTC(2026, 9, day, hour, minute)

function message(
  id: string,
  direction: "in" | "out",
  timestamp: number,
): ChatMessage {
  return { id, idMessage: id, chatId: "1", direction, text: id, timestamp }
}

describe("buildTimeline", () => {
  it("inserts a day marker before each new day", () => {
    const items = buildTimeline(
      [message("a", "in", at(19, 10, 0)), message("b", "out", at(20, 9, 0))],
      now,
    )

    expect(
      items.map((item) => (item.kind === "day" ? item.label : item.key)),
    ).toEqual(["Вчера", "a", "Сегодня", "b"])
  })

  it("groups consecutive messages of one side within 5 minutes", () => {
    const items = buildTimeline(
      [
        message("a", "out", at(20, 9, 0)),
        message("b", "out", at(20, 9, 5)),
        message("c", "out", at(20, 9, 11)),
        message("d", "in", at(20, 9, 12)),
      ],
      now,
    )

    const grouping = items.flatMap((item) =>
      item.kind === "message" ? [[item.key, item.groupedWithPrevious]] : [],
    )
    expect(grouping).toEqual([
      ["a", false],
      ["b", true],
      ["c", false],
      ["d", false],
    ])
  })

  it("never groups across a day marker", () => {
    const items = buildTimeline(
      [message("a", "in", at(19, 23, 58)), message("b", "in", at(20, 0, 1))],
      now,
    )

    expect(items.at(-1)).toMatchObject({ key: "b", groupedWithPrevious: false })
  })
})
