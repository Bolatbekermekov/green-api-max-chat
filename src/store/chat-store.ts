import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import type { ChatEvent, DeliveryStatus } from "@/lib/green-api/notifications"
import { formatPhone } from "@/lib/phone"

export type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed"

export type ChatMessage = {
  /** Stable key: idMessage for received messages, "local:…" for ours. */
  id: string
  /** GREEN-API id; unique only within a chat. Missing until a send succeeds. */
  idMessage?: string
  chatId: string
  direction: "in" | "out"
  /** null for messages that are not text. */
  text: string | null
  timestamp: number
  /** Outgoing messages only. */
  status?: MessageStatus
  error?: string
}

export type Chat = {
  chatId: string
  title: string
  phone?: string
  lastActivityAt: number
  unread: number
}

type ChatData = {
  instanceId: string | null
  chats: Record<string, Chat>
  /** Ascending by timestamp. */
  messages: Record<string, ChatMessage[]>
  /** Phone digits → chatId, so a known number costs no CheckAccount call. */
  phoneIndex: Record<string, string>
  activeChatId: string | null
}

type ChatActions = {
  bindInstance(idInstance: string): void
  upsertChat(input: { chatId: string; title?: string; phone?: string }): void
  openChat(chatId: string | null): void
  addPendingMessage(chatId: string, text: string, now?: number): string
  markSent(chatId: string, localId: string, idMessage: string): void
  markFailed(chatId: string, localId: string, error: string): void
  markPending(chatId: string, localId: string): void
  applyEvent(event: Exclude<ChatEvent, { type: "state" }>): void
  clear(): void
}

export type ChatState = ChatData & ChatActions

export const CHAT_STORAGE_KEY = "max-chat:chats"

export const initialChatState: ChatData = {
  instanceId: null,
  chats: {},
  messages: {},
  phoneIndex: {},
  activeChatId: null,
}

const STATUS_RANK: Record<MessageStatus, number> = {
  pending: 0,
  failed: 0,
  sent: 1,
  delivered: 2,
  read: 3,
}

const FAILURE_REASONS: Partial<Record<DeliveryStatus, string>> = {
  failed: "Не удалось доставить сообщение",
  noAccount: "У получателя нет аккаунта в мессенджере",
  notInGroup: "Вы не участник этого чата",
  suspended: "Отправка временно ограничена",
  yellowCard: "Отправка временно ограничена",
}

function toMessageStatus(status: DeliveryStatus): MessageStatus {
  switch (status) {
    case "sent":
    case "delivered":
    case "read":
      return status
    default:
      return "failed"
  }
}

