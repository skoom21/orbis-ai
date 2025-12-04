"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { MessageSquare, Plane, Hotel, Calendar, CreditCard, Bell, Globe, Shield } from "lucide-react"

const features = [
  {
    icon: MessageSquare,
    title: "Natural Language Chat",
    description:
      "Simply describe your travel plans in plain English. Our AI understands your needs and gets to work immediately.",
    color: "text-primary",
    bgColor: "bg-primary/20",
  },
  {
    icon: Plane,
    title: "Smart Flight Search",
    description:
      "Our Flight Agent searches across providers using Amadeus APIs to find the best options for your route and budget.",
    color: "text-accent",
    bgColor: "bg-accent/20",
  },
  {
    icon: Hotel,
    title: "Hotel Comparison",
    description: "The Hotel Agent aggregates accommodations from Booking.com and more, presenting curated bundles.",
    color: "text-primary",
    bgColor: "bg-primary/20",
  },
  {
    icon: Calendar,
    title: "Day-by-Day Itineraries",
    description:
      "The Itinerary Agent crafts personalized schedules with activities, transit guidance, and time management.",
    color: "text-accent",
    bgColor: "bg-accent/20",
  },
  {
    icon: CreditCard,
    title: "Secure Booking",
    description:
      "Hold options, proceed to checkout with Stripe integration, and receive instant booking confirmations.",
    color: "text-primary",
    bgColor: "bg-primary/20",
  },
  {
    icon: Bell,
    title: "Trip Support",
    description: "Get real-time notifications, calendar exports (ICS), and manage flight/hotel changes on the go.",
    color: "text-accent",
    bgColor: "bg-accent/20",
  },
  {
    icon: Globe,
    title: "Multi-City Support",
    description: "Plan complex multi-destination trips with ease. Our system handles intricate routing automatically.",
    color: "text-primary",
    bgColor: "bg-primary/20",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "GDPR-style data controls, OAuth authentication, and encrypted communications keep your data safe.",
    color: "text-accent",
    bgColor: "bg-accent/20",
  },
]

export function OrbisFeatures() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section id="features" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="container mx-auto px-4">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-full bg-primary/20 border border-primary/30 text-primary mb-6">
            Features
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-foreground mb-6">
            Agentic AI <span className="text-accent">Architecture</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Specialized AI agents collaborate to deliver accurate, transparent, and adaptable travel planning results.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="group bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}>
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <h3 className="font-serif font-bold text-lg text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Architecture Diagram - Updated for dark mode */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-20 bg-card border border-border rounded-3xl p-8 sm:p-12"
        >
          <h3 className="font-serif text-2xl font-bold text-center text-foreground mb-8">
            How Our Agents Work Together
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {["Planner Agent", "Flight Agent", "Hotel Agent", "Itinerary Agent", "Booking Agent", "Verifier Agent"].map(
              (agent, index) => (
                <motion.div
                  key={agent}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3, delay: 1 + index * 0.1 }}
                  className="px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-full text-sm font-medium"
                >
                  {agent}
                </motion.div>
              ),
            )}
          </div>
          <p className="text-center text-muted-foreground mt-6 max-w-xl mx-auto">
            Each agent specializes in a specific task and communicates with others to deliver a seamless travel planning
            experience.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
