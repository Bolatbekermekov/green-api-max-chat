import { beforeEach, describe, expect, it } from "vitest"

import { initialChatState, useChatStore } from "@/store/chat-store"
import {
  initialSessionState,
  selectMessenger,
  SESSION_STORAGE_KEY,
  useSessionStore,
} from "@/store/session-store"

const credentials = {
  idInstance: "3100000001",
  apiTokenInstance: "tok",
  apiUrl: "https://3100.api.green-api.com",
}
const issue = {
  key: "incomingWebhook" as const,
  severity: "error" as const,
  message: "Выключены уведомления о входящих сообщениях",
}
const session = () => useSessionStore.getState()

beforeEach(() => {
  useSessionStore.setState(initialSessionState)
  useChatStore.setState(initialChatState)
})

describe("session store", () => {
  it("login stores credentials and binds the chat store", () => {
    session().login(credentials, {
      state: "authorized",
      issues: [issue],
      messenger: "whatsapp",
    })

    expect(session()).toMatchObject({
      credentials,
      messenger: "whatsapp",
      instanceState: "authorized",
      settingsIssues: [issue],
      connection: "online",
    })
    expect(useChatStore.getState().instanceId).toBe("3100000001")
  })

  it("persists only the credentials and the messenger", () => {
    session().login(credentials, {
      state: "authorized",
      issues: [issue],
      messenger: "max",
    })

    const stored = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)!)
    expect(stored.state).toEqual({ credentials, messenger: "max" })
  })

  it("setMessenger replaces the messenger", () => {
    session().login(credentials, {
      state: "authorized",
      issues: [],
      messenger: "max",
    })
    session().setMessenger("whatsapp")

    expect(selectMessenger(session())).toBe("whatsapp")
  })

  it("treats a session saved before WhatsApp support as MAX", () => {
    useSessionStore.setState({ credentials, messenger: null })

    expect(selectMessenger(session())).toBe("max")
  })

  it("logout clears credentials and chat history", () => {
    session().login(credentials, {
      state: "authorized",
      issues: [],
      messenger: "whatsapp",
    })
    useChatStore.getState().upsertChat({ chatId: "10000000" })

    session().logout()

    expect(session().credentials).toBeNull()
    expect(session().messenger).toBeNull()
    expect(session().instanceState).toBeNull()
    expect(useChatStore.getState().chats).toEqual({})
    expect(useChatStore.getState().instanceId).toBeNull()
  })

  it("restartPolling increments pollingEpoch", () => {
    const before = session().pollingEpoch
    session().restartPolling()
    expect(session().pollingEpoch).toBe(before + 1)
  })
})
