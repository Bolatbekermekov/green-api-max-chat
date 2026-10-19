import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { GreenApiProvider } from "@/components/green-api-provider"
import { ChatSidebar } from "@/features/chats/chat-sidebar"
import { initialChatState, useChatStore } from "@/store/chat-store"
import { fakeGreenApiClient } from "@/test/fake-green-api-client"

function renderSidebar() {
  render(
    <GreenApiProvider client={fakeGreenApiClient()}>
      <ChatSidebar />
    </GreenApiProvider>,
  )
  return userEvent.setup()
}

function seedChats() {
  const store = useChatStore.getState()
  store.upsertChat({ chatId: "1", phone: "79991234567" })
  store.applyEvent({
    type: "message",
    direction: "in",
    chatId: "2",
    idMessage: "m2",
    text: "Привет!",
    timestamp: Date.UTC(2026, 9, 20, 9, 0),
    chatName: "Мария",
  })
  store.applyEvent({
    type: "message",
    direction: "in",
    chatId: "3",
    idMessage: "m3",
    text: "Как дела?",
    timestamp: Date.UTC(2026, 9, 20, 10, 0),
    chatName: "Иван",
  })
  // Chat 1 was created now, so it is the most recent one.
}

const chatNames = () =>
  within(screen.getByRole("list", { name: "Список чатов" }))
    .getAllByRole("button")
    .map((item) => item.querySelector("[data-slot=chat-title]")?.textContent)

beforeEach(() => {
  // Only Date is faked: chats created "now" must be newer than the seeded ones.
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(Date.UTC(2026, 9, 20, 12, 0))
  useChatStore.setState(initialChatState)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("ChatSidebar", () => {
  it("lists chats by last activity and filters by search", async () => {
    seedChats()
    const user = renderSidebar()

    expect(chatNames()).toEqual(["+7 999 123-45-67", "Иван", "Мария"])

    await user.type(screen.getByLabelText("Поиск по чатам"), "мар")
    expect(chatNames()).toEqual(["Мария"])

    await user.clear(screen.getByLabelText("Поиск по чатам"))
    await user.type(screen.getByLabelText("Поиск по чатам"), "999 123")
    expect(chatNames()).toEqual(["+7 999 123-45-67"])

    await user.clear(screen.getByLabelText("Поиск по чатам"))
    await user.type(screen.getByLabelText("Поиск по чатам"), "zzz")
    expect(screen.getByText("Ничего не найдено")).toBeInTheDocument()
  })

  it("opens a chat and clears its unread counter", async () => {
    seedChats()
    const user = renderSidebar()

    const maria = screen.getByRole("button", { name: /Мария/ })
    expect(within(maria).getByLabelText("1 непрочитанное")).toBeInTheDocument()
    await user.click(maria)

    expect(useChatStore.getState().activeChatId).toBe("2")
    expect(useChatStore.getState().chats["2"].unread).toBe(0)
  })

  it("invites to start a chat when there are none", async () => {
    const user = renderSidebar()

    expect(screen.getByText("Чатов пока нет")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Начать чат" }))

    expect(
      screen.getByRole("dialog", { name: "Новый чат" }),
    ).toBeInTheDocument()
  })
})
