import { Star, Quote } from "lucide-react"

const stats = [
  { value: "1.2K+", label: "Documents processed" },
  { value: "300+", label: "Rules generated" },
  { value: "47", label: "Policy changes detected" },
  { value: "99.9%", label: "Secure workspace uptime" },
]

const testimonials = [
  {
    quote:
      "VitaLex helped our team understand policy changes without manually reading every document line by line.",
    name: "Maya Patel",
    role: "Billing Compliance Manager",
    initials: "MP",
  },
  {
    quote:
      "The rule conversion feature makes it much easier to turn policy language into logic our systems can use.",
    name: "Daniel Brooks",
    role: "Healthcare Data Analyst",
    initials: "DB",
  },
  {
    quote:
      "We can now organize guidelines, compare versions, and track approvals in one place.",
    name: "Sarah Kim",
    role: "Clinical Operations Lead",
    initials: "SK",
  },
]

export function Testimonials() {
  return (
    <section
      id="use-cases"
      className="relative overflow-hidden bg-primary py-20 text-primary-foreground sm:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 70% 70% at 50% 40%, black 30%, transparent 75%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/70">
            Trusted by healthcare teams
          </span>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for healthcare policy, compliance, and operations teams
          </h2>
        </div>

        {/* Stats */}
        <dl className="mt-14 grid grid-cols-2 gap-6 border-y border-white/10 py-10 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <dt className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {stat.value}
              </dt>
              <dd className="mt-1 text-sm text-primary-foreground/70">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>

        {/* Testimonials */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/10"
            >
              <Quote className="size-7 text-primary-foreground/30" />
              <div className="mt-3 flex gap-0.5" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-current text-primary-foreground" />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-pretty leading-relaxed text-primary-foreground/90">
                {t.quote}
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-10 place-items-center rounded-full bg-white/10 text-sm font-semibold ring-1 ring-white/15"
                >
                  {t.initials}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{t.name}</span>
                  <span className="block text-xs text-primary-foreground/60">
                    {t.role}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
