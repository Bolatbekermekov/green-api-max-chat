import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Composer } from "@/features/conversation/composer"

function setup({ maxLength = 4000 }: { maxLength?: number } = {}) {
  const onSend = vi.fn()
  render(<Composer onSend={onSend} maxLength={maxLength} />)
  return {
    onSend,
    user: userEvent.setup(),
    field: screen.getByRole("textbox", { name: "Сообщение" }),
    sendButton: screen.getByRole("button", { name: "Отправить" }),
  }
}

describe("Composer", () => {
  it("sends trimmed text on Enter and clears the field", async () => {
    const { user, field, onSend } = setup()

    await user.type(field, "  Привет  {Enter}")

    expect(onSend).toHaveBeenCalledExactlyOnceWith("Привет")
    expect(field).toHaveValue("")
  })

  it("inserts a newline on Shift+Enter", async () => {
    const { user, field, onSend } = setup()

    await user.type(field, "Первая{Shift>}{Enter}{/Shift}Вторая")

    expect(field).toHaveValue("Первая\nВторая")
    expect(onSend).not.toHaveBeenCalled()
  })

  it("does not send while an input method is composing", () => {
    const { field, onSend } = setup()

    fireEvent.change(field, { target: { value: "привет" } })
    fireEvent.keyDown(field, { key: "Enter", isComposing: true })

    expect(onSend).not.toHaveBeenCalled()
  })

  it("sends with the button", async () => {
    const { user, field, sendButton, onSend } = setup()

    await user.type(field, "Кнопкой")
    await user.click(sendButton)

    expect(onSend).toHaveBeenCalledExactlyOnceWith("Кнопкой")
  })

  it("disables sending for blank input", async () => {
    const { user, field, sendButton, onSend } = setup()
    expect(sendButton).toBeDisabled()

    await user.type(field, "   {Enter}")

    expect(sendButton).toBeDisabled()
    expect(onSend).not.toHaveBeenCalled()
  })

  it("limits the length and shows a counter near the limit", async () => {
    const { user, field } = setup()
    expect(field).toHaveAttribute("maxLength", "4000")

    await user.click(field)
    await user.paste("x".repeat(3600))

    expect(screen.getByText("3600/4000")).toBeInTheDocument()
  })

  it("follows the messenger's limit", async () => {
    const { user, field } = setup({ maxLength: 20000 })
    expect(field).toHaveAttribute("maxLength", "20000")

    await user.click(field)
    await user.paste("x".repeat(4000))
    expect(screen.queryByText(/\/20000$/)).not.toBeInTheDocument()

    await user.paste("x".repeat(15600))
    expect(screen.getByText("19600/20000")).toBeInTheDocument()
  })
})
