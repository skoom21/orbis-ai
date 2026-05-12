# ORBIS AI Development Guidelines

## Project Overview

**Orbis AI** is an intelligent travel planning system leveraging multi-agent AI architecture to simplify complex travel workflows. The system provides conversational interfaces for trip planning, real-time booking capabilities, and personalized itinerary generation.

### Architecture Summary
- **Frontend**: Next.js (React + TypeScript) with Shadcn/UI components
- **Backend**: FastAPI (Python) for AI intelligence and core business logic  
- **Events Service**: ElysiaJS (Bun) for real-time streaming and background processing
- **Database**: Supabase PostgreSQL with pgvector extension for semantic search
- **Caching**: Upstash Redis for performance optimization and job queues
- **Storage**: Supabase Storage for files (tickets, PDFs, documents)

---

## 🗄️ Database Schema & Architecture

### Core Tables Structure

#### **Users & Authentication**
```sql
-- Primary user table extending Supabase auth.users
users (id, email, full_name, status, preferences...)
user_preferences (travel_style, budget_ranges, dietary_preferences...)
```

#### **Conversations & Messages**  
```sql
conversations (id, user_id, trip_id, title, context...)
messages (id, conversation_id, role, content, agent_type...)
```

#### **Trip Management**
```sql
trips (id, destinations, itinerary, status, budget...)
bookings (id, trip_id, booking_type, provider, details...)
payments (id, amount, status, provider_payment_id...)
```

#### **AI Agent System**
```sql
agent_runs (id, agent_type, input, output, execution_status...)
tool_calls (id, agent_run_id, tool_name, success...)
```

#### **RAG & Knowledge Base**
```sql
travel_guides (id, destination, content, content_embedding...)
user_travel_history (id, destination, experience_embedding...)
search_cache (cache_key, results, expires_at...)
```

#### **Analytics & Monitoring**
```sql
user_activity_logs, api_usage_logs, error_logs
notifications, email_logs
trip_reviews, agent_feedback
```

### Key Enums & Types
```sql
-- User & Travel Types
user_status: active | suspended | deleted
travel_style: adventure | cultural | relaxation | business | family | romantic | solo
travel_pace: relaxed | moderate | fast_paced
accommodation_preference: budget | moderate | luxury | boutique | hostel

-- Trip & Booking Status
trip_status: planning | options_held | payment_pending | confirmed | in_progress | completed | cancelled
booking_status: searching | held | payment_pending | confirmed | cancelled | refunded | failed
booking_type: flight | hotel | car_rental | activity | transfer | insurance

-- AI Agent System
agent_type: planner | flight | hotel | itinerary | booking | verifier | orchestrator
agent_execution_status: pending | running | completed | failed | retrying
message_role: user | assistant | system | tool | function

-- Payments & Notifications
payment_status: pending | processing | succeeded | failed | refunded | partially_refunded
notification_type: booking_confirmation | payment_receipt | trip_reminder | flight_change | hotel_change | cancellation | itinerary_update | price_alert
```

---

## 🏗️ Application Architecture

### Service Responsibilities

#### **Frontend Service (`apps/frontend/`)**
- **Tech**: Next.js 14+ (App Router), React, TypeScript, TailwindCSS, Shadcn/UI
- **Purpose**: User interface, authentication, trip management dashboards
- **Key Features**:
  - Conversational chat interface for trip planning
  - Interactive itinerary builder and visualizer
  - Trip dashboard with real-time status updates
  - Payment integration (Stripe test mode)
  - Calendar export (ICS) and PDF generation

#### **API Service (`apps/api/`)**
- **Tech**: FastAPI, Python, LangChain, pgvector
- **Purpose**: AI intelligence engine, business logic, RAG operations
- **Key Features**:
  - Multi-agent orchestration (Planner, Flight, Hotel, Itinerary, Booking, Verifier agents)
  - RAG-powered personalization using vector embeddings
  - External API integrations (Amadeus, Booking.com, Stripe)
  - Schema validation to prevent AI hallucinations
  - Cost optimization and constraint solving

#### **Events Service (`apps/events/`)**
- **Tech**: ElysiaJS, Bun, WebSockets
- **Purpose**: Real-time streaming, event handling, background jobs
- **Key Features**:
  - Real-time chat message streaming
  - Background job processing (email notifications, PDF generation)
  - Event broadcasting for live trip updates
  - High-performance WebSocket connections

