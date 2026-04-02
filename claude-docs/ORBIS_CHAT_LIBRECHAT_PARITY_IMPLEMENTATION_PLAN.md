# Orbis `/chat` Full Rebuild Plan (LibreChat Parity)

**Date:** April 2, 2026  
**Objective:** Rebuild Orbis chat frontend (`/chat`) with the same architecture and layout patterns as LibreChat, scraping and adapting maximum reusable frontend patterns/components.

---

## 1) Non-Negotiable Target

Build `/chat` as a **feature-complete, scalable chat interface** matching LibreChat’s:

- Shell composition and route behavior
- Navigation + conversation management UX
- Streaming lifecycle and optimistic rendering
- Recursive message tree and sibling/branch mechanics
- Rich composer (commands, files, voice, badges, stop/send states)
- Responsive desktop/mobile parity
- Settings/draft persistence and interaction resilience

---

## 2) Architectural End State (Exact Target)

## 2.1 Route-level structure (`app/chat`)

- `app/chat/layout.tsx`  
  - Chat shell wrapper (desktop nav + content pane)
  - Mobile overlay/mask orchestration
- `app/chat/page.tsx`  
  - New chat route behavior (create/open latest/new state)
- `app/chat/[id]/page.tsx`  
  - Main chat session rendering via `ChatView`

## 2.2 Component structure (`components/chat`)

- `chat-view.tsx` (orchestration root)
- `header.tsx`
- `footer.tsx`
- `landing.tsx`
- `presentation.tsx`
- `temporary-chat.tsx`
- `add-multi-convo.tsx`
- `export-share-menu.tsx`
- `input/*`
- `messages/*`
- `nav/*`
- `menus/*`
- `providers/*`

## 2.3 State/data architecture

- **Server state:** React Query (`conversations`, `messages`, config, capabilities)
- **Interaction state:** atom-family equivalent (existing state store in Orbis)
- **Form state:** react-hook-form context for chat composer
- **Streaming:** SSE event pipeline with optimistic placeholder and event-class handlers

## 2.4 Core UX state machine

`loading` → `navigating` → (`landing` | `messages`) with streaming overlays and completion states.

---

## 3) “Scrape Maximum” Reuse Strategy

## 3.1 Reuse priorities

1. **Layout patterns and composition hierarchy** (highest priority)
2. **Interaction patterns** (hover actions, sibling switch, command workflows)
3. **State patterns** (per-index families, submission lifecycle)
4. **Visual behavior and micro-interactions** (sticky header, progressive hover, responsive transitions)

## 3.2 What to port nearly 1:1 (adapt only framework APIs)

- Chat shell composition model (`ChatView` pattern)
- Nav architecture and list grouping/virtualization pattern
- Composer behavior contracts (autosize, collapse, stop/send swap)
- Messages recursive traversal model and sibling controls
- Hover action matrix and gating logic
- SSE lifecycle sequencing and event handler split
- Draft persistence behavior and key strategy

## 3.3 What to adapt for Orbis only

- API paths and payload formats (`apiClient`)
- Auth/session wiring (`useAuth`)
- Endpoint/model naming and capability config source
- Orbis branding/theme token mapping

---

## 4) Phase Plan (Comprehensive)

## Phase 0 — Foundation & Guardrails

**Goal:** Lock architecture before coding drift.

### Deliverables
- Finalized directory tree under `components/chat/**`
- Architecture decision notes in this plan
- Feature flag strategy (`chatV2` or route switch)

### Acceptance Criteria
- All required chat modules have target file placeholders
- No architectural ambiguity on provider boundaries

---

## Phase 1 — Route Shell Parity

**Goal:** Match chat container behavior on desktop/mobile.

### Tasks
- Implement/normalize `app/chat/layout.tsx`
- Normalize `app/chat/page.tsx` behavior for new conversations
- Normalize `app/chat/[id]/page.tsx` container dimensions and spacing

### Acceptance Criteria
- Desktop: left nav + right chat pane
- Mobile: content-first with overlayable nav behavior

---

## Phase 2 — Provider Graph

**Goal:** Introduce LibreChat-style provider composition.

### Tasks
- Implement:
  - `providers/chat-context.tsx`
  - `providers/added-chat-context.tsx`
  - `providers/chat-form-context.tsx`
  - `providers/messages-view-context.tsx`
- Wire providers into `ChatView`

### Acceptance Criteria
- `ChatView` renders through provider stack with no prop-drill dependency

---

## Phase 3 — Navigation System

**Goal:** Feature-complete conversation navigation.

### Tasks
- Build `nav/chat-sidebar.tsx` equivalent to LibreChat `Nav.tsx`
- Add `new-chat` action, search bar, grouped conversation list
- Implement conversation row + action menu (rename/duplicate/archive/delete/share)
- Add mobile nav mask + animated open/close

### Acceptance Criteria
- Navigation supports >100 conversation history smoothly
- Search updates list state without breaking route flow

---

## Phase 4 — Header Control Surface

**Goal:** Port top-bar UX contracts.

