"use client"

import { Marquee } from "@/components/magicui/marquee"

const testimonials = [
  {
    name: "Sarah Chen",
    username: "@sarahexplores",
    body: "Orbis AI planned my 3-week Europe trip in minutes. The itinerary was perfect—every connection, every hotel, all seamlessly organized.",
    img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
  },
  {
    name: "Marcus Johnson",
    username: "@marcusjtravel",
    body: "As a business traveler, Orbis saves me hours every week. The multi-city routing is incredible.",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  },
  {
    name: "Emily Rodriguez",
    username: "@emilyroams",
    body: "I was skeptical about AI travel planning, but Orbis found deals I never would have discovered on my own. 30% saved on my last trip!",
    img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
  },
  {
    name: "David Park",
    username: "@davidventures",
    body: "The natural language interface is so intuitive. I just describe my dream trip and Orbis makes it happen.",
    img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
  },
  {
    name: "Lisa Thompson",
    username: "@lisatravels",
    body: "Calendar export feature is a game-changer. My whole trip is organized in my phone before I even pack.",
    img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
  },
  {
    name: "Alex Kim",
    username: "@alexglobetrotter",
    body: "Changed my flight last minute through Orbis—handled everything smoothly. Real-time support at its best.",
    img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
  },
  {
    name: "Nina Patel",
    username: "@ninaadventures",
    body: "Best travel planning tool I've ever used. The personalized recommendations feel like having a local guide.",
    img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
  },
  {
    name: "James Wilson",
    username: "@jameswanderlust",
    body: "From Tokyo to Barcelona, Orbis has planned 12 trips for me this year. Can't imagine traveling without it.",
    img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
  },
  {
    name: "Rachel Green",
    username: "@rachelexplores",
    body: "The budget tracking feature kept me on track throughout my honeymoon. No surprise costs, just pure adventure.",
    img: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face",
  },
]

const firstColumn = testimonials.slice(0, 3)
const secondColumn = testimonials.slice(3, 6)
const thirdColumn = testimonials.slice(6, 9)

const TestimonialCard = ({
  img,
  name,
  username,
  body,
}: {
  img: string
  name: string
  username: string
  body: string
}) => {
  return (
    <div className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-md">
      <div className="absolute -top-5 -left-5 -z-10 h-40 w-40 rounded-full bg-gradient-to-b from-primary/20 to-transparent blur-md" />

      <p className="text-foreground/90 leading-relaxed text-sm">{body}</p>

      <div className="mt-4 flex items-center gap-3">
        <img src={img || "/placeholder.svg"} alt={name} className="h-10 w-10 rounded-full object-cover" />
        <div>
          <div className="font-medium text-foreground text-sm">{name}</div>
          <div className="text-muted-foreground text-xs">{username}</div>
        </div>
      </div>
    </div>
  )
}

export function OrbisTestimonials() {
  return (
    <section id="testimonials" className="py-24">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-xl text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-full bg-primary/20 border border-primary/30 text-primary mb-6">
            Testimonials
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Loved by <span className="text-accent">travelers</span> worldwide
          </h2>
          <p className="text-lg text-muted-foreground">
            Join thousands of happy travelers who plan smarter with Orbis AI.
          </p>
        </div>

        <div className="flex max-h-[600px] justify-center gap-6 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]">
          <div>
            <Marquee pauseOnHover vertical className="[--duration:20s]">
              {firstColumn.map((testimonial) => (
                <TestimonialCard key={testimonial.username} {...testimonial} />
              ))}
            </Marquee>
          </div>

          <div className="hidden md:block">
            <Marquee reverse pauseOnHover vertical className="[--duration:25s]">
              {secondColumn.map((testimonial) => (
                <TestimonialCard key={testimonial.username} {...testimonial} />
              ))}
            </Marquee>
          </div>

          <div className="hidden lg:block">
            <Marquee pauseOnHover vertical className="[--duration:30s]">
              {thirdColumn.map((testimonial) => (
                <TestimonialCard key={testimonial.username} {...testimonial} />
              ))}
            </Marquee>
          </div>
        </div>
      </div>
    </section>
  )
}
