import { beforeEach, describe, expect, it } from "vitest"

import type { ChatEvent } from "@/lib/green-api/notifications"
import {
  initialChatState,
  selectChatList,
  selectLastMessage,
  useChatStore,
} from "@/store/chat-store"

type MessageEvent = Extract<ChatEvent, { type: "message" }>

const chatId = "10000000"
const store = () => useChatStore.getState()

function incoming(overrides: Partial<MessageEvent> = {}): MessageEvent {
  return {
    type: "message",
    direction: "in",
    chatId,
    idMessage: "IN-1",
    text: "Привет",
    timestamp: 1_000,
    chatName: "Иван",
    ...overrides,
  }
}

beforeEach(() => {
  useChatStore.setState(initialChatState)
})

describe("chats", () => {
  it("upsertChat creates a chat once and indexes its phone", () => {
    store().upsertChat({ chatId, phone: "79991234567" })
    store().upsertChat({ chatId, phone: "79991234567" })

    expect(Object.keys(store().chats)).toEqual([chatId])
    expect(store().chats[chatId]).toMatchObject({
      title: "+7 999 123-45-67",
      phone: "79991234567",
      unread: 0,
    })
    expect(store().phoneIndex).toEqual({ "79991234567": chatId })
  })

  it("creates an unknown chat from an incoming message titled by chatName", () => {
    store().applyEvent(incoming({ chatId: "20000000", chatName: "Мария" }))

    expect(store().chats["20000000"]).toMatchObject({
      chatId: "20000000",
      title: "Мария",
      lastActivityAt: 1_000,
      unread: 1,
    })
  })

  it("remembers the phone of an incoming chat", () => {
    store().applyEvent(
      incoming({
        chatId: "40000000",
        chatName: undefined,
        phone: "79876543210",
      }),
    )

    expect(store().chats["40000000"]).toMatchObject({
      title: "+7 987 654-32-10",
      phone: "79876543210",
    })
    expect(store().phoneIndex["79876543210"]).toBe("40000000")
  })

  it("titles a chat without a name by its id", () => {
    store().applyEvent(incoming({ chatId: "30000000", chatName: undefined }))
    expect(store().chats["30000000"].title).toBe("Чат 30000000")
  })

  it("replaces a phone title with the incoming chatName", () => {
    store().upsertChat({ chatId, phone: "79991234567" })
    store().applyEvent(incoming({ chatName: "Иван Петров" }))

    expect(store().chats[chatId].title).toBe("Иван Петров")
    expect(store().chats[chatId].phone).toBe("79991234567")
  })

  it("counts unread only for inactive chats; openChat resets it", () => {
    store().applyEvent(incoming({ idMessage: "IN-1" }))
    store().applyEvent(incoming({ idMessage: "IN-2", timestamp: 2_000 }))
    expect(store().chats[chatId].unread).toBe(2)

    store().openChat(chatId)
    expect(store().chats[chatId].unread).toBe(0)
    expect(store().activeChatId).toBe(chatId)

    store().applyEvent(incoming({ idMessage: "IN-3", timestamp: 3_000 }))
    expect(store().chats[chatId].unread).toBe(0)
  })

  it("selectChatList orders by last activity", () => {
    store().applyEvent(
      incoming({ chatId: "1", idMessage: "a", timestamp: 1_000 }),
    )
    store().applyEvent(
      incoming({ chatId: "2", idMessage: "b", timestamp: 3_000 }),
    )
    store().applyEvent(
      incoming({ chatId: "3", idMessage: "c", timestamp: 2_000 }),
    )

    expect(selectChatList(store()).map((chat) => chat.chatId)).toEqual([
      "2",
      "3",
      "1",
    ])
  })
})

describe("sending", () => {
  it("addPendingMessage appends a pending outgoing message", () => {
    const localId = store().addPendingMessage(chatId, "Как дела?", 5_000)

    expect(localId).toMatch(/^local:/)
    expect(selectLastMessage(store(), chatId)).toEqual({
      id: localId,
      chatId,
      direction: "out",
      text: "Как дела?",
      timestamp: 5_000,
      status: "pending",
    })
    expect(store().chats[chatId].lastActivityAt).toBe(5_000)
  })

  it("markSent stores idMessage and status sent", () => {
    store().upsertChat({ chatId })
    const localId = store().addPendingMessage(chatId, "Как дела?", 5_000)
    store().markSent(chatId, localId, "OUT-1")

    expect(selectLastMessage(store(), chatId)).toMatchObject({
      id: localId,
      idMessage: "OUT-1",
      status: "sent",
    })
  })

  it("markSent merges with an echo that arrived first", () => {
    store().upsertChat({ chatId })
    const localId = store().addPendingMessage(chatId, "Как дела?", 5_000)
    store().applyEvent({
      type: "message",
      direction: "out",
      chatId,
      idMessage: "OUT-1",
      text: "Как дела?",
      timestamp: 5_100,
    })
    store().markSent(chatId, localId, "OUT-1")

    expect(store().messages[chatId]).toHaveLength(1)
    expect(store().messages[chatId][0]).toMatchObject({
      id: localId,
      idMessage: "OUT-1",
      status: "sent",
    })
  })

  it("ignores the echo of a message that is already sent", () => {
    store().upsertChat({ chatId })
    const localId = store().addPendingMessage(chatId, "Как дела?", 5_000)
    store().markSent(chatId, localId, "OUT-1")
    store().applyEvent({
      type: "message",
      direction: "out",
      chatId,
      idMessage: "OUT-1",
      text: "Как дела?",
      timestamp: 5_100,
    })

    expect(store().messages[chatId]).toHaveLength(1)
  })

  it("markFailed and markPending drive a retry", () => {
    store().upsertChat({ chatId })
    const localId = store().addPendingMessage(chatId, "Как дела?", 5_000)

    store().markFailed(chatId, localId, "Нет связи")
    expect(selectLastMessage(store(), chatId)).toMatchObject({
      status: "failed",
      error: "Нет связи",
    })

    store().markPending(chatId, localId)
    const message = selectLastMessage(store(), chatId)
    expect(message?.status).toBe("pending")
    expect(message?.error).toBeUndefined()
  })
})

