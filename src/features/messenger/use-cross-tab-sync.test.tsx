import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { useCrossTabSync } from "@/features/messenger/use-cross-tab-sync"
import {
  CHAT_STORAGE_KEY,
  initialChatState,
  useChatStore,
} from "@/store/chat-store"

beforeEach(() => {
  useChatStore.setState(initialChatState)
})

describe("useCrossTabSync", () => {
  it("picks up chats written by another tab", async () => {
    renderHook(() => useCrossTabSync())

    localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify({
        state: {
          instanceId: "3100000001",
          chats: {
            "10000000": {
              chatId: "10000000",
              title: "Иван",
              lastActivityAt: 1,
              unread: 1,
            },
          },
          messages: {},
          phoneIndex: {},
        },
        version: 1,
      }),
    )
    window.dispatchEvent(new StorageEvent("storage", { key: CHAT_STORAGE_KEY }))

    await waitFor(() =>
      expect(useChatStore.getState().chats["10000000"]?.title).toBe("Иван"),
    )
  })
})