---

## 🤖 Multi-Agent AI System

### Agent Architecture

#### **Orchestrator Agent**
- **Role**: Coordinates all other agents, manages conversation flow
- **Responsibilities**: Intent recognition, task decomposition, agent delegation
- **Tools**: Conversation management, user preference retrieval

#### **Planner Agent**
- **Role**: High-level trip planning and constraint management
- **Responsibilities**: Budget analysis, duration planning, destination research
- **Tools**: RAG search, preference matching, feasibility checking

#### **Flight Agent**
- **Role**: Flight search, comparison, and booking management
- **Responsibilities**: Multi-city routing, fare comparison, schedule optimization
- **Tools**: Amadeus API, Skyscanner API, flight search algorithms

#### **Hotel Agent**
- **Role**: Accommodation search and booking coordination
- **Responsibilities**: Location-based search, amenity matching, rate comparison
- **Tools**: Booking.com API, hotel search and filtering

#### **Itinerary Agent**
- **Role**: Day-by-day activity planning and optimization
- **Responsibilities**: Activity selection, time management, logistics optimization
- **Tools**: Google Maps API, attraction databases, route optimization

#### **Booking Agent**
- **Role**: Secure payment processing and booking confirmation
- **Responsibilities**: Payment coordination, booking hold management, confirmation handling
- **Tools**: Stripe API, booking confirmation systems

#### **Verifier Agent**
- **Role**: Quality assurance and constraint validation
- **Responsibilities**: Feasibility checking, error detection, recommendation validation
- **Tools**: Constraint validation, feasibility algorithms

### Agent Communication Patterns
- **Sequential**: Orchestrator → Planner → Flight/Hotel → Itinerary → Booking → Verifier
- **Parallel**: Flight and Hotel agents work simultaneously for efficiency
- **Feedback Loops**: Verifier can trigger re-planning if constraints are violated
- **Context Sharing**: Shared context object passed between agents for consistency

---

## 💾 Data Management & RAG

### Vector Embeddings Strategy
- **User Preferences**: Store travel style, interests, and past trip feedback as embeddings
- **Travel Guides**: Static knowledge base with destination information, activities, tips
- **Trip History**: Learn from user's past trips for improved personalization
- **Real-time Context**: Dynamic embeddings for current conversation and trip planning state

### Caching Strategy
- **Search Results**: Cache expensive API calls from Amadeus, Booking.com for 15-30 minutes
- **User Sessions**: Redis-based session management for conversation continuity
- **Generated Content**: Cache itineraries and recommendations to avoid regeneration
- **Static Data**: Airport codes, city information, attraction details

### Data Privacy & Security
- **Encryption**: All sensitive data encrypted at rest and in transit
- **Row-Level Security**: Supabase RLS policies ensure users only access their own data
- **API Security**: Rate limiting, API key rotation, secure webhook handling
- **GDPR Compliance**: User data export, deletion, and consent management

---

## 🔗 External API Integration

### Travel APIs
#### **Amadeus API**
- **Usage**: Flight search, airport information, airline data
- **Rate Limits**: Monitor and implement exponential backoff
- **Caching**: Cache search results for 15-30 minutes
- **Error Handling**: Graceful fallbacks to cached or alternative data

#### **Booking.com API**
- **Usage**: Hotel search, property details, availability checking
- **Integration**: Real-time availability with hold/release mechanisms
- **Pricing**: Dynamic pricing with tax and fee calculations

#### **Google Maps API**
- **Usage**: Location services, route optimization, attraction data
- **Features**: Distance matrix, geocoding, place details
- **Optimization**: Batch requests to minimize API costs

### Payment Processing
#### **Stripe Integration**
- **Test Mode**: Sandbox environment for development and demo
- **Features**: Payment intents, webhooks, refund processing
- **Security**: PCI compliance, secure token handling

### Communication APIs
#### **Email Services** (Resend/SendGrid)
- **Usage**: Booking confirmations, trip reminders, notifications
- **Templates**: HTML email templates for professional communication
- **Tracking**: Delivery confirmation and open/click tracking

---

## 🚀 Development Workflows

