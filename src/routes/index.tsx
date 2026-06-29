import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Your App — Build Something Amazing" },
      { name: "description", content: "A modern landing page built with Lovable." },
      { property: "og:title", content: "Your App — Build Something Amazing" },
      { property: "og:description", content: "A modern landing page built with Lovable." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero-bg.jpg"
            alt=""
            className="h-full w-full object-cover opacity-40"
            width={1440}
            height={900}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/60 to-background" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-6 pb-24 pt-20 text-center lg:px-8 lg:pb-32 lg:pt-28">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Build something amazing with Lovable
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            A modern landing page template to showcase your product. Clean design, responsive layout, and ready to customize.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Button size="lg" className="group">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Everything you need</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful features to help you build faster and ship with confidence.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Lightning Fast"
              description="Optimized performance out of the box. Your users will love the speed."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Secure by Default"
              description="Built with security best practices so you can focus on building."
            />
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="Beautiful Design"
              description="Polished UI components that look great on every device."
            />
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="border-t border-border bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Built for makers</h2>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                We believe great software should be accessible to everyone. That is why we have built tools that help you create, iterate, and launch faster than ever before.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Whether you are a solo founder or a growing team, our platform scales with you.
              </p>
              <div className="mt-8">
                <Button size="lg">Start Building</Button>
              </div>
            </div>
            <div className="rounded-2xl bg-muted p-12 text-center">
              <p className="text-6xl font-bold text-foreground">10k+</p>
              <p className="mt-2 text-muted-foreground">Projects launched</p>
              <div className="mt-8 flex justify-center gap-12">
                <div>
                  <p className="text-3xl font-bold text-foreground">99.9%</p>
                  <p className="mt-1 text-sm text-muted-foreground">Uptime</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">4.9/5</p>
                  <p className="mt-1 text-sm text-muted-foreground">Rating</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Lovable App. All rights reserved.
            </p>
            <nav className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Contact</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 transition-colors hover:bg-accent">
      <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-3 text-primary">
        {icon}
      </div>
      <h3 className="mt-6 text-xl font-semibold text-card-foreground">{title}</h3>
      <p className="mt-3 text-muted-foreground">{description}</p>
    </div>
  );
}
