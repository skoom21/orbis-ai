"use client"

import { useState } from "react"
import { Plus, Minus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function OrbisFAQ() {
  const [openItems, setOpenItems] = useState<number[]>([])

  const toggleItem = (index: number) => {
    setOpenItems((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  const faqs = [
    {
      question: "What is Orbis AI?",
      answer:
        "Orbis AI is an agentic travel planning and booking system that acts as your digital travel assistant. It provides an intelligent, conversational interface for searching flights, hotels, and activities across multiple providers while generating personalized, day-by-day itineraries based on your budget and preferences.",
    },
    {
      question: "How does the multi-agent system work?",
      answer:
        "Orbis AI uses specialized agents (Planner, Flight, Hotel, Itinerary, Booking, and Verifier) that collaborate to deliver accurate results. Each agent handles a specific task—like searching flights or creating itineraries—and they work together seamlessly to plan your perfect trip.",
    },
    {
      question: "What travel providers do you integrate with?",
      answer:
        "We integrate with major travel APIs including Amadeus for flights, Booking.com for accommodations, Google Maps for activities and navigation, and Stripe for secure payments. This allows us to aggregate options from hundreds of airlines and hotels worldwide.",
    },
    {
      question: "Can I modify my trip after booking?",
      answer:
        "Yes! Orbis AI provides real-time trip support including change management for flight and hotel modifications. Simply chat with the assistant to request changes, and our system will handle the updates and show you any price differences.",
    },
    {
      question: "Is my payment information secure?",
      answer:
        "Absolutely. We use Stripe for all payment processing, which is PCI-DSS compliant. Your payment information is never stored on our servers, and all communications are encrypted. We also support Google OAuth for secure authentication.",
    },
    {
      question: "Can I export my itinerary to my calendar?",
      answer:
        "Yes! Orbis AI supports calendar export in ICS format, which works with Google Calendar, Apple Calendar, Outlook, and most other calendar applications. You'll also receive email notifications for booking confirmations and trip reminders.",
    },
  ]

  return (
    <section id="faq" className="relative overflow-hidden py-24">
      <div className="absolute top-1/2 -right-20 z-0 h-64 w-64 rounded-full bg-primary/15 opacity-80 blur-3xl" />
      <div className="absolute top-1/2 -left-20 z-0 h-64 w-64 rounded-full bg-accent/15 opacity-80 blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-full bg-primary/20 border border-primary/30 text-primary mb-6">
            FAQ
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Frequently asked <span className="text-accent">questions</span>
          </h2>
        </motion.div>

        <div className="mx-auto max-w-2xl flex flex-col gap-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              className="rounded-2xl border border-border bg-card p-6 shadow-md hover:border-primary/40 transition-all duration-300 cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              onClick={() => toggleItem(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  toggleItem(index)
                }
              }}
            >
              <div className="flex items-start justify-between">
                <h3 className="font-serif font-medium text-foreground pr-4">{faq.question}</h3>
                <motion.div
                  animate={{ rotate: openItems.includes(index) ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {openItems.includes(index) ? (
                    <Minus className="text-accent flex-shrink-0" size={24} />
                  ) : (
                    <Plus className="text-primary flex-shrink-0" size={24} />
                  )}
                </motion.div>
              </div>
              <AnimatePresence>
                {openItems.includes(index) && (
                  <motion.div
                    className="mt-4 text-muted-foreground leading-relaxed overflow-hidden"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
