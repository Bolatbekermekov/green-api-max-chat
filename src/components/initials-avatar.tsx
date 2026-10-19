import { UserRoundIcon } from "lucide-react"

import { getAvatarTone, getInitials } from "@/lib/avatar"
import { cn } from "@/lib/utils"

const TONES = [
  "from-[#4ba6ff] to-[#0062d6]",
  "from-[#9a86ff] to-[#5b57d6]",
  "from-[#ff8a7a] to-[#d93f4c]",
  "from-[#ffbf5f] to-[#e2730a]",
  "from-[#4fd39a] to-[#17885a]",
  "from-[#4fc8e8] to-[#13809f]",
]

const SIZES = {
  sm: "size-10 text-base",
  md: "size-12 text-lg",
}

/** Decorative: the chat's name is always shown next to it. */
export function InitialsAvatar({
  title,
  seed,
  size = "md",
  className,
}: {
  title: string
  seed: string
  size?: keyof typeof SIZES
  className?: string
}) {
  const initials = getInitials(title)
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-linear-to-br font-medium text-white select-none",
        TONES[getAvatarTone(seed)],
        SIZES[size],
        className,
      )}
    >
      {/* Chats named by a phone number get a person icon, as in MAX. */}
      {initials === "#" ? <UserRoundIcon className="size-[55%]" /> : initials}
    </div>
  )
}
