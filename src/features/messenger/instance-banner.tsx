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
import {
  RECOMMENDED_SETTINGS,
  type SettingsIssue,
} from "@/lib/green-api/settings"
import { cn } from "@/lib/utils"
import { useSessionStore } from "@/store/session-store"

const CONSOLE_URL = "https://console.green-api.com"

const STATE_MESSAGES: Record<string, string> = {
  notAuthorized:
    "Инстанс не авторизован в MAX. Отсканируйте QR-код в консоли GREEN-API.",
  starting: "Инстанс запускается — это может занять до 5 минут.",
  blocked: "Аккаунт MAX этого инстанса заблокирован.",
  suspended: "Инстанс приостановлен. Проверьте тариф в консоли GREEN-API.",
  pendingPassword:
    "Инстанс ждёт пароль от MAX. Завершите вход в консоли GREEN-API.",
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
        {STATE_MESSAGES[instanceState] ??
          `Инстанс недоступен (состояние: ${instanceState}).`}
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