### Tasks
- Model selector scaffolding and interaction state
- Presets trigger/menu scaffold
- Temporary chat toggle
- Export/share menu
- Multi-conversation action

### Acceptance Criteria
- Header actions reposition correctly on mobile vs desktop

---

## Phase 5 — Landing Experience

**Goal:** Build dynamic first-message entry state.

### Tasks
- Implement `landing.tsx`
- Integrate dynamic greeting and profile-context text
- Conversation starters cards and send flow
- Centered form behavior on landing + transition to message mode

### Acceptance Criteria
- First interaction path is guided and consistent across routes

---

## Phase 6 — Composer Core

**Goal:** Reach parity for text composition behavior.

### Tasks
- Rebuild `input/chat-form.tsx`
- Autosize textarea + collapse toggle
- Enter-to-send and shift-enter behavior with IME-safe handling
- Disabled-state matrix (auth/capability/submitting)
- Stop/send button switching

### Acceptance Criteria
- Composer behavior matches report under all key input states

---

## Phase 7 — Commands & Mentions

**Goal:** Add advanced command ergonomics.

### Tasks
- Implement mention popovers (`@`, `+`, prompts)
- Keyboard command handling and insertion logic
- Command feature gating by endpoint/capability

### Acceptance Criteria
- Command UX works end-to-end with keyboard-only navigation

---

## Phase 8 — Files in Composer

**Goal:** Endpoint-aware attachment workflow.

### Tasks
- Implement attach button/menu strategy component
- File row/chips with progress + remove/cancel
- Drag/drop integration points
- Submission payload file references

### Acceptance Criteria
- File uploads are visible, cancellable, and correctly attached to sends

---

## Phase 9 — Voice I/O

**Goal:** Support STT/TTS interaction parity.

### Tasks
- STT start/stop and transcript integration
- Optional auto-send flow
- TTS controls for stream/message playback

### Acceptance Criteria
- Voice interaction works without breaking manual text workflows

---

## Phase 10 — Streaming Lifecycle (SSE)

**Goal:** Mirror robust event pipeline.

### Tasks
- Implement submission model and optimistic placeholder
- Event handlers for: `created`, `type`, `sync`, `attachment`, `final`, `cancel`, `error`
- Add retry strategy for auth refresh failures

### Acceptance Criteria
- Stream transitions and failure paths are deterministic and recoverable

---

## Phase 11 — Message Tree & Recursion

**Goal:** Full branch/sibling-capable rendering.

### Tasks
- Build message tree transformation utility (or equivalent)
- Implement recursive render chain (`MultiMessage`-style)
- Track sibling index by parent/group key

### Acceptance Criteria
- Regenerated branches and sibling traversal are stable and stateful

---

## Phase 12 — Content Parts Renderer

**Goal:** Rich multi-part message rendering.

### Tasks
- Implement part dispatcher for text/tool/search/attachments/memory sections
- Integrate markdown rendering and endpoint-specific content
- Provide edit-mode substitution for editable parts

### Acceptance Criteria
- Mixed-content assistant outputs render coherently and incrementally

---

## Phase 13 — Hover Action Matrix

**Goal:** Full action controls per message.

### Tasks
- Copy/edit/regenerate/continue/fork buttons
- Feedback controls with tag popovers
- Per-message audio controls
- Capability gating per endpoint/state

### Acceptance Criteria
- Only valid actions render; invalid actions hidden/disabled predictably

---

## Phase 14 — Sibling Navigation

**Goal:** Branch traversal UX parity.

### Tasks
- Implement previous/next sibling controls
- Add live status labeling (`current / total`)
- Keep navigation tied to message tree state

### Acceptance Criteria
- Branch switching does not corrupt message render path

---

## Phase 15 — Scroll Ergonomics

**Goal:** Mature scroll behavior under streaming.

### Tasks
- Intersection observer bottom detection
- Debounced scroll button visibility
- Smooth jump-to-bottom actions
- Abort auto-scroll when user intentionally scrolls up

### Acceptance Criteria
- Streaming remains readable without forcing auto-jumps

---

## Phase 16 — Draft Persistence

**Goal:** Persist text/files seamlessly between convo transitions.

### Tasks
- Draft keys by conversation ID
- Pending-conversation migration logic
- Restore files and text on convo switch

### Acceptance Criteria
- Draft loss minimized across refresh/navigation/send transitions

---

## Phase 17 — Chat Settings Persistence

**Goal:** Preserve UX preferences.

### Tasks
- Persist behavior toggles (enter-to-send, auto-scroll, maximize, command toggles, voice toggles)
- Integrate settings into runtime behavior hooks

### Acceptance Criteria
- Preferences survive reload and correctly affect runtime interactions

---

## Phase 18 — Side Panel / Artifacts (Optional but aligned)

**Goal:** Keep shell ready for artifact/panel integrations.

### Tasks
- Add presentation side-panel mount points
- Ensure shell supports panel collapse and saved layout

### Acceptance Criteria
- Chat remains functional with/without side panel enabled

---

## Phase 19 — Mobile Parity

**Goal:** Make feature parity truly responsive.

