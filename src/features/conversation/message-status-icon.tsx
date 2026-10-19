import {
  CheckCheckIcon,
  CheckIcon,
  CircleAlertIcon,
  Clock3Icon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { MessageStatus } from "@/store/chat-store"

const STATUS: Record<
  MessageStatus,
  { icon: LucideIcon; label: string; className?: string }
> = {
  pending: { icon: Clock3Icon, label: "Отправляется" },
  sent: { icon: CheckIcon, label: "Отправлено" },
  delivered: { icon: CheckCheckIcon, label: "Доставлено" },
  read: { icon: CheckCheckIcon, label: "Прочитано", className: "text-brand" },
  failed: {
    icon: CircleAlertIcon,
    label: "Не отправлено",
    className: "text-destructive",
  },
}

export function MessageStatusIcon({
  status,
  className,
}: {
  status: MessageStatus
  className?: string
}) {
  const { icon: Icon, label, className: tone } = STATUS[status]
  return (
    <Icon
      role="img"
      aria-label={label}
      className={cn("size-4 shrink-0", tone, className)}
    />
  )
}
