"use client"

import { motion } from "framer-motion"
import { Plane, ArrowRight } from "lucide-react"

export function OrbisCTA() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl border border-border bg-gradient-to-br from-card to-secondary/50 p-8 sm:p-12 overflow-hidden"
        >
          {/* Decorative accent */}
          <div
            className="absolute top-0 right-0 w-1/2 h-full opacity-30"
            style={{
              background: "linear-gradient(135deg, transparent 40%, rgba(219, 88, 68, 0.3) 100%)",
            }}
          />

          <div className="relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/20 mb-6"
            >
              <Plane className="h-8 w-8 text-accent" />
            </motion.div>

            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to transform your travel planning?
            </h2>

            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join the waitlist for early access and be among the first to experience AI-powered travel planning.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.a
                href="/signup"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group inline-flex items-center gap-2 bg-accent text-accent-foreground px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:bg-accent/90 transition-colors"
              >
                Get Early Access
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </motion.a>

              <a href="#features" className="text-muted-foreground hover:text-foreground font-medium transition-colors">
                Learn more →
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
