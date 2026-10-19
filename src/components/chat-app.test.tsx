import { render, renderHook, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ChatApp } from "@/components/chat-app"
import { useGreenApi } from "@/components/green-api-provider"
import { initialChatState, useChatStore } from "@/store/chat-store"
import {
  initialSessionState,
  SESSION_STORAGE_KEY,
  useSessionStore,
} from "@/store/session-store"

vi.mock("@/features/auth/login-screen", () => ({
  LoginScreen: () => <h1>Экран входа</h1>,
}))
vi.mock("@/features/messenger/messenger", () => ({
  Messenger: () => <h1>Мессенджер</h1>,
}))

const credentials = {
  idInstance: "3100000001",
  apiTokenInstance: "tok",
  apiUrl: "https://3100.api.green-api.com",
}

beforeEach(() => {
  useSessionStore.setState(initialSessionState)
  useChatStore.setState(initialChatState)
})

describe("ChatApp", () => {
  it("shows the login screen when nobody is logged in", async () => {
    render(<ChatApp />)
    expect(
      await screen.findByRole("heading", { name: "Экран входа" }),
    ).toBeInTheDocument()
  })

  it("restores a saved session from localStorage", async () => {
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ state: { credentials }, version: 1 }),
    )

    render(<ChatApp />)

    expect(
      await screen.findByRole("heading", { name: "Мессенджер" }),
    ).toBeInTheDocument()
    expect(useChatStore.getState().instanceId).toBe("3100000001")
  })
})

describe("useGreenApi", () => {
  it("fails loudly outside GreenApiProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => renderHook(() => useGreenApi())).toThrow(
      "useGreenApi must be used inside GreenApiProvider",
    )
  })
})
