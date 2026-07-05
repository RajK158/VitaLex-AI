import { cn } from "@/lib/utils"

export function Logo({
  className,
  markClassName,
  textClassName,
}: {
  className?: string
  markClassName?: string
  textClassName?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground",
          markClassName,
        )}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-5"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 13h3.2l1.6-3.8 2.6 8L14 8.5l1.3 4.5H20"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span
        className={cn(
          "text-lg font-semibold tracking-tight text-foreground",
          textClassName,
        )}
      >
        VitaLex
      </span>
    </span>
  )
}
