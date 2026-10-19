/**
 * GREEN-API serves every instance from a host named after the first four
 * digits of its id (instance 3100000001 → https://3100.api.green-api.com),
 * the same apiUrl the console shows.
 */
export function deriveApiUrl(idInstance: string): string {
  return `https://${idInstance.slice(0, 4)}.api.green-api.com`
}

export function normalizeApiUrl(url: string): string {
  return url.trim().replace(/\/+$/, "")
}
