import { z } from "zod"

import type { InstanceState } from "@/lib/green-api/types"

export type DeliveryStatus =
  "delivered" | "read" | "failed" | "noAccount" | "notInGroup"

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
  status: z.enum(["delivered", "read", "failed", "noAccount", "notInGroup"]),
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

// Group chats have negative ids; this app handles one-to-one chats only.
function isGroupChat(chatId: string, chatType?: string): boolean {
  return chatType === "group" || chatId.startsWith("-")
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
      if (isGroupChat(notification.chatId)) return null
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
      if (isGroupChat(senderData.chatId, senderData.chatType)) return null
      const direction =
        notification.typeWebhook === "incomingMessageReceived" ? "in" : "out"
      // For our own messages the sender fields describe us, not the chat.
      const chatName =
        senderData.chatName ||
        (direction === "in"
          ? senderData.senderContactName || senderData.senderName
          : undefined) ||
        undefined

      return {
        type: "message",
        direction,
        chatId: senderData.chatId,
        idMessage: notification.idMessage,
        text: extractText(notification.messageData),
        timestamp: notification.timestamp * 1000,
        chatName,
      }
    }
  }
}
