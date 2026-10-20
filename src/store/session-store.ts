import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import type { MessengerType } from "@/lib/green-api/messenger"
import type { SettingsIssue } from "@/lib/green-api/settings"
import type { Credentials, InstanceState } from "@/lib/green-api/types"
import { useChatStore } from "@/store/chat-store"

export type ConnectionStatus = "online" | "reconnecting"

type SessionData = {
  credentials: Credentials | null
  /** Detected at login. Sessions saved before WhatsApp support have none. */
  messenger: MessengerType | null
  /** Last known instance state; refreshed on login and by notifications. */
  instanceState: InstanceState | null
  settingsIssues: SettingsIssue[]
  connection: ConnectionStatus
  /** Bumped to restart the polling loop (e.g. after fixing settings). */
  pollingEpoch: number
}

type SessionActions = {
  login(
    credentials: Credentials,
    result: {
      state: InstanceState
      issues: SettingsIssue[]
      messenger: MessengerType
    },
  ): void
  logout(): void
  setMessenger(messenger: MessengerType): void
  setInstanceState(state: InstanceState): void
  setSettingsIssues(issues: SettingsIssue[]): void
  setConnection(status: ConnectionStatus): void
  restartPolling(): void
}

export type SessionState = SessionData & SessionActions

export const SESSION_STORAGE_KEY = "max-chat:session"

export const initialSessionState: SessionData = {
  credentials: null,
  messenger: null,
  instanceState: null,
  settingsIssues: [],
  connection: "online",
  pollingEpoch: 0,
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...initialSessionState,

      login(credentials, { state, issues, messenger }) {
        useChatStore.getState().bindInstance(credentials.idInstance)
        set({
          credentials,
          messenger,
          instanceState: state,
          settingsIssues: issues,
          connection: "online",
        })
      },

      logout() {
        // Logging out forgets this device's chat history too.
        useChatStore.getState().clear()
        set((state) => ({
          ...initialSessionState,
          pollingEpoch: state.pollingEpoch,
        }))
      },

      setMessenger(messenger) {
        set({ messenger })
      },

      setInstanceState(instanceState) {
        set({ instanceState })
      },

      setSettingsIssues(settingsIssues) {
        set({ settingsIssues })
      },

      setConnection(connection) {
        set({ connection })
      },

      restartPolling() {
        set((state) => ({ pollingEpoch: state.pollingEpoch + 1 }))
      },
    }),
    {
      name: SESSION_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ credentials, messenger }) => ({ credentials, messenger }),
    },
  ),
)

// Sessions saved before WhatsApp support were all MAX.
export function selectMessenger(state: SessionState): MessengerType {
  return state.messenger ?? "max"
}

export function useMessenger(): MessengerType {
  return useSessionStore(selectMessenger)
}
