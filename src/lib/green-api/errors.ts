export type GreenApiErrorCode =
  | "network"
  | "bad-request"
  | "webhook-url-set"
  | "not-authorized"
  | "instance-starting"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "rate-limited"
  | "quota-exceeded"
  | "check-limited"
  | "server"
  | "invalid-response"

export class GreenApiError extends Error {
  readonly code: GreenApiErrorCode
  readonly status?: number
  /** The reason GREEN-API gave, if any (English, as sent by the server). */
  readonly detail?: string

  constructor(
    code: GreenApiErrorCode,
    options: { status?: number; detail?: string } = {},
  ) {
    super(options.detail ? `${code}: ${options.detail}` : code)
    this.name = "GreenApiError"
    this.code = code
    this.status = options.status
    this.detail = options.detail
  }
}

const MESSAGES: Record<GreenApiErrorCode, string> = {
  network: "Нет связи с GREEN-API. Проверьте интернет и адрес API",
  "bad-request": "GREEN-API отклонил запрос",
  "webhook-url-set":
    "В настройках инстанса указан webhookUrl — сообщения через HTTP API не приходят",
  "not-authorized":
    "Инстанс не авторизован в MAX. Отсканируйте QR-код в консоли GREEN-API",
  "instance-starting": "Инстанс запускается. Попробуйте через минуту",
  unauthorized: "Неверный apiTokenInstance",
  forbidden:
    "Доступ запрещён. Проверьте idInstance и статус аккаунта GREEN-API",
  "not-found": "Инстанс не найден. Проверьте idInstance и адрес API",
  "rate-limited": "Слишком много запросов. Попробуйте через несколько секунд",
  "quota-exceeded":
    "Превышен лимит бесплатного тарифа GREEN-API (не больше 3 чатов)",
  "check-limited": "MAX временно ограничил проверку номеров. Попробуйте позже",
  server: "Сервер GREEN-API временно недоступен",
  "invalid-response": "Неожиданный ответ GREEN-API",
}

const GENERIC_MESSAGE = "Что-то пошло не так. Попробуйте ещё раз"

// Errors after which polling cannot recover without the user's action.
const FATAL_FOR_POLLING = new Set<GreenApiErrorCode>([
  "unauthorized",
  "forbidden",
  "not-found",
  "webhook-url-set",
])

function extractDetail(bodyText: string): string | undefined {
  const text = bodyText.trim()
  if (!text) return undefined
  try {
    const data: unknown = JSON.parse(text)
    if (data && typeof data === "object") {
      const { message, reason } = data as {
        message?: unknown
        reason?: unknown
      }
      if (typeof message === "string" && message) return message
      if (typeof reason === "string" && reason) return reason
    }
  } catch {
    // Plain-text body: use it as is.
  }
  return text.slice(0, 300)
}

// GREEN-API reports most problems as HTTP 400 with an English reason.
function classifyReason(text: string): GreenApiErrorCode {
  if (/webhook url is set/i.test(text)) return "webhook-url-set"
  if (/starting process/i.test(text)) return "instance-starting"
  if (/not authorized/i.test(text)) return "not-authorized"
  if (/limit reached/i.test(text)) return "check-limited"
  return "bad-request"
}

export function errorFromResponse(
  status: number,
  bodyText: string,
): GreenApiError {
  const options = { status, detail: extractDetail(bodyText) }
  switch (status) {
    case 401:
      return new GreenApiError("unauthorized", options)
    case 403:
      return new GreenApiError("forbidden", options)
    case 404:
      return new GreenApiError("not-found", options)
    case 429:
      return new GreenApiError("rate-limited", options)
    case 466:
      return new GreenApiError("quota-exceeded", options)
    case 469:
      return new GreenApiError("check-limited", options)
  }
  if (status >= 500) return new GreenApiError("server", options)
  return new GreenApiError(classifyReason(bodyText), options)
}

export function describeError(error: unknown): string {
  if (!(error instanceof GreenApiError)) return GENERIC_MESSAGE
  if (error.code === "bad-request" && error.detail) {
    return `${MESSAGES["bad-request"]}: ${error.detail}`
  }
  return MESSAGES[error.code]
}

export function isFatalPollingError(error: unknown): boolean {
  return error instanceof GreenApiError && FATAL_FOR_POLLING.has(error.code)
}
