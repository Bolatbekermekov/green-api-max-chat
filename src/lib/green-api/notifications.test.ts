import { describe, expect, it } from "vitest"

import {
  incomingTextBody,
  outgoingTextBody,
  stateBody,
  statusBody,
} from "@/lib/green-api/fixtures"
import { parseNotification } from "@/lib/green-api/notifications"

describe("parseNotification", () => {
  it("parses an incoming text message", () => {
    const body = incomingTextBody({
      chatId: "10000000",
      idMessage: "A1",
      text: "Привет от Green-API!",
      timestamp: 1763115112,
      chatName: "Иван",
    })

    expect(parseNotification(body)).toEqual({
      type: "message",
      direction: "in",
      chatId: "10000000",
      idMessage: "A1",
      text: "Привет от Green-API!",
      timestamp: 1763115112000,
      chatName: "Иван",
      phone: "79876543210",
    })
  })

  it("leaves out a hidden sender phone", () => {
    const body = incomingTextBody({
      chatId: "10000000",
      idMessage: "A6",
      text: "Привет",
    })
    body.senderData.senderPhoneNumber = 0

    expect(parseNotification(body)).not.toHaveProperty("phone")
  })

  it("reads text with a link from extendedTextMessageData.text", () => {
    const text = "Документация на сайте https://green-api.com/"
    const body = incomingTextBody({
      chatId: "10000000",
      idMessage: "A2",
      text,
      typeMessage: "extendedTextMessage",
    })

    expect(parseNotification(body)).toMatchObject({ type: "message", text })
  })

  it("reads a quoted reply as text", () => {
    const body = incomingTextBody({
      chatId: "10000000",
      idMessage: "A3",
      text: "Цитируем это",
      typeMessage: "quotedMessage",
    })

    expect(parseNotification(body)).toMatchObject({ text: "Цитируем это" })
  })

  it("marks non-text messages as unsupported", () => {
    const body = incomingTextBody({
      chatId: "10000000",
      idMessage: "A4",
      text: "подпись",
      typeMessage: "imageMessage",
    })

    expect(parseNotification(body)).toMatchObject({
      type: "message",
      idMessage: "A4",
      text: null,
    })
  })

  it("falls back to the sender's name when the chat has no name", () => {
    const body = incomingTextBody({
      chatId: "10000000",
      idMessage: "A5",
      text: "Привет",
    })
    body.senderData.chatName = ""
    body.senderData.senderContactName = ""
    body.senderData.senderName = "Иван"

    expect(parseNotification(body)).toMatchObject({ chatName: "Иван" })
  })

  it.each([true, false])(
    "parses outgoing messages (fromApi=%s) as direction out",
    (fromApi) => {
      const body = outgoingTextBody({
        chatId: "10000000",
        idMessage: "B1",
        text: "Ответ",
        timestamp: 1763115200,
        fromApi,
      })

      expect(parseNotification(body)).toMatchObject({
        type: "message",
        direction: "out",
        chatId: "10000000",
        idMessage: "B1",
        text: "Ответ",
        timestamp: 1763115200000,
      })
    },
  )

  it("ignores group chats", () => {
    expect(
      parseNotification(
        incomingTextBody({
          chatId: "-69876543210123",
          idMessage: "G1",
          text: "в группе",
          chatType: "group",
        }),
      ),
    ).toBeNull()
    expect(
      parseNotification(
        statusBody({
          chatId: "-69876543210123",
          idMessage: "G2",
          status: "read",
        }),
      ),
    ).toBeNull()
  })

  it("parses delivery statuses", () => {
    const body = statusBody({
      chatId: "10000000",
      idMessage: "B1",
      status: "read",
      timestamp: 1755591519,
    })

    expect(parseNotification(body)).toEqual({
      type: "status",
      chatId: "10000000",
      idMessage: "B1",
      status: "read",
      timestamp: 1755591519000,
    })
  })

  it("parses instance state changes", () => {
    expect(parseNotification(stateBody("notAuthorized", 1755589527))).toEqual({
      type: "state",
      state: "notAuthorized",
      timestamp: 1755589527000,
    })
  })

  it.each([
    { typeWebhook: "quotaExceeded" },
    null,
    "x",
    { typeWebhook: "incomingMessageReceived" },
  ])("returns null for %j", (body) => {
    expect(parseNotification(body)).toBeNull()
  })
})

describe("parseNotification for WhatsApp", () => {
  it("parses an incoming text message and reads the phone from the chatId", () => {
    const body = incomingTextBody({
      messenger: "whatsapp",
      chatId: "79001234567@c.us",
      idMessage: "F7AEC1B7086ECDC7E6E45923F5EDB825",
      text: "I use Green-API to send this message to you!",
      timestamp: 1588091580,
      chatName: "Иван",
    })

    expect(parseNotification(body)).toEqual({
      type: "message",
      direction: "in",
      chatId: "79001234567@c.us",
      idMessage: "F7AEC1B7086ECDC7E6E45923F5EDB825",
      text: "I use Green-API to send this message to you!",
      timestamp: 1588091580000,
      chatName: "Иван",
      phone: "79001234567",
    })
  })

  it("reads the recipient's phone from a message sent from the phone", () => {
    const body = outgoingTextBody({
      messenger: "whatsapp",
      chatId: "79001234567@c.us",
      idMessage: "3EB0C767D097B7C7C030",
      text: "Ответ",
      fromApi: false,
    })

    expect(parseNotification(body)).toMatchObject({
      type: "message",
      direction: "out",
      chatId: "79001234567@c.us",
      chatName: "Иван",
      phone: "79001234567",
    })
  })

  it("keeps a chat addressed by lid, without a phone", () => {
    const parsed = parseNotification(
      incomingTextBody({
        messenger: "whatsapp",
        chatId: "123456789012345@lid",
        idMessage: "W1",
        text: "Привет",
      }),
    )

    expect(parsed).toMatchObject({
      type: "message",
      chatId: "123456789012345@lid",
    })
    expect(parsed).not.toHaveProperty("phone")
  })

  it.each([
    "120363369140947676@g.us",
    "status@broadcast",
    "120363000000000000@newsletter",
  ])("ignores %s: groups, status updates and channels", (chatId) => {
    expect(
      parseNotification(
        incomingTextBody({
          messenger: "whatsapp",
          chatId,
          idMessage: "G1",
          text: "не личный чат",
        }),
      ),
    ).toBeNull()
    expect(
      parseNotification(
        statusBody({
          messenger: "whatsapp",
          chatId,
          idMessage: "G2",
          status: "read",
        }),
      ),
    ).toBeNull()
  })

  it.each(["sent", "suspended", "yellowCard"] as const)(
    "parses the %s status",
    (status) => {
      const body = statusBody({
        messenger: "whatsapp",
        chatId: "79876543210@c.us",
        idMessage: "3EB0608D6A2901063D63",
        status,
        timestamp: 1727691478,
      })

      expect(parseNotification(body)).toEqual({
        type: "status",
        chatId: "79876543210@c.us",
        idMessage: "3EB0608D6A2901063D63",
        status,
        timestamp: 1727691478000,
      })
    },
  )
})
