import { FileText, Building2, ShieldAlert, ListChecks } from "lucide-react"

const cards = [
  {
    icon: FileText,
    title: "Change Summary",
    description:
      "A plain-language breakdown of exactly what changed between policy versions — additions, removals, and edits.",
  },
  {
    icon: Building2,
    title: "Affected Departments",
    description:
      "See which teams — billing, coding, clinical, or operations — are impacted by each policy change.",
  },
  {
    icon: ShieldAlert,
    title: "Risk Level",
    description:
      "Every change is scored by potential compliance and revenue risk, so you know what needs attention first.",
  },
  {
    icon: ListChecks,
    title: "Suggested Actions",
    description:
      "Get recommended next steps, from updating coding rules to notifying reviewers and refreshing workflows.",
  },
]

export function ImpactDashboard() {
  return (
    <section id="impact" className="bg-muted/50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
            Impact
          </span>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Policy Change Impact Dashboard
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            When policies change, VitaLex shows what changed, which teams are
            affected, whether billing or coding rules need updates, and the risk
            level of each change.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <article
                key={card.title}
                className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-base font-semibold text-foreground">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {card.description}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
