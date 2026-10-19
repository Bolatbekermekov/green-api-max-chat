const LETTER = /\p{L}/u

/** Up to two initials from the first words that contain letters; "#" otherwise. */
export function getInitials(title: string): string {
  const initials = title
    .split(/\s+/)
    .map((word) => word.match(LETTER)?.[0])
    .filter((letter): letter is string => Boolean(letter))
    .slice(0, 2)
    .join("")
    .toUpperCase()
  return initials || "#"
}

export const AVATAR_TONES = 6

/** A stable colour slot (0..5) for a chat, so its avatar never changes colour. */
export function getAvatarTone(seed: string): number {
  let hash = 0
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0
  }
  return Math.abs(hash) % AVATAR_TONES
}
