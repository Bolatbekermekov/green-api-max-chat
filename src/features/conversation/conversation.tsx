"use client"

import { ArrowDownIcon } from "lucide-react"
import { useEffect, useMemo } from "react"

import { ChatBackdrop } from "@/components/chat-backdrop"
import { useGreenApi } from "@/components/green-api-provider"
import { Marker, MarkerContent } from "@/components/ui/marker"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from "@/components/ui/message-scroller"
import { Composer } from "@/features/conversation/composer"
import { ConversationHeader } from "@/features/conversation/conversation-header"
import { MessageRow } from "@/features/conversation/message-row"
import {
  retryChatMessage,
  sendChatMessage,
} from "@/features/conversation/send-message"
import { buildTimeline } from "@/features/conversation/timeline"
import { useChatStore, type ChatMessage } from "@/store/chat-store"

const NO_MESSAGES: ChatMessage[] = []

export function Conversation({ chatId }: { chatId: string }) {
  const chat = useChatStore((state) => state.chats[chatId])
  const openChat = useChatStore((state) => state.openChat)

  useEffect(() => {
    openChat(chatId)
  }, [chatId, openChat])

  if (!chat) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ConversationHeader chat={chat} onBack={() => openChat(null)} />
      <ChatBackdrop className="flex min-h-0 flex-1 flex-col">
        <MessageScrollerProvider autoScroll defaultScrollPosition="end">
          <Transcript chatId={chatId} />
        </MessageScrollerProvider>
      </ChatBackdrop>
    </div>
  )
}

function Transcript({ chatId }: { chatId: string }) {
  const client = useGreenApi()
  const messages = useChatStore(
    (state) => state.messages[chatId] ?? NO_MESSAGES,
  )
  const timeline = useMemo(() => buildTimeline(messages), [messages])
  const { scrollToEnd } = useMessageScroller()

  function handleSend(text: string) {
    void sendChatMessage({ client, chatId, text })
    // Our own message always brings the view to the bottom.
    requestAnimationFrame(() => scrollToEnd({ behavior: "smooth" }))
  }

  return (
    <>
      <div className="relative min-h-0 flex-1">
        <MessageScroller>
          <MessageScrollerViewport aria-label="Сообщения">
            <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-0 px-3 pt-3 pb-4 md:px-6">
              {timeline.length === 0 ? (
                <MessageScrollerItem className="flex min-h-full items-center justify-center">
                  <p className="rounded-full bg-chip px-4 py-1.5 text-sm font-medium text-chip-foreground">
                    Сообщений пока нет. Напишите первым!
                  </p>
                </MessageScrollerItem>
              ) : (
                timeline.map((item) =>
                  item.kind === "day" ? (
                    <MessageScrollerItem key={item.key} className="py-2">
                      <Marker className="justify-center">
                        <MarkerContent className="rounded-full bg-chip px-3 py-1 text-[13px] font-medium text-chip-foreground">
                          {item.label}
                        </MarkerContent>
                      </Marker>
                    </MessageScrollerItem>
                  ) : (
                    <MessageScrollerItem key={item.key} messageId={item.key}>
                      <MessageRow
                        message={item.message}
                        groupedWithPrevious={item.groupedWithPrevious}
                        onRetry={() =>
                          void retryChatMessage({
                            client,
                            chatId,
                            localId: item.message.id,
                          })
                        }
                      />
                    </MessageScrollerItem>
                  ),
                )
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton className="size-10 rounded-full shadow-md">
            <ArrowDownIcon aria-hidden="true" />
            <span className="sr-only">К последним сообщениям</span>
          </MessageScrollerButton>
        </MessageScroller>
      </div>
      <div className="shrink-0 px-3 pb-3 md:px-6 md:pb-4">
        <Composer onSend={handleSend} />
      </div>
    </>
  )
}
