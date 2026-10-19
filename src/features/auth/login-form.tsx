"use client"

import {
  ChevronDownIcon,
  CircleAlertIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
} from "lucide-react"
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  verifyCredentials,
  type VerifyResult,
} from "@/features/auth/verify-credentials"
import { deriveApiUrl, normalizeApiUrl } from "@/lib/green-api/api-url"
import {
  createGreenApiClient,
  type GreenApiClient,
} from "@/lib/green-api/client"
import { describeError } from "@/lib/green-api/errors"
import type { Credentials } from "@/lib/green-api/types"
import { cn } from "@/lib/utils"

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}

const schema = z.object({
  idInstance: z
    .string()
    .trim()
    .regex(/^\d{4,}$/, "Укажите ID инстанса — это число из консоли GREEN-API"),
  apiTokenInstance: z.string().trim().min(1, "Укажите API-токен"),
  apiUrl: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || isHttpsUrl(value),
      "Адрес должен начинаться с https://",
    ),
})

type Values = z.input<typeof schema>
type FieldName = keyof Values

function validateField(name: FieldName, value: string): string | undefined {
  const result = schema.shape[name].safeParse(value)
  return result.success ? undefined : result.error.issues[0]?.message
}

export const fieldInputClass =
  "h-12 rounded-xl border-transparent bg-field px-4 text-base placeholder:text-tertiary md:text-base dark:bg-field focus-visible:border-ring"

type LoginFormProps = {
  onLoggedIn: (credentials: Credentials, result: VerifyResult) => void
  createClient?: (
    credentials: Credentials,
  ) => Pick<GreenApiClient, "getStateInstance" | "getSettings">
}

