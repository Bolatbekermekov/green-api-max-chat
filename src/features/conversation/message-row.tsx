import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent } from "@/components/ui/message"
import { MessageStatusIcon } from "@/features/conversation/message-status-icon"
import { formatMessageTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/store/chat-store"

export function MessageRow({
  message,
  groupedWithPrevious,
  onRetry,
}: {
  message: ChatMessage
  groupedWithPrevious: boolean
  onRetry?: () => void
}) {
  const own = message.direction === "out"
  const failed = message.status === "failed"

  return (
    <Message
      align={own ? "end" : "start"}
      className={cn("text-[15px]", groupedWithPrevious ? "pt-0.5" : "pt-2")}
    >
      <MessageContent className="gap-1">
        <Bubble
          align={own ? "end" : "start"}
          className={cn(
            "max-w-[min(85%,36rem)] md:max-w-[min(75%,36rem)]",
            own
              ? "*:data-[slot=bubble-content]:bg-bubble-out *:data-[slot=bubble-content]:text-bubble-out-foreground"
              : "*:data-[slot=bubble-content]:bg-bubble-in *:data-[slot=bubble-content]:text-bubble-in-foreground",
          )}
        >
          <BubbleContent className="rounded-2xl px-3 py-1.5 text-[15px] leading-5 shadow-xs">
            {message.text === null ? (
              <span className="italic opacity-80">
                Сообщение этого типа не поддерживается
              </span>
            ) : (
              <span className="whitespace-pre-wrap">{message.text}</span>
            )}
            {/* Floats into the last line when there is room, like in MAX. */}
            <span
              className={cn(
                "relative top-1 float-right ml-3 inline-flex items-center gap-1 text-xs leading-4",
                own ? "text-bubble-out-meta" : "text-bubble-in-meta",
              )}
            >
              <time dateTime={new Date(message.timestamp).toISOString()}>
                {formatMessageTime(message.timestamp)}
              </time>
              {own && message.status && (
                <MessageStatusIcon
                  status={message.status}
                  className={cn(
                    "size-3.5",
                    message.status === "read" && "text-bubble-out-read",
                    // Red on the dark violet bubble is unreadable; the error
                    // pill below the bubble carries the colour instead.
                    failed && "dark:text-current",
                  )}
                />
              )}
            </span>
          </BubbleContent>
        </Bubble>
        {failed && (
          <div className="flex items-center justify-end gap-2">
            <span className="rounded-full bg-background/95 px-3 py-1 text-[13px] text-destructive shadow-xs">
              {message.error ?? "Не отправлено"}
            </span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full bg-background/95 px-3 py-1 text-[13px] font-medium text-link shadow-xs transition-colors outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Повторить
              </button>
            )}
          </div>
        )}
      </MessageContent>
    </Message>
  )
}
