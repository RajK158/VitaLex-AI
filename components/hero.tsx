import Link from "next/link"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardMockup } from "@/components/dashboard-mockup"

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground">
      {/* Abstract healthcare-inspired visuals */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 80%)",
          }}
        />
        {/* ECG heartbeat line */}
        <svg
          className="absolute inset-x-0 top-1/2 h-40 w-full opacity-[0.12]"
          viewBox="0 0 1200 160"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M0 80 H360 l24 -52 26 104 24 -80 22 48 H620 l30 -30 30 30 H1200"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 size-96 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:py-28">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-primary-foreground/90">
            <ShieldCheck className="size-3.5" />
            HIPAA-conscious • Audit-ready • AI-powered policy workflows
          </span>

          <h1 className="mt-6 text-pretty text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Healthcare policy intelligence, finally made simple.
          </h1>

          <p className="mt-6 text-pretty text-lg leading-relaxed text-primary-foreground/80">
            VitaLex helps healthcare teams manage billing policies, coding
            rules, clinical guidelines, and payer-provider contracts in one
            secure workspace — powered by AI summaries, change comparison, and
            rule generation.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="bg-background text-foreground hover:bg-background/90"
              asChild
            >
              <Link href="/signup">
                Get Started
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/25 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
              asChild
            >
              <a href="#features">See how it works</a>
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-primary-foreground/70">
            <span className="font-medium">1.2K+ documents processed</span>
            <span className="h-4 w-px bg-white/20" aria-hidden="true" />
            <span>99.9% uptime</span>
            <span className="h-4 w-px bg-white/20" aria-hidden="true" />
            <span>SOC 2 Type II</span>
          </div>
        </div>

        <div className="relative lg:pl-6">
          <DashboardMockup />
        </div>
      </div>
    </section>
  )
}