### Code Organization
```
orbis-ai/
├── apps/
│   ├── frontend/          # Next.js React app
│   │   ├── app/           # App Router pages
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configurations
│   ├── api/               # FastAPI Python service
│   │   ├── app/           # Application logic
│   │   ├── tests/         # Test suites
│   │   └── Dockerfile     # Container configuration
│   └── events/            # ElysiaJS Bun service
│       ├── src/           # Source code
│       └── Dockerfile     # Container configuration
├── packages/              # Shared packages/libraries
├── infra/                 # Infrastructure as code
│   ├── docker/            # Docker configurations
│   ├── k8s/               # Kubernetes manifests
│   └── terraform/         # Terraform infrastructure
└── claude-docs/           # Documentation and guidelines
```

### Environment Management
- **Development**: Local Docker Compose setup with hot reloading
- **Staging**: Cloud deployment with test APIs and sandbox payments
- **Production**: Full deployment with production APIs (future)

### Testing Strategy
- **Unit Tests**: Jest (Frontend), Pytest (Backend), Bun test (Events)
- **Integration Tests**: API endpoint testing, database operations
- **E2E Tests**: Full user journey testing with Playwright
- **Agent Testing**: Mock API responses, agent behavior validation

---

## 📋 Implementation Guidelines

### Frontend Development
#### **Component Standards**
- Use Shadcn/UI components as base, customize with TailwindCSS
- Implement TypeScript strictly - no `any` types
- Follow React best practices: hooks, context, error boundaries
- Responsive design: mobile-first approach

#### **State Management**
- **Local State**: React useState, useReducer for component-level state
- **Server State**: React Query/SWR for API data fetching and caching
- **Global State**: Zustand for user preferences, auth state
- **Form State**: React Hook Form with Zod validation

#### **Authentication & Authorization**
- NextAuth.js with Supabase adapter
- Google OAuth integration
- JWT-based session management
- Role-based access control (user/admin)

### Backend Development
#### **API Design Principles**
- RESTful endpoints with consistent naming
- OpenAPI/Swagger documentation
- Pydantic models for request/response validation
- Error handling with proper HTTP status codes

#### **Agent Implementation**
- LangChain framework for agent orchestration
- Structured outputs with Pydantic models
- Tool validation and error recovery
- Observability with structured logging

#### **Database Operations**
- Use Supabase client with connection pooling
- Implement database migrations with proper versioning
- Optimize queries with proper indexing
- Use transactions for consistency

### Events Service Development
#### **Real-time Features**
- WebSocket connections with reconnection logic
- Event-driven architecture with proper error handling
- Background job processing with retry mechanisms
- Performance monitoring and optimization

---

## 🔧 DevOps & Deployment

### Containerization
- **Docker**: Multi-stage builds for production optimization
- **Docker Compose**: Local development environment setup
- **Health Checks**: Implement proper health endpoints

### CI/CD Pipeline
- **GitHub Actions**: Automated testing, building, and deployment
- **Code Quality**: ESLint, Prettier, Black, Ruff for code formatting
- **Security**: Dependency scanning, secret management
- **Performance**: Build optimization and asset compression

### Monitoring & Observability
- **Error Tracking**: Sentry integration for both frontend and backend
- **Logging**: Structured logging with correlation IDs
- **Metrics**: Performance monitoring and API usage tracking
- **Alerting**: Real-time alerts for system issues

### Infrastructure
- **Frontend Deployment**: Vercel with automatic deployments
- **Backend Deployment**: Railway/Fly.io with auto-scaling
- **Database**: Supabase managed PostgreSQL
- **Caching**: Upstash Redis with persistence

---

## 📈 Performance Optimization

### Frontend Optimization
- **Code Splitting**: Lazy loading of routes and components
- **Image Optimization**: Next.js Image component with WebP
- **Caching**: Aggressive caching of static assets
- **Bundle Analysis**: Regular bundle size monitoring

### Backend Optimization
- **Database**: Query optimization, connection pooling, read replicas
- **Caching**: Multi-level caching (Redis, application-level, CDN)
- **API Performance**: Response compression, pagination, rate limiting
- **Resource Management**: Proper memory and CPU usage monitoring

### AI/ML Optimization
- **Vector Search**: Optimize pgvector indices for embedding similarity
- **Model Caching**: Cache LLM responses for repeated queries
- **Batch Processing**: Batch API calls to external services
- **Cost Management**: Monitor token usage and API costs

