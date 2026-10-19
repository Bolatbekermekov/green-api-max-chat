"use client"

import { ArrowUpIcon } from "lucide-react"
import {
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"

/** SendMessage accepts at most 4000 characters for MAX. */
export const MAX_MESSAGE_LENGTH = 4000
const COUNTER_FROM = 3500
const MAX_HEIGHT_PX = 136 // about six lines

export function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("")
  const field = useRef<HTMLTextAreaElement>(null)
  const canSend = text.trim().length > 0

  // Grow with the content up to ~6 lines, then scroll inside.
  useLayoutEffect(() => {
    const element = field.current
    if (!element) return
    element.style.height = "auto"
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT_PX)}px`
  }, [text])

  function send() {
    if (!canSend) return
    onSend(text.trim())
    setText("")
    field.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      send()
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    send()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl bg-background py-1.5 pr-1.5 pl-4 shadow-md ring-1 ring-border"
    >
      <textarea
        ref={field}
        rows={1}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Сообщение"
        aria-label="Сообщение"
        maxLength={MAX_MESSAGE_LENGTH}
        className="min-h-9 flex-1 resize-none bg-transparent py-2 text-base leading-5 outline-none placeholder:text-tertiary"
      />
      {text.length > COUNTER_FROM && (
        <span className="self-center text-xs text-tertiary tabular-nums">
          {text.length}/{MAX_MESSAGE_LENGTH}
        </span>
      )}
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Отправить"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:bg-field disabled:text-tertiary"
      >
        <ArrowUpIcon className="size-5" aria-hidden="true" />
      </button>
    </form>
  )
}
