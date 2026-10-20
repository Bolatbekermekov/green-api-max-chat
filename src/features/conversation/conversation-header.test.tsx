import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ConversationHeader } from "@/features/conversation/conversation-header"
import type { Chat } from "@/store/chat-store"
import { initialSessionState, useSessionStore } from "@/store/session-store"

const chat: Chat = {
  chatId: "77011234567@c.us",
  title: "+7 701 123-45-67",
  phone: "77011234567",
  lastActivityAt: 0,
  unread: 0,
}

beforeEach(() => {
  useSessionStore.setState({ ...initialSessionState, messenger: "whatsapp" })
})

describe("ConversationHeader", () => {
  it("names the messenger under a chat titled by its number", () => {
    render(<ConversationHeader chat={chat} onBack={vi.fn()} />)

    expect(screen.getByText("в WhatsApp")).toBeInTheDocument()
  })

  it("shows the number under a chat with a name", () => {
    render(
      <ConversationHeader chat={{ ...chat, title: "Иван" }} onBack={vi.fn()} />,
    )

    expect(screen.getByText("+7 701 123-45-67")).toBeInTheDocument()
  })
})
