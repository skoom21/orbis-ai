# Orbis AI Wireframe Generation Prompt

Use the following prompt with AI design tools (like Midjourney, DALL-E 3, Uizard, or v0.dev) to generate comprehensive wireframes for the Orbis AI frontend.

---

## **Prompt**

**Role:** Expert UI/UX Designer specializing in modern SaaS and TravelTech applications.

**Task:** Create a comprehensive set of high-fidelity wireframes for **"Orbis AI"**, an intelligent multi-agent travel planning platform. The design should reflect a futuristic, clean, and user-centric interface similar to modern Next.js applications using Tailwind CSS and Radix UI.

**Design Aesthetic:**
*   **Style:** Minimalist, clean, "Glassmorphism" accents, rounded corners (xl), ample whitespace.
*   **Color Palette:** Deep Space Blue (`#0F172A`) and Teal/Cyan accents (`#06B6D4`) for the "AI" feel, with neutral grays for structure. Support for Dark Mode is essential.
*   **Typography:** Sans-serif, modern (e.g., Inter or Geist).

**Required Screens & Layouts:**

### 1. Landing Page (Hero Section)
*   **Visual:** A stunning, immersive hero section featuring a stylized 3D globe or map background.
*   **Content:** Large headline: "Travel Smarter with Multi-Agent AI." Subheadline: "Your personal team of Flight, Hotel, and Itinerary agents working in perfect sync."
*   **CTA:** Prominent "Start Planning" button with a glowing effect.
*   **Social Proof:** "Trusted by 10,000+ travelers" with avatar stack.

### 2. Main Dashboard (User Hub)
*   **Layout:** Sidebar navigation on the left (Home, My Trips, AI Chat, Settings, Profile).
*   **Widgets:**
    *   **"Upcoming Trip":** A wide card showing the next trip (e.g., "Paris, France") with a countdown, weather widget, and "View Itinerary" button.
    *   **"Recent Conversations":** List of recent chat sessions with the AI (e.g., "Summer Vacation Planning", "Business Trip to NY").
    *   **"Quick Actions":** Buttons for "Book Flight", "Find Hotel", "Create New Itinerary".

### 3. The AI Planning Interface (Core Feature)
*   **Layout:** Split-screen view (essential for complex planning).
*   **Left Panel (Chat):** A conversational interface.
    *   User messages in distinct bubbles.
    *   AI responses showing **Agent Indicators** (e.g., an icon showing "Flight Agent is typing..." or "Planner Agent suggests...").
    *   Streaming text effect.
*   **Right Panel (Dynamic Context):** This area updates based on the chat.
    *   **Map View:** Interactive map with pins for suggested hotels/attractions.
    *   **Itinerary Card:** A day-by-day timeline view that builds up as the user chats.
    *   **Flight Options:** A comparison list of flights when the Flight Agent is active.

### 4. Itinerary Detail View
*   **Layout:** Vertical timeline.
*   **Elements:**
    *   **Day Headers:** "Day 1: Arrival in Tokyo".
    *   **Activity Cards:** Time slots with images of the location, duration, and "Booked/Pending" status tags.
    *   **Map Integration:** A side-by-side map highlighting the route for the specific day.

### 5. Mobile Responsive View (Mobile App)
*   **Screen:** Show the "AI Chat" interface adapted for mobile.
*   **Elements:** Bottom navigation bar. Chat takes up full screen. The "Dynamic Context" (Map/Itinerary) is accessible via a slide-up drawer or toggle button.

**Output Format:**
Please generate these screens as a cohesive design system, showing the flow from Landing Page -> Dashboard -> Chat Planning -> Itinerary Details.
