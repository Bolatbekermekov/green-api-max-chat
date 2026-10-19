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
