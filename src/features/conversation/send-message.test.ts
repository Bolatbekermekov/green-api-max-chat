import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  retryChatMessage,
  sendChatMessage,
} from "@/features/conversation/send-message"
import { GreenApiError } from "@/lib/green-api/errors"
import { initialChatState, useChatStore } from "@/store/chat-store"

const chatId = "10000000"
const lastMessage = () => useChatStore.getState().messages[chatId]?.at(-1)

beforeEach(() => {
  useChatStore.setState(initialChatState)
  useChatStore.getState().upsertChat({ chatId, phone: "79991234567" })
})

describe("sendChatMessage", () => {
  it("shows the message right away and marks it sent with idMessage", async () => {
    let resolve!: (value: { idMessage: string }) => void
    const sendMessage = vi.fn(
      () => new Promise<{ idMessage: string }>((r) => (resolve = r)),
    )

    const sending = sendChatMessage({
      client: { sendMessage },
      chatId,
      text: "  Привет  ",
    })
    expect(lastMessage()).toMatchObject({ text: "Привет", status: "pending" })

    resolve({ idMessage: "X1" })
    await sending

    expect(sendMessage).toHaveBeenCalledWith(chatId, "Привет")
    expect(lastMessage()).toMatchObject({ idMessage: "X1", status: "sent" })
  })

  it("marks the message failed with a readable reason", async () => {
    const sendMessage = vi.fn(async () => {
      throw new GreenApiError("quota-exceeded", { status: 466 })
    })

    await sendChatMessage({ client: { sendMessage }, chatId, text: "Привет" })

    expect(lastMessage()).toMatchObject({
      status: "failed",
      error: "Превышен лимит бесплатного тарифа GREEN-API (не больше 3 чатов)",
    })
  })

  it("ignores blank text", async () => {
    const sendMessage = vi.fn()

    await sendChatMessage({ client: { sendMessage }, chatId, text: "  \n " })

    expect(sendMessage).not.toHaveBeenCalled()
    expect(useChatStore.getState().messages[chatId]).toBeUndefined()
  })
})

describe("retryChatMessage", () => {
  it("sends the same text again and marks it sent", async () => {
    const sendMessage = vi
      .fn()
      .mockRejectedValueOnce(new GreenApiError("network"))
      .mockResolvedValueOnce({ idMessage: "X2" })

    await sendChatMessage({ client: { sendMessage }, chatId, text: "Ещё раз" })
    const failed = lastMessage()!
    expect(failed.status).toBe("failed")

    await retryChatMessage({
      client: { sendMessage },
      chatId,
      localId: failed.id,
    })

    expect(sendMessage).toHaveBeenLastCalledWith(chatId, "Ещё раз")
    expect(useChatStore.getState().messages[chatId]).toHaveLength(1)
    expect(lastMessage()).toMatchObject({ idMessage: "X2", status: "sent" })
  })
})
