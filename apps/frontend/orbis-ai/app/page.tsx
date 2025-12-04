"use client"
import { useState, useEffect } from "react"
import { OrbisHero } from "@/components/orbis/hero"
import { OrbisFeatures } from "@/components/orbis/features"
import { OrbisTestimonials } from "@/components/orbis/testimonials"
import { OrbisCTA } from "@/components/orbis/cta"
import { OrbisFAQ } from "@/components/orbis/faq"
import { OrbisFooter } from "@/components/orbis/footer"
import { OrbisPricing } from "@/components/orbis/pricing"

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleMobileNavClick = (elementId: string) => {
    setIsMobileMenuOpen(false)
    setTimeout(() => {
      const element = document.getElementById(elementId)
      if (element) {
        const headerOffset = 120
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
        const offsetPosition = elementPosition - headerOffset

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        })
      }
    }, 100)
  }

  const scrollToSection = (elementId: string) => {
    const element = document.getElementById(elementId)
    if (element) {
      const headerOffset = 120
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
      const offsetPosition = elementPosition - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      })
    }
  }

  return (
    <div className="min-h-screen w-full relative bg-background">
      {/* Art Brut Brushstroke Background Accent */}
      <div
        className="absolute top-0 right-0 w-1/2 h-screen z-0 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, transparent 50%, rgba(219, 88, 68, 0.08) 50%)",
        }}
      />

      {/* Desktop Header */}
      <header
        className={`sticky top-4 z-[9999] mx-auto hidden w-full flex-row items-center justify-between self-start rounded-full bg-background/90 md:flex backdrop-blur-sm border border-border shadow-lg transition-all duration-300 ${
          isScrolled ? "max-w-3xl px-2" : "max-w-5xl px-4"
        } py-2`}
      >
        <a
          className={`z-50 flex items-center justify-center gap-2 transition-all duration-300 ${
            isScrolled ? "ml-4" : ""
          }`}
          href="#"
        >
          <img
            src="/images/logo.svg"
            alt="Orbis AI"
            className="h-8 w-8 rounded-full object-cover"
          />
          <span className="font-serif font-bold text-foreground text-lg">Orbis AI</span>
        </a>

        <div className="absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-2 text-sm font-medium text-muted-foreground transition duration-200 hover:text-foreground md:flex md:space-x-2">
          <button
            className="relative px-4 py-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            onClick={() => scrollToSection("features")}
          >
            <span className="relative z-20">Features</span>
          </button>
          <button
            className="relative px-4 py-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            onClick={() => scrollToSection("pricing")}
          >
            <span className="relative z-20">Pricing</span>
          </button>
          <button
            className="relative px-4 py-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            onClick={() => scrollToSection("testimonials")}
          >
            <span className="relative z-20">Testimonials</span>
          </button>
          <button
            className="relative px-4 py-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            onClick={() => scrollToSection("faq")}
          >
            <span className="relative z-20">FAQ</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="/login"
            className="font-medium transition-colors hover:text-foreground text-muted-foreground text-sm cursor-pointer"
          >
            Log In
          </a>

          <a
            href="/signup"
            className="rounded-full font-bold relative cursor-pointer hover:-translate-y-0.5 transition duration-200 inline-block text-center bg-accent text-accent-foreground shadow-lg px-5 py-2 text-sm"
          >
            Get Started
          </a>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="sticky top-4 z-[9999] mx-4 flex w-auto flex-row items-center justify-between rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-lg md:hidden px-4 py-3">
        <a className="flex items-center justify-center gap-2" href="#">
          <img
            src="/images/logo.svg"
            alt="Orbis AI"
            className="h-7 w-7 rounded-full object-cover"
          />
          <span className="font-serif font-bold text-foreground">Orbis AI</span>
        </a>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-background/50 border border-border transition-colors hover:bg-background/80"
          aria-label="Toggle menu"
        >
          <div className="flex flex-col items-center justify-center w-5 h-5 space-y-1">
            <span
              className={`block w-4 h-0.5 bg-foreground transition-all duration-300 ${isMobileMenuOpen ? "rotate-45 translate-y-1.5" : ""}`}
            ></span>
            <span
              className={`block w-4 h-0.5 bg-foreground transition-all duration-300 ${isMobileMenuOpen ? "opacity-0" : ""}`}
            ></span>
            <span
              className={`block w-4 h-0.5 bg-foreground transition-all duration-300 ${isMobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""}`}
            ></span>
          </div>
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[9998] bg-secondary/50 backdrop-blur-sm md:hidden">
          <div className="absolute top-20 left-4 right-4 bg-background/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl p-6">
            <nav className="flex flex-col space-y-4">
              <button
                onClick={() => handleMobileNavClick("features")}
                className="text-left px-4 py-3 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
              >
                Features
              </button>
              <button
                onClick={() => handleMobileNavClick("pricing")}
                className="text-left px-4 py-3 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
              >
                Pricing
              </button>
              <button
                onClick={() => handleMobileNavClick("testimonials")}
                className="text-left px-4 py-3 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
              >
                Testimonials
              </button>
              <button
                onClick={() => handleMobileNavClick("faq")}
                className="text-left px-4 py-3 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
              >
                FAQ
              </button>
              <div className="border-t border-border pt-4 mt-4 flex flex-col space-y-3">
                <a
                  href="/login"
                  className="px-4 py-3 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50 cursor-pointer"
                >
                  Log In
                </a>
                <a
                  href="/signup"
                  className="px-4 py-3 text-lg font-bold text-center bg-accent text-accent-foreground rounded-lg shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  Get Started
                </a>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <OrbisHero />

      {/* Features Section */}
      <div id="features">
        <OrbisFeatures />
      </div>

      {/* Pricing Section */}
      <div id="pricing">
        <OrbisPricing />
      </div>

      {/* Testimonials Section */}
      <div id="testimonials">
        <OrbisTestimonials />
      </div>

      {/* CTA Section */}
      <OrbisCTA />

      {/* FAQ Section */}
      <div id="faq">
        <OrbisFAQ />
      </div>

      {/* Footer */}
      <OrbisFooter />
    </div>
  )
}
