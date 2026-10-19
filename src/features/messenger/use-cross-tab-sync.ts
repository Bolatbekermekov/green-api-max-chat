"use client"

import { useEffect } from "react"

import { CHAT_STORAGE_KEY, useChatStore } from "@/store/chat-store"
import { SESSION_STORAGE_KEY, useSessionStore } from "@/store/session-store"

/**
 * Only one tab polls (see withPollingLock); the others re-read what it saves,
 * so every open tab shows the same chats and a logout reaches all of them.
 */
export function useCrossTabSync() {
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === CHAT_STORAGE_KEY) void useChatStore.persist.rehydrate()
      if (event.key === SESSION_STORAGE_KEY) {
        void useSessionStore.persist.rehydrate()
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])
}