---

## 🔒 Security Best Practices

### Application Security
- **Input Validation**: Strict validation on all user inputs
- **SQL Injection**: Use parameterized queries and ORM protection
- **XSS Protection**: Content Security Policy and input sanitization
- **CSRF Protection**: Proper token validation

### API Security
- **Authentication**: JWT tokens with proper expiration
- **Rate Limiting**: Prevent abuse with intelligent rate limiting
- **API Keys**: Secure storage and rotation of external API keys
- **Encryption**: TLS 1.3 for all communications

### Data Protection
- **Sensitive Data**: Encrypt PII and payment information
- **Access Control**: Implement least privilege principle
- **Audit Logging**: Track all data access and modifications
- **Backup Security**: Encrypted backups with access controls

---

## 📚 Development Standards

### Code Quality
- **TypeScript**: Strict mode enabled, comprehensive type coverage
- **Python**: Type hints, docstrings, PEP 8 compliance
- **Code Reviews**: Mandatory reviews for all changes
- **Documentation**: Inline comments and API documentation

### Git Workflow
- **Branch Strategy**: Feature branches with descriptive names
- **Commit Messages**: Conventional commits format
- **Pull Requests**: Template-based PRs with proper descriptions
- **Version Control**: Semantic versioning for releases

### Testing Requirements
- **Coverage**: Minimum 80% code coverage for critical paths
- **Test Types**: Unit, integration, and end-to-end tests
- **Test Data**: Proper test fixtures and mocking
- **Continuous Testing**: Tests run on every commit

---

## 🎯 Success Criteria & KPIs

### Technical Success Metrics
- **Performance**: < 2s page load times, < 500ms API response times
- **Reliability**: 99.9% uptime, proper error handling and recovery
- **Scalability**: Handle 1000+ concurrent users
- **Code Quality**: Maintainable, well-documented, tested codebase

### User Experience Metrics
- **Conversion**: Complete trip planning flow success rate > 80%
- **Satisfaction**: User ratings > 4.0/5.0 for AI recommendations
- **Engagement**: Average session duration > 15 minutes
- **Retention**: User return rate > 60% within 30 days

### Business Metrics
- **Cost Optimization**: API costs < $10 per successful booking
- **Processing Time**: Complete trip planning < 5 minutes
- **Error Rate**: < 5% error rate in booking processes
- **Demo Success**: Successful end-to-end demo for academic evaluation

---

## 🚨 Risk Mitigation

### Technical Risks
- **API Failures**: Implement circuit breakers and fallback mechanisms
- **Data Loss**: Regular backups and disaster recovery procedures
- **Performance Issues**: Load testing and performance monitoring
- **Security Breaches**: Regular security audits and penetration testing

### Business Risks
- **Rate Limits**: Monitor API usage and implement intelligent caching
- **Cost Overruns**: Set up billing alerts and usage monitoring
- **Scope Creep**: Clear feature prioritization and MVP focus
- **Timeline Delays**: Agile development with regular progress reviews

---

## 🔄 Future Enhancements

### Phase 2 Features (Post-MVP)
- **Advanced ML**: Reinforcement learning for agent optimization
- **Mobile App**: React Native companion app
- **Enterprise Features**: Team collaboration, corporate travel policies
- **Advanced Analytics**: Predictive analytics, user behavior insights

### Scalability Improvements
- **Microservices**: Further service decomposition for specific domains
- **Event Streaming**: Kafka/NATS for advanced event processing
- **Global Deployment**: Multi-region deployment for performance
- **AI/ML Pipeline**: MLOps for model training and deployment

---

## 📖 References & Resources

### Documentation Links
- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [LangChain Documentation](https://python.langchain.com/)
- [Shadcn/UI Components](https://ui.shadcn.com/)

### API References  
- [Amadeus Travel APIs](https://developers.amadeus.com/)
- [Booking.com Distribution API](https://developers.booking.com/)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Google Maps Platform APIs](https://developers.google.com/maps)

### Development Tools
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Vercel Deployment](https://vercel.com/docs)

---

*This document serves as the definitive guide for Orbis AI development. Update regularly as the project evolves and new patterns emerge.*