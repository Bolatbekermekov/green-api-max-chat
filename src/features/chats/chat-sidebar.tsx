"use client"

import { MessageCirclePlusIcon, PlusIcon, SearchIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { useShallow } from "zustand/react/shallow"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChatListItem } from "@/features/chats/chat-list-item"
import { NewChatDialog } from "@/features/chats/new-chat-dialog"
import { cn } from "@/lib/utils"
import { selectChatList, useChatStore, type Chat } from "@/store/chat-store"

function matchesQuery(chat: Chat, query: string): boolean {
  const text = query.trim().toLowerCase()
  if (!text) return true
  if (chat.title.toLowerCase().includes(text)) return true
  const digits = text.replace(/\D/g, "")
  return Boolean(digits && chat.phone?.includes(digits))
}

export function ChatSidebar({ className }: { className?: string }) {
  const chats = useChatStore(useShallow(selectChatList))
  const messages = useChatStore((state) => state.messages)
  const activeChatId = useChatStore((state) => state.activeChatId)
  const openChat = useChatStore((state) => state.openChat)
  const [query, setQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)

  const visibleChats = useMemo(
    () => chats.filter((chat) => matchesQuery(chat, query)),
    [chats, query],
  )

  return (
    <aside
      className={cn("flex min-h-0 flex-col border-r bg-background", className)}
    >
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <h1 className="text-2xl leading-7 font-semibold">Чаты</h1>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          aria-label="Новый чат"
          className="flex size-10 items-center justify-center rounded-full bg-foreground text-background transition-opacity outline-none hover:opacity-85 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <PlusIcon className="size-5" aria-hidden="true" />
        </button>
      </header>

      <div className="relative px-4 pb-2">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-7 size-4 -translate-y-1/2 text-tertiary"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск"
          aria-label="Поиск по чатам"
          className="h-10 rounded-xl border-transparent bg-field pl-9 text-base placeholder:text-tertiary md:text-[15px] dark:bg-field"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {chats.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <MessageCirclePlusIcon
              className="size-10 text-tertiary"
              aria-hidden="true"
            />
            <p className="text-base font-medium">Чатов пока нет</p>
            <p className="text-sm text-muted-foreground">
              Напишите кому-нибудь в MAX по номеру телефона
            </p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="mt-1 h-10 rounded-xl px-5 text-[15px]"
            >
              Начать чат
            </Button>
          </div>
        ) : visibleChats.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Ничего не найдено
          </p>
        ) : (
          <ul aria-label="Список чатов" className="flex flex-col gap-0.5">
            {visibleChats.map((chat) => (
              <li key={chat.chatId}>
                <ChatListItem
                  chat={chat}
                  lastMessage={messages[chat.chatId]?.at(-1)}
                  active={chat.chatId === activeChatId}
                  onSelect={() => openChat(chat.chatId)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <NewChatDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </aside>
  )
}
