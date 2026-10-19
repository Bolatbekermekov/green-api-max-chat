import { formatDayLabel, isSameDay } from "@/lib/format"
import type { ChatMessage } from "@/store/chat-store"

export type TimelineItem =
  | { kind: "day"; key: string; label: string }
  | {
      kind: "message"
      key: string
      message: ChatMessage
      /** Same sender within a few minutes: drawn closer to the previous one. */
      groupedWithPrevious: boolean
    }

const GROUP_WINDOW_MS = 5 * 60_000

/** Messages interleaved with day separators, as MAX shows a conversation. */
export function buildTimeline(
  messages: ChatMessage[],
  now = Date.now(),
): TimelineItem[] {
  const items: TimelineItem[] = []
  let previous: ChatMessage | undefined

  for (const message of messages) {
    const newDay =
      !previous || !isSameDay(previous.timestamp, message.timestamp)
    if (newDay) {
      items.push({
        kind: "day",
        key: `day:${new Date(message.timestamp).toDateString()}`,
        label: formatDayLabel(message.timestamp, now),
      })
    }
    items.push({
      kind: "message",
      key: message.id,
      message,
      groupedWithPrevious:
        !newDay &&
        previous !== undefined &&
        previous.direction === message.direction &&
        message.timestamp - previous.timestamp <= GROUP_WINDOW_MS,
    })
    previous = message
  }
  return items
}