// Not crypto.randomUUID(): it is missing outside secure contexts (plain
// http on a LAN address), and these ids only need to be unique locally.
function createLocalId(): string {
  return `local:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function defaultTitle(chatId: string, phone?: string): string {
  return phone ? formatPhone(phone) : `Чат ${chatId}`
}

function hasPlaceholderTitle(chat: Chat): boolean {
  return chat.title === defaultTitle(chat.chatId, chat.phone)
}

// GREEN-API timestamps have one-second precision while our own messages carry
// milliseconds, so order by whole seconds and keep arrival order inside one.
const toSecond = (timestamp: number) => Math.floor(timestamp / 1000)

function insertSorted(
  list: ChatMessage[],
  message: ChatMessage,
): ChatMessage[] {
  const second = toSecond(message.timestamp)
  const index = list.findIndex((m) => toSecond(m.timestamp) > second)
  if (index === -1) return [...list, message]
  return [...list.slice(0, index), message, ...list.slice(index)]
}

function upgradeStatus(
  current: MessageStatus | undefined,
  next: MessageStatus,
): boolean {
  const rank = STATUS_RANK[current ?? "pending"]
  // A failure only replaces "not yet delivered" states.
  if (next === "failed") return rank <= STATUS_RANK.sent
  return STATUS_RANK[next] > rank
}

function ensureChat(
  chats: Record<string, Chat>,
  chatId: string,
  now: number,
): Chat {
  return (
    chats[chatId] ?? {
      chatId,
      title: defaultTitle(chatId),
      lastActivityAt: now,
      unread: 0,
    }
  )
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => {
      function updateMessages(
        chatId: string,
        update: (list: ChatMessage[]) => ChatMessage[],
      ) {
        set((state) => ({
          messages: {
            ...state.messages,
            [chatId]: update(state.messages[chatId] ?? []),
          },
        }))
      }

      function updateMessage(
        chatId: string,
        id: string,
        patch: (message: ChatMessage) => ChatMessage,
      ) {
        updateMessages(chatId, (list) =>
          list.map((message) => (message.id === id ? patch(message) : message)),
        )
      }

      return {
        ...initialChatState,

        bindInstance(idInstance) {
          if (get().instanceId === idInstance) return
          set({ ...initialChatState, instanceId: idInstance })
        },

        upsertChat({ chatId, title, phone }) {
          set((state) => {
            const existing = state.chats[chatId]
            const chat: Chat = existing
              ? {
                  ...existing,
                  phone: phone ?? existing.phone,
                  title: title ?? existing.title,
                }
              : {
                  chatId,
                  phone,
                  title: title ?? defaultTitle(chatId, phone),
                  lastActivityAt: Date.now(),
                  unread: 0,
                }
            return {
              chats: { ...state.chats, [chatId]: chat },
              phoneIndex: phone
                ? { ...state.phoneIndex, [phone]: chatId }
                : state.phoneIndex,
            }
          })
        },

        openChat(chatId) {
          set((state) => {
            const chat = chatId ? state.chats[chatId] : undefined
            return {
              activeChatId: chatId,
              chats:
                chat && chat.unread > 0
                  ? { ...state.chats, [chat.chatId]: { ...chat, unread: 0 } }
                  : state.chats,
            }
          })
        },

        addPendingMessage(chatId, text, now = Date.now()) {
          const id = createLocalId()
          set((state) => {
            const chat = ensureChat(state.chats, chatId, now)
            return {
              chats: {
                ...state.chats,
                [chatId]: {
                  ...chat,
                  lastActivityAt: Math.max(chat.lastActivityAt, now),
                },
              },
              messages: {
                ...state.messages,
                [chatId]: insertSorted(state.messages[chatId] ?? [], {
                  id,
                  chatId,
                  direction: "out",
                  text,
                  timestamp: now,
                  status: "pending",
                }),
              },
            }
          })
          return id
        },

        markSent(chatId, localId, idMessage) {
          updateMessages(chatId, (list) => {
            // The API echo of this message may have been received first.
            const echo = list.find(
              (m) => m.idMessage === idMessage && m.id !== localId,
            )
            return list
              .filter((m) => m !== echo)
              .map((m) => {
                if (m.id !== localId) return m
                let status: MessageStatus = upgradeStatus(m.status, "sent")
                  ? "sent"
                  : (m.status ?? "sent")
                if (echo?.status && upgradeStatus(status, echo.status)) {
                  status = echo.status
                }
                return { ...m, idMessage, status, error: undefined }
              })
          })
        },

        markFailed(chatId, localId, error) {
          updateMessage(chatId, localId, (m) => ({
            ...m,
            status: "failed",
            error,
          }))
        },

        markPending(chatId, localId) {
          updateMessage(chatId, localId, (m) => ({
            ...m,
            status: "pending",
            error: undefined,
          }))
        },

        applyEvent(event) {
          const { chatId } = event

          if (event.type === "status") {
            const next = toMessageStatus(event.status)
            updateMessages(chatId, (list) =>
              list.map((m) =>
                m.idMessage === event.idMessage && upgradeStatus(m.status, next)
                  ? { ...m, status: next, error: FAILURE_REASONS[event.status] }
                  : m,
              ),
            )
            return
          }

          set((state) => {
            const list = state.messages[chatId] ?? []
            if (list.some((m) => m.idMessage === event.idMessage)) return state

            const chat = ensureChat(state.chats, chatId, event.timestamp)
            const phone = chat.phone ?? event.phone
            const placeholder = hasPlaceholderTitle(chat)
            const title =
              event.chatName && placeholder
                ? event.chatName
                : placeholder
                  ? defaultTitle(chatId, phone)
                  : chat.title
            const isUnread =
              event.direction === "in" && state.activeChatId !== chatId
            const message: ChatMessage = {
              id: event.idMessage,
              idMessage: event.idMessage,
              chatId,
              direction: event.direction,
              text: event.text,
              timestamp: event.timestamp,
              ...(event.direction === "out" ? { status: "sent" as const } : {}),
            }
            return {
              chats: {
                ...state.chats,
                [chatId]: {
                  ...chat,
                  phone,
                  title,
                  lastActivityAt: Math.max(
                    chat.lastActivityAt,
                    event.timestamp,
                  ),
                  unread: chat.unread + (isUnread ? 1 : 0),
                },
              },
              messages: {
                ...state.messages,
                [chatId]: insertSorted(list, message),
              },
              // A known number later opens this chat without a CheckAccount call.
              phoneIndex:
                phone && !state.phoneIndex[phone]
                  ? { ...state.phoneIndex, [phone]: chatId }
                  : state.phoneIndex,
            }
          })
        },

        clear() {
          set(initialChatState)
        },
      }
    },
    {
      name: CHAT_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ instanceId, chats, messages, phoneIndex }) => ({
        instanceId,
        chats,
        messages,
        phoneIndex,
      }),
    },
  ),
)

export function selectChatList(state: ChatState): Chat[] {
  return Object.values(state.chats).sort(
    (a, b) => b.lastActivityAt - a.lastActivityAt,
  )
}

export function selectLastMessage(
  state: ChatState,
  chatId: string,
): ChatMessage | undefined {
  return state.messages[chatId]?.at(-1)
}