describe("events", () => {
  it("ignores a duplicate incoming message", () => {
    store().applyEvent(incoming())
    store().applyEvent(incoming())

    expect(store().messages[chatId]).toHaveLength(1)
    expect(store().chats[chatId].unread).toBe(1)
  })

  it("adds an outgoing message sent from the phone as sent", () => {
    store().applyEvent({
      type: "message",
      direction: "out",
      chatId,
      idMessage: "PHONE-1",
      text: "С телефона",
      timestamp: 7_000,
    })

    expect(selectLastMessage(store(), chatId)).toMatchObject({
      idMessage: "PHONE-1",
      direction: "out",
      status: "sent",
    })
    expect(store().chats[chatId].unread).toBe(0)
  })

  it("keeps messages sorted by timestamp", () => {
    store().applyEvent(incoming({ idMessage: "late", timestamp: 3_000 }))
    store().applyEvent(incoming({ idMessage: "early", timestamp: 1_000 }))
    store().applyEvent(incoming({ idMessage: "middle", timestamp: 2_000 }))

    expect(store().messages[chatId].map((m) => m.idMessage)).toEqual([
      "early",
      "middle",
      "late",
    ])
  })

  it("keeps arrival order within the same second", () => {
    // Our message has a millisecond client timestamp; the reply that comes
    // right after it has a server timestamp rounded down to the second.
    const localId = store().addPendingMessage(chatId, "Вопрос", 1_000_700)
    store().applyEvent(incoming({ idMessage: "reply", timestamp: 1_000_000 }))

    expect(store().messages[chatId].map((m) => m.id)).toEqual([
      localId,
      "reply",
    ])
  })

  it("never downgrades status", () => {
    store().upsertChat({ chatId })
    const localId = store().addPendingMessage(chatId, "x", 5_000)
    store().markSent(chatId, localId, "OUT-1")

    const status = (value: "delivered" | "read") =>
      store().applyEvent({
        type: "status",
        chatId,
        idMessage: "OUT-1",
        status: value,
        timestamp: 6_000,
      })
    status("read")
    status("delivered")

    expect(selectLastMessage(store(), chatId)?.status).toBe("read")
  })

  it("a sent status keeps the message sent", () => {
    store().upsertChat({ chatId })
    const localId = store().addPendingMessage(chatId, "x", 5_000)
    store().markSent(chatId, localId, "OUT-1")

    store().applyEvent({
      type: "status",
      chatId,
      idMessage: "OUT-1",
      status: "sent",
      timestamp: 6_000,
    })

    expect(selectLastMessage(store(), chatId)).toMatchObject({
      status: "sent",
    })
    expect(selectLastMessage(store(), chatId)).not.toHaveProperty(
      "error",
      expect.anything(),
    )
  })

  it("a late sent status does not undo delivered", () => {
    store().upsertChat({ chatId })
    const localId = store().addPendingMessage(chatId, "x", 5_000)
    store().markSent(chatId, localId, "OUT-1")
    for (const status of ["delivered", "sent"] as const) {
      store().applyEvent({
        type: "status",
        chatId,
        idMessage: "OUT-1",
        status,
        timestamp: 6_000,
      })
    }

    expect(selectLastMessage(store(), chatId)?.status).toBe("delivered")
  })

  it.each([
    ["noAccount", "У получателя нет аккаунта в мессенджере"],
    ["failed", "Не удалось доставить сообщение"],
    ["notInGroup", "Вы не участник этого чата"],
    ["suspended", "Отправка временно ограничена"],
    ["yellowCard", "Отправка временно ограничена"],
  ] as const)("status %s marks the message failed", (status, error) => {
    store().upsertChat({ chatId })
    const localId = store().addPendingMessage(chatId, "x", 5_000)
    store().markSent(chatId, localId, "OUT-1")
    store().applyEvent({
      type: "status",
      chatId,
      idMessage: "OUT-1",
      status,
      timestamp: 6_000,
    })

    expect(selectLastMessage(store(), chatId)).toMatchObject({
      status: "failed",
      error,
    })
  })
})

describe("instance binding", () => {
  it("bindInstance clears data of another instance and keeps the same one", () => {
    store().bindInstance("3100000001")
    store().applyEvent(incoming())

    store().bindInstance("3100000001")
    expect(Object.keys(store().chats)).toEqual([chatId])

    store().bindInstance("3100000002")
    expect(store().chats).toEqual({})
    expect(store().messages).toEqual({})
    expect(store().instanceId).toBe("3100000002")
  })

  it("clear forgets everything", () => {
    store().bindInstance("3100000001")
    store().upsertChat({ chatId, phone: "79991234567" })
    store().openChat(chatId)
    store().clear()

    expect(store()).toMatchObject(initialChatState)
  })
})
