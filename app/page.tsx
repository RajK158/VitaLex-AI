import { SiteNav } from "@/components/site-nav"
import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { ImpactDashboard } from "@/components/impact-dashboard"
import { RuleExport } from "@/components/rule-export"
import { Testimonials } from "@/components/testimonials"
import { FinalCta } from "@/components/final-cta"
import { SiteFooter } from "@/components/site-footer"

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <Features />
        <ImpactDashboard />
        <RuleExport />
        <Testimonials />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  )
}
