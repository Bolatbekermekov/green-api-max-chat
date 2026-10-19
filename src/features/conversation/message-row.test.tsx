import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { MessageRow } from "@/features/conversation/message-row"
import type { ChatMessage, MessageStatus } from "@/store/chat-store"

function outgoing(
  status: MessageStatus,
  extra: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: "local:1",
    chatId: "1",
    direction: "out",
    text: "Привет",
    timestamp: Date.UTC(2026, 9, 20, 9, 5),
    status,
    ...extra,
  }
}

describe("MessageRow", () => {
  it.each([
    ["pending", "Отправляется"],
    ["sent", "Отправлено"],
    ["delivered", "Доставлено"],
    ["read", "Прочитано"],
    ["failed", "Не отправлено"],
  ] as const)("labels status %s", (status, label) => {
    render(
      <MessageRow message={outgoing(status)} groupedWithPrevious={false} />,
    )

    expect(screen.getByRole("img", { name: label })).toBeInTheDocument()
    expect(screen.getByText("09:05")).toBeInTheDocument()
  })

  it("offers retry for failed messages", async () => {
    const onRetry = vi.fn()
    render(
      <MessageRow
        message={outgoing("failed", { error: "Нет связи с GREEN-API" })}
        groupedWithPrevious={false}
        onRetry={onRetry}
      />,
    )

    expect(screen.getByText("Нет связи с GREEN-API")).toBeInTheDocument()
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Повторить" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("shows a placeholder for unsupported messages", () => {
    render(
      <MessageRow
        message={{
          ...outgoing("sent"),
          direction: "in",
          text: null,
          status: undefined,
        }}
        groupedWithPrevious={false}
      />,
    )

    expect(
      screen.getByText("Сообщение этого типа не поддерживается"),
    ).toBeInTheDocument()
  })

  it("keeps line breaks of multi-line text", () => {
    render(
      <MessageRow
        message={outgoing("sent", { text: "Первая\nВторая" })}
        groupedWithPrevious={false}
      />,
    )

    expect(screen.getByText(/Первая\s+Вторая/)).toHaveClass(
      "whitespace-pre-wrap",
    )
  })

  it("shows no delivery status on incoming messages", () => {
    render(
      <MessageRow
        message={{ ...outgoing("sent"), direction: "in", status: undefined }}
        groupedWithPrevious={false}
      />,
    )

    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })
})
