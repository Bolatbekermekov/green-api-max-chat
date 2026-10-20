import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { LoginForm } from "@/features/auth/login-form"
import type { GreenApiClient } from "@/lib/green-api/client"
import { GreenApiError } from "@/lib/green-api/errors"
import type { Credentials, InstanceSettings } from "@/lib/green-api/types"

const settings: InstanceSettings = {
  webhookUrl: "",
  incomingWebhook: "yes",
  outgoingWebhook: "yes",
  outgoingMessageWebhook: "yes",
  outgoingAPIMessageWebhook: "yes",
  stateWebhook: "yes",
  typeInstance: "v3",
}

function setup({
  getStateInstance = vi.fn(async () => "authorized"),
  typeInstance = settings.typeInstance,
}: {
  getStateInstance?: () => Promise<string>
  typeInstance?: string
} = {}) {
  const onLoggedIn = vi.fn()
  const createClient = vi.fn<
    (
      credentials: Credentials,
    ) => Pick<GreenApiClient, "getStateInstance" | "getSettings">
  >(() => ({
    getStateInstance,
    getSettings: vi.fn(async () => ({ ...settings, typeInstance })),
  }))
  render(<LoginForm onLoggedIn={onLoggedIn} createClient={createClient} />)
  return { onLoggedIn, createClient, user: userEvent.setup() }
}

const idField = () => screen.getByLabelText("ID инстанса (idInstance)")
const tokenField = () => screen.getByLabelText("API-токен (apiTokenInstance)")
const submit = () => screen.getByRole("button", { name: "Войти" })

describe("LoginForm", () => {
  it("shows field errors when submitting an empty form", async () => {
    const { user, createClient } = setup()

    await user.click(submit())

    expect(
      screen.getByText("Укажите ID инстанса — это число из консоли GREEN-API"),
    ).toBeInTheDocument()
    expect(screen.getByText("Укажите API-токен")).toBeInTheDocument()
    expect(idField()).toHaveAttribute("aria-invalid", "true")
    expect(createClient).not.toHaveBeenCalled()
  })

  it("validates the instance id when the field loses focus", async () => {
    const { user } = setup()

    await user.type(idField(), "abc")
    await user.tab()

    expect(
      screen.getByText("Укажите ID инстанса — это число из консоли GREEN-API"),
    ).toBeInTheDocument()
  })

  it("logs in with trimmed values and a derived apiUrl", async () => {
    const { user, createClient, onLoggedIn } = setup()

    await user.type(idField(), "  3100000001 ")
    await user.type(tokenField(), " tok ")
    await user.click(submit())

    const credentials = {
      idInstance: "3100000001",
      apiTokenInstance: "tok",
      apiUrl: "https://3100.api.green-api.com",
    }
    expect(createClient).toHaveBeenCalledWith(credentials)
    expect(onLoggedIn).toHaveBeenCalledWith(credentials, {
      state: "authorized",
      issues: [],
      messenger: "max",
    })
  })

  it("explains that only MAX and WhatsApp instances work", async () => {
    const { user, onLoggedIn } = setup({ typeInstance: "telegram" })

    await user.type(idField(), "7700000001")
    await user.type(tokenField(), "tok")
    await user.click(submit())

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Чат работает с инстансами MAX и WhatsApp",
    )
    expect(onLoggedIn).not.toHaveBeenCalled()
  })

  it("uses a custom apiUrl when provided", async () => {
    const { user, createClient } = setup()

    await user.type(idField(), "3100000001")
    await user.type(tokenField(), "tok")
    await user.click(screen.getByRole("button", { name: "Дополнительно" }))
    await user.type(
      screen.getByLabelText("Адрес API (apiUrl)"),
      "https://api.green-api.com/",
    )
    await user.click(submit())

    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({ apiUrl: "https://api.green-api.com" }),
    )
  })

  it("rejects an apiUrl that is not https", async () => {
    const { user, createClient } = setup()

    await user.type(idField(), "3100000001")
    await user.type(tokenField(), "tok")
    await user.click(screen.getByRole("button", { name: "Дополнительно" }))
    await user.type(screen.getByLabelText("Адрес API (apiUrl)"), "http://x")
    await user.click(submit())

    expect(
      screen.getByText("Адрес должен начинаться с https://"),
    ).toBeInTheDocument()
    expect(createClient).not.toHaveBeenCalled()
  })

  it("shows a Russian error for a wrong token", async () => {
    const { user, onLoggedIn } = setup({
      getStateInstance: vi.fn(async () => {
        throw new GreenApiError("unauthorized", { status: 401 })
      }),
    })

    await user.type(idField(), "3100000001")
    await user.type(tokenField(), "wrong")
    await user.click(submit())

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Неверный apiTokenInstance",
    )
    expect(onLoggedIn).not.toHaveBeenCalled()
    expect(submit()).toBeEnabled()
  })

  it("shows and hides the token", async () => {
    const { user } = setup()
    expect(tokenField()).toHaveAttribute("type", "password")

    await user.click(screen.getByRole("button", { name: "Показать токен" }))
    expect(tokenField()).toHaveAttribute("type", "text")

    await user.click(screen.getByRole("button", { name: "Скрыть токен" }))
    expect(tokenField()).toHaveAttribute("type", "password")
  })
})
