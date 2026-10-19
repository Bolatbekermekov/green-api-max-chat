import { ChevronLeftIcon } from "lucide-react"

import { InitialsAvatar } from "@/components/initials-avatar"
import { formatPhone } from "@/lib/phone"
import type { Chat } from "@/store/chat-store"

export function ConversationHeader({
  chat,
  onBack,
}: {
  chat: Chat
  onBack: () => void
}) {
  const phone = chat.phone ? formatPhone(chat.phone) : undefined
  const subtitle = phone && phone !== chat.title ? phone : "в MAX"

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-background px-2 md:px-4">
      <button
        type="button"
        onClick={onBack}
        aria-label="Назад к чатам"
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronLeftIcon className="size-6" aria-hidden="true" />
      </button>
      <InitialsAvatar title={chat.title} seed={chat.chatId} size="sm" />
      <div className="min-w-0">
        <h2 className="truncate text-[17px] leading-6 font-semibold">
          {chat.title}
        </h2>
        <p className="truncate text-[13px] leading-4 text-tertiary">
          {subtitle}
        </p>
      </div>
    </header>
  )
}
