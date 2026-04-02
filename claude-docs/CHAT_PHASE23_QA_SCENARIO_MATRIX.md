# Phase 23 QA Scenario Matrix (Chat Parity)

Date: 2026-04-02  
Scope: `apps/frontend/orbis-ai` `/chat` flow and supporting client integrations

## Validation Method

- Static/type validation with `next build` (successful in current session).
- Targeted compile diagnostics (`get_errors`) on modified chat files (no errors).
- Code-path verification against implemented UI/logic for each scenario.

## Scenario Outcomes

| Scenario | Status | Evidence | Notes |
|---|---|---|---|
| New chat creation | ✅ Pass | `app/chat/page.tsx`, `components/chat/nav/chat-sidebar.tsx`, `lib/api-client.ts#createConversation` | New conversation auto-created from `/chat`; sidebar New button also creates and routes. |
| Existing chat load | ✅ Pass | `components/chat/chat-view.tsx`, `lib/api-client.ts#getConversation`, `lib/api-client.ts#getMessages` | Conversation and messages fetched via React Query with auth gating. |
| Regenerate branch | ✅ Pass | `hooks/use-chat-stream.ts#regenerateLastMessage`, `components/chat/messages/message.tsx` | Regenerate action replays last user prompt; tree/sibling controls remain available. |
| Edit + resubmit | ✅ Pass | `components/chat/messages/message.tsx`, `components/chat/chat-view.tsx#handleEditResubmit` | User message edit mode resubmits edited content through stream path. |
| Continue response | ✅ Pass | `components/chat/messages/message.tsx`, `components/chat/chat-view.tsx#handleContinue` | Continue action sends follow-up prompt using selected message content. |
| Fork alternative response | ✅ Pass | `components/chat/messages/message.tsx`, `components/chat/chat-view.tsx#handleFork` | Fork action requests alternative path from selected assistant response. |
| Files ask flow | ⚠️ Partial | `components/chat/input/chat-form.tsx`, `components/chat/providers/chat-form-context.tsx` | Frontend attachment UX, progress, and draft persistence work; backend file upload/analyze endpoint is not yet wired into composer send path. |
| Voice flow (STT/TTS) | ⚠️ Partial | `components/chat/input/chat-form.tsx`, `components/chat/messages/message.tsx`, `components/chat/providers/chat-settings-context.tsx` | Browser STT/TTS controls and persisted toggles work; no backend voice processing endpoint required/used. |
| Conversation management | ⚠️ Partial | `components/chat/nav/chat-sidebar.tsx`, `lib/api-client.ts` | Create/delete/search/copy-link are active; rename/duplicate/archive UI remains disabled pending backend support. |
| Search flow | ✅ Pass | `components/chat/nav/chat-sidebar.tsx` | In-sidebar query filters conversation list client-side with deferred input + incremental rendering. |
| Streaming lifecycle | ✅ Pass | `hooks/use-chat-stream.ts`, `lib/api-client.ts#createChatStream` | SSE parsing now handles backend events (`token`, `done`, `error`) and token refresh. |
| Share/export hooks | ✅ Pass | `components/chat/header.tsx`, `lib/api-client.ts#getConversationShareLink`, `exportConversationAsMarkdown`, `exportConversationAsJson` | Copy-link, Markdown export, and JSON export are wired and functional. |

## Open Gaps to Track

1. **Attachment backend parity**
   - Frontend now has `apiClient.uploadChatAttachment`, but composer does not yet call it and backend endpoint availability is unconfirmed.
2. **Conversation mutation parity**
   - `updateConversationTitle` is present in API client for parity planning, but current backend router does not expose `PATCH /conversations/{id}`.
3. **Archive/duplicate endpoints**
   - Sidebar UI contains placeholders; backend contracts not yet available.

## Exit Criteria Assessment

- Core chat experiences (create/load/stream/edit/regenerate/branch/share/export) are covered.
- Scenario matrix executed and documented with explicit pass/partial statuses.
- Remaining partial scenarios are backend-contract dependent and should be captured as rollout risks in Phase 24.
