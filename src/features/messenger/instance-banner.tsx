"use client"

import {
  CircleAlertIcon,
  InfoIcon,
  Loader2Icon,
  WifiOffIcon,
} from "lucide-react"
import { useState, type ReactNode } from "react"
import { toast } from "sonner"
import { useShallow } from "zustand/react/shallow"

import { useGreenApi } from "@/components/green-api-provider"
import { describeError } from "@/lib/green-api/errors"
import { MESSENGER_NAMES } from "@/lib/green-api/messenger"
import {
  RECOMMENDED_SETTINGS,
  type SettingsIssue,
} from "@/lib/green-api/settings"
import type { InstanceState } from "@/lib/green-api/types"
import { cn } from "@/lib/utils"
import { useMessenger, useSessionStore } from "@/store/session-store"

const CONSOLE_URL = "https://console.green-api.com"

function stateMessage(state: InstanceState, messengerName: string): string {
  switch (state) {
    case "notAuthorized":
      return `Инстанс не авторизован в ${messengerName}. Отсканируйте QR-код в консоли GREEN-API.`
    case "starting":
      return "Инстанс запускается — это может занять до 5 минут."
    case "blocked":
      return `Аккаунт ${messengerName} этого инстанса заблокирован.`
    case "suspended":
    case "yellowCard":
      return "Отправка временно ограничена. Подробности — в консоли GREEN-API."
    case "pendingPassword":
      return `Инстанс ждёт пароль от ${messengerName}. Завершите вход в консоли GREEN-API.`
    default:
      return `Инстанс недоступен (состояние: ${state}).`
  }
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

function listIssues(issues: SettingsIssue[]): string {
  return issues.map((issue) => lowerFirst(issue.message)).join("; ")
}

const actionClass =
  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70"

function Banner({
  tone,
  children,
  action,
}: {
  tone: "error" | "info"
  children: ReactNode
  action?: ReactNode
}) {
  const Icon = tone === "error" ? CircleAlertIcon : InfoIcon
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-2 text-center text-sm",
        tone === "error" ? "bg-destructive/10" : "bg-accent",
      )}
    >
      <span className="inline-flex items-center gap-2">
        <Icon
          className={cn(
            "size-4 shrink-0",
            tone === "error" ? "text-destructive" : "text-brand",
          )}
          aria-hidden="true"
        />
        {children}
      </span>
      {action}
    </div>
  )
}

/** Explains anything that stops messages from arriving, with a fix if we can. */
export function InstanceBanner() {
  const client = useGreenApi()
  const messengerName = MESSENGER_NAMES[useMessenger()]
  const { settingsIssues, instanceState, connection } = useSessionStore(
    useShallow((state) => ({
      settingsIssues: state.settingsIssues,
      instanceState: state.instanceState,
      connection: state.connection,
    })),
  )
  const [fixing, setFixing] = useState(false)

  const errors = settingsIssues.filter((issue) => issue.severity === "error")
  const warnings = settingsIssues.filter(
    (issue) => issue.severity === "warning",
  )

  async function fixSettings() {
    setFixing(true)
    try {
      await client.setSettings(RECOMMENDED_SETTINGS)
      toast.success(
        "Настройки сохранены. Инстанс перезапустится — это займёт до 5 минут",
      )
      const session = useSessionStore.getState()
      session.setSettingsIssues([])
      session.restartPolling()
    } catch (error) {
      toast.error(describeError(error))
    } finally {
      setFixing(false)
    }
  }

  const fixButton = (label: string) => (
    <button
      type="button"
      onClick={fixSettings}
      disabled={fixing}
      className={cn(
        actionClass,
        "bg-primary text-primary-foreground hover:bg-primary/90",
      )}
    >
      {fixing && (
        <Loader2Icon
          className="size-3.5 motion-safe:animate-spin"
          aria-hidden="true"
        />
      )}
      {label}
    </button>
  )

  const banners: ReactNode[] = []

  if (errors.length > 0) {
    banners.push(
      <Banner
        key="errors"
        tone="error"
        action={fixButton("Исправить настройки")}
      >
        Сообщения не будут приходить: {listIssues(errors)}
      </Banner>,
    )
  }
  if (instanceState && instanceState !== "authorized") {
    banners.push(
      <Banner
        key="state"
        tone="error"
        action={
          <a
            href={CONSOLE_URL}
            target="_blank"
            rel="noreferrer"
            className={cn(actionClass, "bg-background text-link shadow-xs")}
          >
            Открыть консоль
          </a>
        }
      >
        {stateMessage(instanceState, messengerName)}
      </Banner>,
    )
  }
  if (connection === "reconnecting") {
    banners.push(
      <div
        key="connection"
        role="status"
        className="flex items-center justify-center gap-2 bg-accent px-4 py-2 text-sm"
      >
        <WifiOffIcon className="size-4 text-brand" aria-hidden="true" />
        Нет связи с GREEN-API. Переподключаемся…
      </div>,
    )
  }
  if (errors.length === 0 && warnings.length > 0) {
    banners.push(
      <Banner key="warnings" tone="info" action={fixButton("Включить")}>
        Не всё настроено: {listIssues(warnings)}
      </Banner>,
    )
  }
  if (banners.length === 0) return null
  return (
    <div
      role="region"
      aria-label="Состояние инстанса"
      className="shrink-0 divide-y divide-border border-b"
    >
      {banners}
    </div>
  )
}
