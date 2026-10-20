// Notification bodies shaped like the examples in the GREEN-API docs for MAX
// (green-api.com/v3/docs/api/receiving/notifications-format/) and WhatsApp
// (green-api.com/docs/api/receiving/notifications-format/). Used by unit
// and end-to-end tests only. Timestamps are in seconds, as the API sends them.

import type { Messenger } from "@/lib/green-api/messenger"
import type { DeliveryStatus } from "@/lib/green-api/notifications"

const instanceData: Record<Messenger, object> = {
  max: { idInstance: 3100000000, wid: "79991234567@c.us", typeInstance: "v3" },
  whatsapp: {
    idInstance: 1101111111,
    wid: "79876543210@c.us",
    typeInstance: "whatsapp",
  },
}

// WhatsApp sends no chatType, senderType or senderPhoneNumber: the phone is
// part of the chatId ("79001234567@c.us").
type SenderData = {
  chatId: string
  chatName: string
  chatType?: string
  sender: string
  senderName: string
  senderType?: string
  senderContactName: string
  senderPhoneNumber?: number
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
  messenger = "max",
}: {
  chatId: string
  idMessage: string
  text: string
  timestamp?: number
  chatName?: string
  typeMessage?: IncomingType
  /** MAX only: WhatsApp marks groups by the chatId suffix "@g.us". */
  chatType?: "user" | "group"
  messenger?: Messenger
}) {
  const group = chatType === "group"
  const senderData: SenderData =
    messenger === "max"
      ? {
          chatId,
          chatName,
          chatType,
          sender: group ? "10000000" : chatId,
          senderName: chatName,
          senderType: "user",
          senderContactName: group ? "" : chatName,
          senderPhoneNumber: group ? 0 : 79876543210,
        }
      : {
          chatId,
          chatName,
          sender: chatId,
          senderName: chatName,
          senderContactName: chatName,
        }
  return {
    typeWebhook: "incomingMessageReceived",
    instanceData: instanceData[messenger],
    timestamp,
    idMessage,
    senderData,
    messageData: messageData(typeMessage, text),
  }
}

export function outgoingTextBody({
  chatId,
  idMessage,
  text,
  timestamp = 1763115112,
  fromApi = true,
  messenger = "max",
}: {
  chatId: string
  idMessage: string
  text: string
  timestamp?: number
  fromApi?: boolean
  messenger?: Messenger
}) {
  const senderData: SenderData =
    messenger === "max"
      ? {
          chatId,
          chatName: "Ходабрыш Пробешёлов",
          chatType: "user",
          sender: "10000000",
          senderName: "Ходабрыш Пробешёлов",
          senderType: "user",
          senderContactName: "Ходабрыш Пробешёлов",
          senderPhoneNumber: 79876543210,
        }
      : {
          chatId,
          chatName: "Иван",
          sender: "79876543210@c.us",
          senderName: "",
          senderContactName: "",
        }
  return {
    typeWebhook: fromApi
      ? "outgoingAPIMessageReceived"
      : "outgoingMessageReceived",
    instanceData: instanceData[messenger],
    timestamp,
    idMessage,
    senderData,
    messageData: messageData("textMessage", text),
  }
}

export function statusBody({
  chatId,
  idMessage,
  status,
  timestamp = 1755591519,
  messenger = "max",
}: {
  chatId: string
  idMessage: string
  status: DeliveryStatus
  timestamp?: number
  messenger?: Messenger
}) {
  return {
    typeWebhook: "outgoingMessageStatus",
    chatId,
    instanceData: instanceData[messenger],
    timestamp,
    idMessage,
    status,
    ...(messenger === "whatsapp" ? { sendByApi: true } : {}),
  }
}

export function stateBody(
  state: string,
  timestamp = 1755589527,
  messenger: Messenger = "max",
) {
  return {
    typeWebhook: "stateInstanceChanged",
    instanceData: instanceData[messenger],
    timestamp,
    stateInstance: state,
  }
}
