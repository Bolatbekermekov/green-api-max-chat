import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GreenApiProvider } from "@/components/green-api-provider"
import { InstanceBanner } from "@/features/messenger/instance-banner"
import type { GreenApiClient } from "@/lib/green-api/client"
import { RECOMMENDED_SETTINGS } from "@/lib/green-api/settings"
import { initialSessionState, useSessionStore } from "@/store/session-store"
import { fakeGreenApiClient } from "@/test/fake-green-api-client"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function renderBanner(client: GreenApiClient = fakeGreenApiClient()) {
  render(
    <GreenApiProvider client={client}>
      <InstanceBanner />
    </GreenApiProvider>,
  )
  return userEvent.setup()
}

beforeEach(() => {
  useSessionStore.setState({
    ...initialSessionState,
    instanceState: "authorized",
  })
})

describe("InstanceBanner", () => {
  it("renders nothing when everything is fine", () => {
    renderBanner()
    expect(screen.queryByRole("region")).not.toBeInTheDocument()
  })

  it("fixes settings with one click", async () => {
    useSessionStore.setState({
      settingsIssues: [
        {
          key: "incomingWebhook",
          severity: "error",
          message: "Выключены уведомления о входящих сообщениях",
        },
      ],
    })
    const setSettings = vi.fn(async () => {})
    const user = renderBanner(fakeGreenApiClient({ setSettings }))

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Сообщения не будут приходить: выключены уведомления о входящих сообщениях",
    )
    await user.click(
      screen.getByRole("button", { name: "Исправить настройки" }),
    )

    expect(setSettings).toHaveBeenCalledWith(RECOMMENDED_SETTINGS)
    await waitFor(() =>
      expect(useSessionStore.getState().settingsIssues).toEqual([]),
    )
    expect(useSessionStore.getState().pollingEpoch).toBe(1)
    expect(toast.success).toHaveBeenCalledWith(
      "Настройки сохранены. Инстанс перезапустится — это займёт до 5 минут",
    )
  })

  it("explains a not authorized instance", () => {
    useSessionStore.setState({ instanceState: "notAuthorized" })
    renderBanner()

    expect(
      screen.getByText(
        "Инстанс не авторизован в MAX. Отсканируйте QR-код в консоли GREEN-API.",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Открыть консоль" }),
    ).toHaveAttribute("href", "https://console.green-api.com")
  })

  it("names WhatsApp for a WhatsApp instance", () => {
    useSessionStore.setState({
      messenger: "whatsapp",
      instanceState: "notAuthorized",
    })
    renderBanner()

    expect(
      screen.getByText(
        "Инстанс не авторизован в WhatsApp. Отсканируйте QR-код в консоли GREEN-API.",
      ),
    ).toBeInTheDocument()
  })

  it.each(["suspended", "yellowCard"])("explains a %s instance", (state) => {
    useSessionStore.setState({ messenger: "whatsapp", instanceState: state })
    renderBanner()

    expect(
      screen.getByText(
        "Отправка временно ограничена. Подробности — в консоли GREEN-API.",
      ),
    ).toBeInTheDocument()
  })

  it("shows reconnecting status", () => {
    useSessionStore.setState({ connection: "reconnecting" })
    renderBanner()

    expect(screen.getByRole("status")).toHaveTextContent(
      "Нет связи с GREEN-API. Переподключаемся…",
    )
  })
})
