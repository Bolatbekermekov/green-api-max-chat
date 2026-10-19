export type PhoneParseResult =
  { ok: true; digits: string } | { ok: false; error: string }

// GREEN-API's CheckAccount for MAX accepts only Russian (+7) and
// Belarusian (+375) numbers.
const SUPPORTED_PHONE = /^(7\d{10}|375\d{9})$/

/**
 * Turns a phone number typed in any common way ("+7 (999) 123-45-67",
 * "8 999 123 45 67", "9991234567") into digits with the country code.
 */
export function normalizePhone(input: string): PhoneParseResult {
  let digits = input.replace(/\D/g, "")

  if (digits === "") {
    return { ok: false, error: "Введите номер телефона" }
  }
  if (digits.length === 11 && digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`
  } else if (digits.length === 10) {
    digits = `7${digits}`
  }
  if (!SUPPORTED_PHONE.test(digits)) {
    return { ok: false, error: "Номер должен начинаться с +7 или +375" }
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
