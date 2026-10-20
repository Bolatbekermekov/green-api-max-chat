"use client"

import { LogOutIcon, MessageCircleIcon } from "lucide-react"
import { useState } from "react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MESSENGER_NAMES } from "@/lib/green-api/messenger"
import { cn } from "@/lib/utils"
import { useChatStore } from "@/store/chat-store"
import { useMessenger, useSessionStore } from "@/store/session-store"

const railItem =
  "flex min-h-14 w-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"

/** MAX's narrow left column, reduced to what this app has. */
export function NavRail({ className }: { className?: string }) {
  const openChat = useChatStore((state) => state.openChat)
  const logout = useSessionStore((state) => state.logout)
  const messengerName = MESSENGER_NAMES[useMessenger()]
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <nav
      aria-label="Разделы"
      className={cn(
        "flex w-[72px] shrink-0 flex-col items-center gap-1 border-r bg-background py-3",
        className,
      )}
    >
      <button
        type="button"
        aria-current="page"
        onClick={() => openChat(null)}
        className={cn(railItem, "text-brand hover:bg-accent")}
      >
        <MessageCircleIcon className="size-6" aria-hidden="true" />
        Чаты
      </button>

      <div className="flex-1" />

      <ThemeToggle withLabel />
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className={cn(
          railItem,
          "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <LogOutIcon className="size-5" aria-hidden="true" />
        Выйти
      </button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Выйти?</DialogTitle>
            <DialogDescription>
              История переписки на этом устройстве будет удалена. Сообщения в{" "}
              {messengerName} останутся.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <DialogClose asChild>
              <Button variant="secondary" className="h-11 rounded-xl px-5">
                Отмена
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={logout}
              className="h-11 rounded-xl px-5"
            >
              Выйти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </nav>
  )
}
