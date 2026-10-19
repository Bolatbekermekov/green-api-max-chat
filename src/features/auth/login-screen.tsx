"use client"

import { CircleHelpIcon } from "lucide-react"

import { AppLogo } from "@/components/app-logo"
import { ChatBackdrop } from "@/components/chat-backdrop"
import { ThemeToggle } from "@/components/theme-toggle"
import { LoginForm } from "@/features/auth/login-form"
import { useSessionStore } from "@/store/session-store"

const SETUP_GUIDE_URL = "https://green-api.com/v3/docs/before-start/"

/** Mirrors MAX's sign-in card, with GREEN-API credentials instead of a QR code. */
export function LoginScreen() {
  const login = useSessionStore((state) => state.login)

  return (
    <ChatBackdrop className="flex min-h-dvh items-center justify-center px-4 py-10">
      <main className="relative w-full max-w-[440px] rounded-[28px] bg-background px-6 pt-16 pb-8 shadow-xl sm:px-10">
        <div className="absolute inset-x-4 top-4 flex items-center justify-between">
          <ThemeToggle />
          <a
            href={SETUP_GUIDE_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Справка: как подготовить инстанс GREEN-API"
            className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <CircleHelpIcon className="size-5" aria-hidden="true" />
          </a>
        </div>

        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <AppLogo className="size-16" />
          <h1 className="text-xl leading-7 font-semibold">
            Вход в MAX через GREEN-API
          </h1>
          <p className="text-[15px] leading-5 text-muted-foreground">
            Введите данные инстанса из личного кабинета GREEN-API
          </p>
        </div>

        <LoginForm onLoggedIn={login} />

        <p className="mt-6 text-center text-[15px]">
          <a
            href={SETUP_GUIDE_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded font-medium text-link underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Где взять эти данные?
          </a>
        </p>
      </main>
    </ChatBackdrop>
  )
}
