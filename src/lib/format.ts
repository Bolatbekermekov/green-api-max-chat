// All timestamps are milliseconds since epoch, shown in the viewer's time zone.

const timeFormat = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
})
const shortDateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
})
const numericDateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})
const dayFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
})
const dayWithYearFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

export function isSameDay(a: number, b: number): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function isYesterday(ts: number, now: number): boolean {
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  return isSameDay(ts, yesterday.getTime())
}

function isSameYear(a: number, b: number): boolean {
  return new Date(a).getFullYear() === new Date(b).getFullYear()
}

/** Time inside a message bubble: "09:05". */
export function formatMessageTime(ts: number): string {
  return timeFormat.format(ts)
}

/** Time in the chat list: "09:05", "вчера", "28 авг." or "28.08.2025". */
export function formatChatTime(ts: number, now = Date.now()): string {
  if (isSameDay(ts, now)) return formatMessageTime(ts)
  if (isYesterday(ts, now)) return "вчера"
  if (isSameYear(ts, now)) return shortDateFormat.format(ts)
  return numericDateFormat.format(ts)
}

/** Day separator in a conversation: "Сегодня", "Вчера", "28 августа". */
export function formatDayLabel(ts: number, now = Date.now()): string {
  if (isSameDay(ts, now)) return "Сегодня"
  if (isYesterday(ts, now)) return "Вчера"
  if (isSameYear(ts, now)) return dayFormat.format(ts)
  return dayWithYearFormat.format(ts)
}
