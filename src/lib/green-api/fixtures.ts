// Notification bodies shaped like the examples in the GREEN-API MAX docs
// (green-api.com/v3/docs/api/receiving/notifications-format/). Used by unit
// and end-to-end tests only. Timestamps are in seconds, as the API sends them.

import type { DeliveryStatus } from "@/lib/green-api/notifications"

const instanceData = {
  idInstance: 3100000000,
  wid: "79991234567@c.us",
  typeInstance: "v3",
}

type IncomingType =
  "textMessage" | "extendedTextMessage" | "quotedMessage" | "imageMessage"

function messageData(typeMessage: IncomingType, text: string) {
  switch (typeMessage) {
    case "textMessage":
      return { typeMessage, textMessageData: { textMessage: text } }
    case "extendedTextMessage":
      return {
        typeMessage,
        extendedTextMessageData: {
          text,
          description: "",
          title: "",
          forwardingScore: 0,
          isForwarded: false,
        },
      }
    case "quotedMessage":
      return {
        typeMessage,
        extendedTextMessageData: {
          text,
          stanzaId: "116413118178426437",
          participant: "10000000",
        },
      }
    case "imageMessage":
      return {
        typeMessage,
        fileMessageData: {
          downloadUrl: "https://example.com/image.jpg",
          caption: text,
          fileName: "image.jpg",
          jpegThumbnail: "",
          mimeType: "image/jpeg",
        },
      }
  }
}

export function incomingTextBody({
  chatId,
  idMessage,
  text,
  timestamp = 1763115112,
  chatName = "Ходабрыш Пробешёлов",
  typeMessage = "textMessage",
  chatType = "user",
}: {
  chatId: string
  idMessage: string
  text: string
  timestamp?: number
  chatName?: string
  typeMessage?: IncomingType
  chatType?: "user" | "group"
}) {
  return {
    typeWebhook: "incomingMessageReceived",
    instanceData,
    timestamp,
    idMessage,
    senderData: {
      chatId,
      chatName,
      chatType,
      sender: chatType === "group" ? "10000000" : chatId,
      senderName: chatName,
      senderType: "user",
      senderContactName: chatType === "group" ? "" : chatName,
      senderPhoneNumber: chatType === "group" ? 0 : 79876543210,
    },
    messageData: messageData(typeMessage, text),
  }
}

export function outgoingTextBody({
  chatId,
  idMessage,
  text,
  timestamp = 1763115112,
  fromApi = true,
}: {
  chatId: string
  idMessage: string
  text: string
  timestamp?: number
  fromApi?: boolean
}) {
  return {
    typeWebhook: fromApi
      ? "outgoingAPIMessageReceived"
      : "outgoingMessageReceived",
    instanceData,
    timestamp,
    idMessage,
    senderData: {
      chatId,
      chatName: "Ходабрыш Пробешёлов",
      chatType: "user",
      sender: "10000000",
      senderName: "Ходабрыш Пробешёлов",
      senderType: "user",
      senderContactName: "Ходабрыш Пробешёлов",
      senderPhoneNumber: 79876543210,
    },
    messageData: messageData("textMessage", text),
  }
}

export function statusBody({
  chatId,
  idMessage,
  status,
  timestamp = 1755591519,
}: {
  chatId: string
  idMessage: string
  status: DeliveryStatus
  timestamp?: number
}) {
  return {
    typeWebhook: "outgoingMessageStatus",
    chatId,
    instanceData,
    timestamp,
    idMessage,
    status,
  }
}

export function stateBody(state: string, timestamp = 1755589527) {
  return {
    typeWebhook: "stateInstanceChanged",
    instanceData,
    timestamp,
    stateInstance: state,
  }
}
