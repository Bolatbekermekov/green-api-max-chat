import { z } from "zod"

import type { InstanceState } from "@/lib/green-api/types"

const DELIVERY_STATUSES = [
  "delivered",
  "read",
  "failed",
  "noAccount",
  "notInGroup",
  // WhatsApp only. yellowCard is the deprecated name of suspended.
  "sent",
  "suspended",
  "yellowCard",
] as const

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

export type ChatEvent =
  | {
      type: "message"
      direction: "in" | "out"
      chatId: string
      idMessage: string
      /** null when the message is not text (photo, file, sticker…). */
      text: string | null
      /** Milliseconds since epoch. */
      timestamp: number
      chatName?: string
      /**
       * Phone digits of the other side: part of a WhatsApp chatId, or the
       * sender's number for incoming MAX messages when MAX shares it.
       */
      phone?: string
    }
  | {
      type: "status"
      chatId: string
      idMessage: string
      status: DeliveryStatus
      timestamp: number
    }
  | { type: "state"; state: InstanceState; timestamp: number }

const messageNotification = z.object({
  typeWebhook: z.enum([
    "incomingMessageReceived",
    "outgoingMessageReceived",
    "outgoingAPIMessageReceived",
  ]),
  timestamp: z.number(),
  idMessage: z.string(),
  senderData: z.object({
    chatId: z.string(),
    chatType: z.string().optional(),
    chatName: z.string().optional(),
    senderName: z.string().optional(),
    senderContactName: z.string().optional(),
    // 0 when the number is hidden.
    senderPhoneNumber: z.number().optional(),
  }),
  messageData: z.object({
    typeMessage: z.string(),
    textMessageData: z.object({ textMessage: z.string() }).optional(),
    extendedTextMessageData: z.object({ text: z.string() }).optional(),
  }),
})

const statusNotification = z.object({
  typeWebhook: z.literal("outgoingMessageStatus"),
  chatId: z.string(),
  idMessage: z.string(),
  timestamp: z.number(),
  status: z.enum(DELIVERY_STATUSES),
})

const stateNotification = z.object({
  typeWebhook: z.literal("stateInstanceChanged"),
  timestamp: z.number(),
  stateInstance: z.string(),
})

const notificationSchema = z.discriminatedUnion("typeWebhook", [
  messageNotification,
  statusNotification,
  stateNotification,
])

type MessageNotification = z.infer<typeof messageNotification>

// This app handles one-to-one chats only. MAX group chats have negative ids;
// WhatsApp marks groups, status updates and channels by the chatId suffix.
function isPersonalChat(chatId: string, chatType?: string): boolean {
  if (chatType === "group" || chatId.startsWith("-")) return false
  return !/@(g\.us|broadcast|newsletter)$/.test(chatId)
}

// "79001234567@c.us"; a "…@lid" chat hides the number.
function phoneFromChatId(chatId: string): string | undefined {
  return /^(\d+)@c\.us$/.exec(chatId)?.[1]
}

function extractText({
  typeMessage,
  textMessageData,
  extendedTextMessageData,
}: MessageNotification["messageData"]): string | null {
  if (typeMessage === "textMessage") return textMessageData?.textMessage ?? null
  // Text with a link arrives as extendedTextMessage, a reply as quotedMessage.
  if (
    typeMessage === "extendedTextMessage" ||
    typeMessage === "quotedMessage"
  ) {
    return extendedTextMessageData?.text ?? null
  }
  return null
}

export function parseNotification(body: unknown): ChatEvent | null {
  const parsed = notificationSchema.safeParse(body)
  if (!parsed.success) return null
  const notification = parsed.data

  switch (notification.typeWebhook) {
    case "outgoingMessageStatus":
      if (!isPersonalChat(notification.chatId)) return null
      return {
        type: "status",
        chatId: notification.chatId,
        idMessage: notification.idMessage,
        status: notification.status,
        timestamp: notification.timestamp * 1000,
      }

    case "stateInstanceChanged":
      return {
        type: "state",
        state: notification.stateInstance,
        timestamp: notification.timestamp * 1000,
      }

    default: {
      const { senderData } = notification
      if (!isPersonalChat(senderData.chatId, senderData.chatType)) return null
      const direction =
        notification.typeWebhook === "incomingMessageReceived" ? "in" : "out"
      // For our own messages the sender fields describe us, not the chat.
      const chatName =
        senderData.chatName ||
        (direction === "in"
          ? senderData.senderContactName || senderData.senderName
          : undefined) ||
        undefined
      const phone =
        phoneFromChatId(senderData.chatId) ??
        (direction === "in" && senderData.senderPhoneNumber
          ? String(senderData.senderPhoneNumber)
          : undefined)

      return {
        type: "message",
        direction,
        chatId: senderData.chatId,
        idMessage: notification.idMessage,
        text: extractText(notification.messageData),
        timestamp: notification.timestamp * 1000,
        chatName,
        ...(phone ? { phone } : {}),
      }
    }
  }
}
