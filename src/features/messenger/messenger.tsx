"use client"

import { ChatBackdrop } from "@/components/chat-backdrop"
import { ChatSidebar } from "@/features/chats/chat-sidebar"
import { Conversation } from "@/features/conversation/conversation"
import { NavRail } from "@/features/messenger/nav-rail"
import { cn } from "@/lib/utils"
import { useChatStore } from "@/store/chat-store"

/**
 * web.max.ru layout: navigation rail, chat list, conversation. Below the md
 * breakpoint only one of list or conversation is shown, like the mobile app.
 */
export function Messenger() {
  const activeChatId = useChatStore((state) =>
    state.activeChatId && state.chats[state.activeChatId]
      ? state.activeChatId
      : null,
  )

  return (
    <div className="flex h-dvh overflow-hidden bg-surface">
      <NavRail className={cn(activeChatId && "hidden md:flex")} />
      <ChatSidebar
        className={cn(
          "w-full md:w-[360px] md:shrink-0 lg:w-[400px]",
          activeChatId && "hidden md:flex",
        )}
      />
      <main
        className={cn(
          "min-w-0 flex-1 flex-col",
          activeChatId ? "flex" : "hidden md:flex",
        )}
      >
        {activeChatId ? (
          <Conversation key={activeChatId} chatId={activeChatId} />
        ) : (
          <ChatBackdrop className="flex flex-1 items-center justify-center p-6">
            <p className="rounded-full bg-chip px-4 py-1.5 text-sm font-medium text-chip-foreground">
              Выберите чат или создайте новый
            </p>
          </ChatBackdrop>
        )}
      </main>
    </div>
  )
}
