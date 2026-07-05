import { Mail, Phone, MapPin } from "lucide-react"
import { Logo } from "@/components/logo"

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817-5.966 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065Zm1.782 13.019H3.555V9h3.564v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003Z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z" />
    </svg>
  )
}

const columns = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Policy Comparison", href: "#features" },
      { label: "Rule Generation", href: "#rules" },
      { label: "Integrations", href: "#features" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#use-cases" },
      { label: "Security", href: "#features" },
      { label: "Compliance", href: "#impact" },
      { label: "Contact", href: "mailto:hello@vitalex.com" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Documentation", href: "#rules" },
      { label: "Help Center", href: "#features" },
      { label: "Privacy Policy", href: "#contact" },
      { label: "Terms of Service", href: "#contact" },
    ],
  },
]

const socials = [
  { icon: XIcon, label: "X", href: "#" },
  { icon: LinkedInIcon, label: "LinkedIn", href: "#" },
  { icon: FacebookIcon, label: "Facebook", href: "#" },
]

export function SiteFooter() {
  return (
    <footer id="contact" className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Brand + contact */}
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground">
              AI-powered healthcare policy and content intelligence for modern
              healthcare teams.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-3">
                <Mail className="size-4 text-primary" />
                <a href="mailto:hello@vitalex.com" className="hover:text-foreground">
                  hello@vitalex.com
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="size-4 text-primary" />
                <a href="tel:+18008008000" className="hover:text-foreground">
                  +1 (800) 800-8000
                </a>
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="size-4 text-primary" />
                <span>LA, CA, USA</span>
              </li>
            </ul>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h3 className="text-sm font-semibold text-foreground">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-3">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-6 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} VitaLex, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            {socials.map((social) => {
              const Icon = social.icon
              return (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Icon />
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </footer>
  )
}