export function LoginForm({
  onLoggedIn,
  createClient = createGreenApiClient,
}: LoginFormProps) {
  const id = useId()
  const [values, setValues] = useState<Values>({
    idInstance: "",
    apiTokenInstance: "",
    apiUrl: "",
  })
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const pending = useRef<AbortController | null>(null)

  useEffect(() => () => pending.current?.abort(), [])

  function handleChange(name: FieldName) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setValues((current) => ({ ...current, [name]: value }))
      // Once a field shows an error, re-check it as the user fixes it.
      if (errors[name]) {
        setErrors((current) => ({
          ...current,
          [name]: validateField(name, value),
        }))
      }
    }
  }

  function handleBlur(name: FieldName) {
    return () => {
      // Untouched empty fields stay quiet until submit.
      if (!values[name] && !errors[name]) return
      setErrors((current) => ({
        ...current,
        [name]: validateField(name, values[name]),
      }))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      const next: Partial<Record<FieldName, string>> = {}
      for (const issue of parsed.error.issues) {
        const name = issue.path[0] as FieldName
        next[name] ??= issue.message
      }
      setErrors(next)
      const firstInvalid = Object.keys(next)[0]
      if (firstInvalid) {
        const element = event.currentTarget.elements.namedItem(firstInvalid)
        if (element instanceof HTMLElement) element.focus()
      }
      return
    }

    const { idInstance, apiTokenInstance, apiUrl } = parsed.data
    const credentials: Credentials = {
      idInstance,
      apiTokenInstance,
      apiUrl: normalizeApiUrl(apiUrl) || deriveApiUrl(idInstance),
    }

    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setErrors({})
    setApiError(null)
    setVerifying(true)
    try {
      const result = await verifyCredentials(
        createClient(credentials),
        controller.signal,
      )
      onLoggedIn(credentials, result)
    } catch (error) {
      if (!controller.signal.aborted) setApiError(describeError(error))
    } finally {
      if (!controller.signal.aborted) setVerifying(false)
    }
  }

  const fieldIds = {
    idInstance: `${id}-id`,
    apiTokenInstance: `${id}-token`,
    apiUrl: `${id}-url`,
  }
  const describedBy = (name: FieldName) =>
    errors[name] ? `${fieldIds[name]}-error` : undefined

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup className="gap-4">
        <Field data-invalid={Boolean(errors.idInstance)}>
          <FieldLabel htmlFor={fieldIds.idInstance}>
            ID инстанса (idInstance)
          </FieldLabel>
          <Input
            id={fieldIds.idInstance}
            name="idInstance"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            placeholder="Например, 3100000001"
            value={values.idInstance}
            onChange={handleChange("idInstance")}
            onBlur={handleBlur("idInstance")}
            aria-invalid={errors.idInstance ? true : undefined}
            aria-describedby={describedBy("idInstance")}
            className={fieldInputClass}
          />
          <FieldError id={`${fieldIds.idInstance}-error`}>
            {errors.idInstance}
          </FieldError>
        </Field>

        <Field data-invalid={Boolean(errors.apiTokenInstance)}>
          <FieldLabel htmlFor={fieldIds.apiTokenInstance}>
            API-токен (apiTokenInstance)
          </FieldLabel>
          <div className="relative">
            <Input
              id={fieldIds.apiTokenInstance}
              name="apiTokenInstance"
              type={showToken ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              placeholder="Скопируйте из консоли"
              value={values.apiTokenInstance}
              onChange={handleChange("apiTokenInstance")}
              onBlur={handleBlur("apiTokenInstance")}
              aria-invalid={errors.apiTokenInstance ? true : undefined}
              aria-describedby={describedBy("apiTokenInstance")}
              className={cn(fieldInputClass, "pr-12")}
            />
            <button
              type="button"
              onClick={() => setShowToken((shown) => !shown)}
              aria-label={showToken ? "Скрыть токен" : "Показать токен"}
              className="absolute inset-y-0 right-1 my-auto flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {showToken ? (
                <EyeOffIcon className="size-5" aria-hidden="true" />
              ) : (
                <EyeIcon className="size-5" aria-hidden="true" />
              )}
            </button>
          </div>
          <FieldError id={`${fieldIds.apiTokenInstance}-error`}>
            {errors.apiTokenInstance}
          </FieldError>
        </Field>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger className="group/advanced flex min-h-10 items-center gap-1 rounded-lg text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
            Дополнительно
            <ChevronDownIcon
              className="size-4 transition-transform group-data-[state=open]/advanced:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <Field data-invalid={Boolean(errors.apiUrl)}>
              <FieldLabel htmlFor={fieldIds.apiUrl}>
                Адрес API (apiUrl)
              </FieldLabel>
              <Input
                id={fieldIds.apiUrl}
                name="apiUrl"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder={
                  /^\d{4,}$/.test(values.idInstance.trim())
                    ? deriveApiUrl(values.idInstance.trim())
                    : "https://3100.api.green-api.com"
                }
                value={values.apiUrl}
                onChange={handleChange("apiUrl")}
                onBlur={handleBlur("apiUrl")}
                aria-invalid={errors.apiUrl ? true : undefined}
                aria-describedby={
                  describedBy("apiUrl") ?? `${fieldIds.apiUrl}-hint`
                }
                className={fieldInputClass}
              />
              {errors.apiUrl ? (
                <FieldError id={`${fieldIds.apiUrl}-error`}>
                  {errors.apiUrl}
                </FieldError>
              ) : (
                <FieldDescription id={`${fieldIds.apiUrl}-hint`}>
                  Оставьте пустым — определим по ID инстанса
                </FieldDescription>
              )}
            </Field>
          </CollapsibleContent>
        </Collapsible>
      </FieldGroup>

      {apiError && (
        <Alert
          variant="destructive"
          className="rounded-xl border-destructive/30 px-4 py-3"
        >
          <CircleAlertIcon aria-hidden="true" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={verifying}
        className="h-12 w-full rounded-xl text-base"
      >
        {verifying ? (
          <>
            <Loader2Icon
              className="size-5 motion-safe:animate-spin"
              aria-hidden="true"
            />
            Проверяем…
          </>
        ) : (
          "Войти"
        )}
      </Button>
    </form>
  )
}
