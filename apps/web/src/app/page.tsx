import Link from "next/link";
import { ArrowRight, Cpu, Zap, Shield, Globe } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">WheelsAI</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/marketplace"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Marketplace
            </Link>
            <Link
              href="/models"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Models
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Docs
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Sign in
            </Link>
            <Link href="/register" className="btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Deploy AI on{" "}
              <span className="text-primary-600">Decentralized GPUs</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
              Build agents, train models, deploy inference. All on Nosana's
              decentralized GPU network. Up to 85% cheaper than AWS.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/register" className="btn-primary">
                Start Deploying
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/docs"
                className="btn-ghost text-gray-700 hover:text-gray-900"
              >
                Read the Docs
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                  <Zap className="h-5 w-5 text-primary-600" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">
                  One-Click Deploy
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Deploy Llama, Mistral, and more with a single click. No Docker
                  knowledge required.
                </p>
              </div>

              <div className="rounded-lg border p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                  <Globe className="h-5 w-5 text-primary-600" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">
                  Stable Endpoints
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  OpenAI-compatible APIs with automatic load balancing and
                  failover.
                </p>
              </div>

              <div className="rounded-lg border p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                  <Cpu className="h-5 w-5 text-primary-600" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">
                  2,000+ GPUs
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Access RTX 3060 to H100 across Nosana's global decentralized
                  network.
                </p>
              </div>

              <div className="rounded-lg border p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                  <Shield className="h-5 w-5 text-primary-600" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">
                  Pay Per Token
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Only pay for what you use. No minimums, no commitments, no
                  surprises.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary-600 py-16">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white">
              Ready to deploy your first model?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-primary-100">
              Get started with $5 in free credits. No credit card required.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-primary-600 shadow-sm hover:bg-primary-50"
            >
              Create Free Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary-600">
                <Cpu className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold">WheelsAI</span>
            </div>
            <p className="text-sm text-gray-500">
              Built on Nosana. Powered by decentralized compute.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
