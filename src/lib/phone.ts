import type { MessengerType } from "@/lib/green-api/messenger"

export type PhoneParseResult =
  { ok: true; digits: string } | { ok: false; error: string }

// GREEN-API's CheckAccount for MAX accepts only Russian (+7) and
// Belarusian (+375) numbers.
const MAX_PHONE = /^(7\d{10}|375\d{9})$/
// WhatsApp works in any country. CheckWhatsapp takes 11 to 16 digits, and
// an international number has at most 15.
const INTERNATIONAL_PHONE = /^[1-9]\d{10,14}$/

const ERRORS: Record<MessengerType, string> = {
  max: "Номер должен начинаться с +7 или +375",
  whatsapp: "Введите номер с кодом страны, например +7 701 123-45-67",
}

/**
 * Turns a phone number typed in any common way ("+7 (999) 123-45-67",
 * "8 999 123 45 67", "9991234567") into digits with the country code.
 * A number typed with "+" already has its country code and is kept as is.
 */
export function normalizePhone(
  input: string,
  messenger: MessengerType = "max",
): PhoneParseResult {
  let digits = input.replace(/\D/g, "")

  if (digits === "") {
    return { ok: false, error: "Введите номер телефона" }
  }
  if (!input.trim().startsWith("+")) {
    if (digits.length === 11 && digits.startsWith("8")) {
      digits = `7${digits.slice(1)}`
    } else if (digits.length === 10) {
      digits = `7${digits}`
    }
  }
  const valid = messenger === "max" ? MAX_PHONE : INTERNATIONAL_PHONE
  if (!valid.test(digits)) {
    return { ok: false, error: ERRORS[messenger] }
  }
  return { ok: true, digits }
}

export function formatPhone(digits: string): string {
  const ru = /^7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(digits)
  if (ru) {
    return `+7 ${ru[1]} ${ru[2]}-${ru[3]}-${ru[4]}`
  }
  const by = /^375(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(digits)
  if (by) {
    return `+375 ${by[1]} ${by[2]}-${by[3]}-${by[4]}`
  }
  return `+${digits}`
}
