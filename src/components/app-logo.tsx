import { cn } from "@/lib/utils"

/** The app's own mark: a speech bubble on a blue-to-violet squircle. */
export function AppLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("size-12 shrink-0", className)}
    >
      <defs>
        <linearGradient id="app-logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2b8cff" />
          <stop offset="100%" stopColor="#5b57d6" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#app-logo-gradient)" />
      <path
        d="M32 15c-9.94 0-18 6.9-18 15.4 0 4.6 2.36 8.73 6.1 11.55L18.5 49l8.06-3.6c1.73.4 3.56.6 5.44.6 9.94 0 18-6.9 18-15.4S41.94 15 32 15Z"
        fill="#fff"
      />
      <circle cx="24.5" cy="30.5" r="2.6" fill="#2b8cff" />
      <circle cx="32" cy="30.5" r="2.6" fill="#4a72ec" />
      <circle cx="39.5" cy="30.5" r="2.6" fill="#5b57d6" />
    </svg>
  )
}
