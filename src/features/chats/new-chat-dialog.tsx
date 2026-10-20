"use client"

import { Loader2Icon } from "lucide-react"
import { useEffect, useId, useRef, useState, type FormEvent } from "react"

import { FilledInput } from "@/components/filled-input"
import { useGreenApi } from "@/components/green-api-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { resolveChatByPhone } from "@/features/chats/resolve-chat"
import { MESSENGER_NAMES, type MessengerType } from "@/lib/green-api/messenger"
import { normalizePhone } from "@/lib/phone"
import { useChatStore } from "@/store/chat-store"
import { useMessenger } from "@/store/session-store"

const PHONE_HINTS: Record<MessengerType, string> = {
  max: "Номер, зарегистрированный в MAX (+7 или +375)",
  whatsapp: "Номер с кодом страны, зарегистрированный в WhatsApp",
}

export function NewChatDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const client = useGreenApi()
  const messenger = useMessenger()
  const id = useId()
  const [phone, setPhone] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const pending = useRef<AbortController | null>(null)

  useEffect(() => () => pending.current?.abort(), [])

  function handleOpenChange(next: boolean) {
    if (!next) {
      pending.current?.abort()
      setPhone("")
      setError(null)
      setChecking(false)
    }
    onOpenChange(next)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = normalizePhone(phone, messenger)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }

    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setError(null)
    setChecking(true)
    try {
      const result = await resolveChatByPhone(
        client,
        messenger,
        parsed.digits,
        useChatStore.getState().phoneIndex,
        controller.signal,
      )
      if (controller.signal.aborted) return
      if (!result.ok) {
        setError(result.error)
        return
      }
      const { upsertChat, openChat } = useChatStore.getState()
      // No title: a new chat is named by its number, an existing one keeps its name.
      upsertChat({ chatId: result.chatId, phone: parsed.digits })
      openChat(result.chatId)
      handleOpenChange(false)
    } catch {
      // Only an abort reaches here: the dialog was closed mid-check.
    } finally {
      if (!controller.signal.aborted) setChecking(false)
    }
  }

  const inputId = `${id}-phone`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-3xl p-6 sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Новый чат</DialogTitle>
          <DialogDescription>
            Проверим номер в {MESSENGER_NAMES[messenger]} и откроем переписку
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit}
          className="flex flex-col gap-5"
        >
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor={inputId}>Номер телефона</FieldLabel>
            <FilledInput
              id={inputId}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="+7 999 123-45-67"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value)
                setError(null)
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${inputId}-${error ? "error" : "hint"}`}
            />
            {error ? (
              <FieldError id={`${inputId}-error`}>{error}</FieldError>
            ) : (
              <FieldDescription id={`${inputId}-hint`}>
                {PHONE_HINTS[messenger]}
              </FieldDescription>
            )}
          </Field>
          <Button
            type="submit"
            size="lg"
            disabled={checking}
            className="h-12 w-full rounded-xl text-base"
          >
            {checking ? (
              <>
                <Loader2Icon
                  className="size-5 motion-safe:animate-spin"
                  aria-hidden="true"
                />
                Проверяем номер…
              </>
            ) : (
              "Создать чат"
            )}
          </Button>
          <p className="text-center text-[13px] leading-4 text-tertiary">
            На бесплатном тарифе GREEN-API можно переписываться не больше чем с
            тремя чатами в месяц
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
