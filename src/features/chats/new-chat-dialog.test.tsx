import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GreenApiProvider } from "@/components/green-api-provider"
import { NewChatDialog } from "@/features/chats/new-chat-dialog"
import type { GreenApiClient } from "@/lib/green-api/client"
import { initialChatState, useChatStore } from "@/store/chat-store"
import { fakeGreenApiClient } from "@/test/fake-green-api-client"

function setup(checkAccount: GreenApiClient["checkAccount"]) {
  const client = fakeGreenApiClient({ checkAccount: vi.fn(checkAccount) })
  const onOpenChange = vi.fn()
  render(
    <GreenApiProvider client={client}>
      <NewChatDialog open onOpenChange={onOpenChange} />
    </GreenApiProvider>,
  )
  return { client, onOpenChange, user: userEvent.setup() }
}

const phoneField = () => screen.getByLabelText("Номер телефона")
const submit = () => screen.getByRole("button", { name: "Создать чат" })

beforeEach(() => {
  useChatStore.setState(initialChatState)
})

describe("NewChatDialog", () => {
  it("shows a phone error without calling the API", async () => {
    const { user, client } = setup(async () => ({ exist: true, chatId: "1" }))

    await user.type(phoneField(), "123")
    await user.click(submit())

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Номер должен начинаться с +7 или +375",
    )
    expect(client.checkAccount).not.toHaveBeenCalled()
  })

  it("creates and opens the chat on success", async () => {
    const { user, client, onOpenChange } = setup(async () => ({
      exist: true,
      chatId: "10000000",
    }))

    await user.type(phoneField(), "8 (999) 123-45-67")
    await user.click(submit())

    expect(client.checkAccount).toHaveBeenCalledWith(
      "79991234567",
      expect.any(AbortSignal),
    )
    const state = useChatStore.getState()
    expect(state.chats["10000000"]).toMatchObject({
      phone: "79991234567",
      title: "+7 999 123-45-67",
    })
    expect(state.activeChatId).toBe("10000000")
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("keeps the dialog open when the number has no MAX", async () => {
    const { user, onOpenChange } = setup(async () => ({
      exist: false,
      chatId: "",
    }))

    await user.type(phoneField(), "+7 999 123-45-67")
    await user.click(submit())

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "У номера +7 999 123-45-67 нет аккаунта MAX",
    )
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(useChatStore.getState().chats).toEqual({})
  })
})
