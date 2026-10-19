import { InitialsAvatar } from "@/components/initials-avatar"
import { MessageStatusIcon } from "@/features/conversation/message-status-icon"
import { formatChatTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Chat, ChatMessage } from "@/store/chat-store"

const pluralRules = new Intl.PluralRules("ru")

function unreadLabel(count: number): string {
  return pluralRules.select(count) === "one"
    ? `${count} непрочитанное`
    : `${count} непрочитанных`
}

function previewText(message?: ChatMessage): string {
  if (!message) return "Нет сообщений"
  if (message.text === null) return "Сообщение не поддерживается"
  return message.text
}

export function ChatListItem({
  chat,
  lastMessage,
  active,
  onSelect,
}: {
  chat: Chat
  lastMessage?: ChatMessage
  active: boolean
  onSelect: () => void
}) {
  const own = lastMessage?.direction === "out"

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors outline-none hover:bg-field focus-visible:ring-3 focus-visible:ring-ring/50",
        active && "bg-accent hover:bg-accent",
      )}
    >
      <InitialsAvatar title={chat.title} seed={chat.chatId} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            data-slot="chat-title"
            className="truncate text-base leading-5 font-medium"
          >
            {chat.title}
          </span>
          <span className="ml-auto shrink-0 text-[13px] text-tertiary">
            {formatChatTime(lastMessage?.timestamp ?? chat.lastActivityAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-start gap-2">
          <p className="line-clamp-2 min-w-0 flex-1 text-[15px] leading-5 wrap-break-word text-muted-foreground">
            {own && lastMessage?.status && (
              <MessageStatusIcon
                status={lastMessage.status}
                className="mr-1 inline-block size-3.5 align-[-2px]"
              />
            )}
            {own && <span className="text-foreground">Вы: </span>}
            {previewText(lastMessage)}
          </p>
          {chat.unread > 0 && (
            <span
              aria-label={unreadLabel(chat.unread)}
              className="mt-0.5 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground"
            >
              {chat.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
