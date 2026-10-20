import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { NavRail } from "@/features/messenger/nav-rail"
import { initialSessionState, useSessionStore } from "@/store/session-store"

beforeEach(() => {
  useSessionStore.setState({ ...initialSessionState, messenger: "whatsapp" })
})

describe("NavRail", () => {
  it("warns before logout that only this device forgets the chats", async () => {
    const user = userEvent.setup()
    render(<NavRail />)

    await user.click(screen.getByRole("button", { name: "Выйти" }))

    expect(screen.getByRole("dialog", { name: "Выйти?" })).toHaveTextContent(
      "История переписки на этом устройстве будет удалена. Сообщения в WhatsApp останутся.",
    )
  })
})