### Tasks
- Mobile header controls
- Mobile nav transitions and overlay
- Touch target sizes and interaction spacing

### Acceptance Criteria
- Core flows (new chat, search, send, stream, actions) work on mobile

---

## Phase 20 — Accessibility Hardening

**Goal:** Production-ready keyboard and screen-reader behavior.

### Tasks
- Validate aria labels, focus order, tooltip semantics
- Add live regions where needed (sibling/status)
- Verify keyboard-only all primary flows

### Acceptance Criteria
- No blocking a11y issues in critical chat workflows

---

## Phase 21 — Performance Hardening

**Goal:** Keep UX smooth at scale.

### Tasks
- Virtualized conversation list
- Memoization boundaries on message and nav rows
- Debounce/throttle key handlers

### Acceptance Criteria
- No major UI jank for long lists / long chats / active stream

---

## Phase 22 — API Surface Parity

**Goal:** Ensure frontend can execute all intended capabilities.

### Required API capabilities
- Conversation CRUD + list/search
- Message list + send + stream
- Optional: regenerate/fork/edit endpoints or equivalent semantics
- File upload/attachment metadata endpoints
- Share/export endpoints (if enabled)

### Acceptance Criteria
- Frontend has no feature blocked by missing API contract in planned scope

---

## Phase 23 — QA Scenario Matrix

**Goal:** Validate all major user journeys from the report.

### Required E2E scenarios
1. New chat from nav
2. Continue existing chat
3. Regenerate + sibling switch
4. Edit + resubmit
5. File attach + send
6. Voice input + send
7. Conversation rename/duplicate/archive/delete/share
8. Search flow + clear

### Acceptance Criteria
- All scenarios pass in desktop and mobile breakpoints

---

## Phase 24 — Rollout & Cutover

**Goal:** Safely replace current `/chat`.

### Tasks
- Feature-flag rollout
- Side-by-side fallback route during stabilization
- Remove legacy minimal components after sign-off

### Acceptance Criteria
- `/chat` is fully migrated with fallback disabled and legacy paths cleaned

---

## 5) Component-by-Component Parity Checklist

## 5.1 Shell components
- [ ] `ChatView` orchestration parity
- [ ] `Header` action parity
- [ ] `Landing` parity
- [ ] `Footer` parity
- [ ] `Presentation` parity

## 5.2 Input components
- [ ] `ChatForm`
- [ ] `ConversationStarters`
- [ ] `AudioRecorder`
- [ ] `CollapseChat`
- [ ] `SendButton` / `StopButton`
- [ ] `AttachFileChat`
- [ ] `FileFormChat`

## 5.3 Message components
- [ ] `MessagesView`
- [ ] `MultiMessage`
- [ ] `Message` / `MessageContent`
- [ ] `ContentParts`
- [ ] `HoverButtons`
- [ ] `SiblingSwitch`
- [ ] Feedback UX

## 5.4 Nav + conversations
- [ ] `Nav`
- [ ] `NewChat`
- [ ] `SearchBar`
- [ ] `MobileNav`
- [ ] `Conversations` virtualization
- [ ] `Convo` row behaviors
- [ ] `ConvoOptions` actions

## 5.5 Hooks/providers/store
- [ ] SSE pipeline
- [ ] chat helper hooks
- [ ] message scrolling hook
- [ ] textarea + autosave hooks
- [ ] provider graph
- [ ] state families and persisted settings

---

## 6) Dependency & Sequencing Rules

1. Do not implement message actions before message tree and latest-message state exist.
2. Do not implement advanced composer commands before core send/stop lifecycle is stable.
3. Do not ship nav actions (archive/delete/share) until route fallback logic is verified.
4. Do not optimize performance before functional parity is proven.

---

## 7) Risk Register (High Impact)

1. **State desync across stream + tree**  
   - Mitigation: centralized event handlers + strict message ID mapping
2. **Composer complexity regression**  
   - Mitigation: incremental layering and guardrails per phase
3. **Mobile parity drift**  
   - Mitigation: test at each phase with desktop+mobile snapshots
4. **Missing backend endpoint support**  
   - Mitigation: API capability matrix review before phase 22 closure

---

## 8) Definition of Done (Full Parity)

Project is complete when:

- All phase acceptance criteria are met
- All parity checklist items are completed
- Scenario matrix passes in desktop and mobile
- `/chat` uses rebuilt architecture only (legacy minimal interface removed)
- UX and interaction quality are materially aligned to LibreChat’s chat interface model

---

## 9) Immediate Execution Order (Next Coding Sprint)

1. Phase 0 + Phase 1 + Phase 2
2. Phase 3 + Phase 4 + Phase 5
3. Phase 6 + Phase 7 + Phase 8 + Phase 10
4. Phase 11 + Phase 12 + Phase 13 + Phase 14 + Phase 15
5. Phase 16 + Phase 17 + Phase 19
6. Phase 20 + Phase 21 + Phase 22 + Phase 23 + Phase 24

---

## 10) Notes

This plan intentionally prioritizes **maximum frontend scraping/adaptation from LibreChat patterns** while preserving Orbis-specific API/auth/integration boundaries.
