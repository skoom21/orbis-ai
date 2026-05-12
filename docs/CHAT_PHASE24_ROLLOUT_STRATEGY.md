# Phase 24 Rollout Strategy: `/chat` Rebuild Cutover

Date: 2026-04-02
Owner: Frontend (Orbis AI)

## Objectives

1. Cut over to rebuilt `/chat` with low regression risk.
2. Preserve user continuity (existing conversations and drafts).
3. Maintain fast rollback path with minimal operational overhead.

## Release Scope

- Included:
  - Rebuilt chat shell, composer, streaming, branching/siblings, settings persistence, side panel mount, mobile parity, accessibility/performance hardening, share/export hooks.
- Deferred (backend-dependent):
  - Full attachment upload/analyze pipeline.
  - Rename/duplicate/archive conversation mutation endpoints.

## Feature Flag Plan

Use one top-level frontend flag and two capability sub-flags:

- `NEXT_PUBLIC_CHAT_REBUILD_ENABLED`
  - `false`: route users to legacy chat implementation (or existing stable path).
  - `true`: use rebuilt `/chat` shell.
- `NEXT_PUBLIC_CHAT_ATTACHMENTS_BACKEND_ENABLED`
  - gates backend upload-integrated attachment flow.
- `NEXT_PUBLIC_CHAT_CONVO_MUTATIONS_ENABLED`
  - gates rename/duplicate/archive actions when backend endpoints are ready.

## Rollout Stages

### Stage 0 — Internal verification (0% public)

- Enable rebuild for internal accounts only.
- Validate:
  - create/load chat
  - streaming responses
  - edit/regenerate/continue/fork
  - mobile nav and keyboard/a11y interactions

Exit criteria:
- no P0/P1 defects in internal smoke set
- successful production build artifact

### Stage 1 — Canary (5-10% users)

- Enable `CHAT_REBUILD` for a small cohort.
- Track:
  - stream failure rate
  - conversation load/create latency
  - client error logs for `/chat/[id]`

Rollback trigger:
- sustained error spike above baseline for 15+ minutes

### Stage 2 — Gradual expansion (25% → 50% → 100%)

- Increase rollout in fixed windows after each successful monitoring interval.
- Keep deferred features hard-disabled unless backend contract is confirmed.

## Migration Checkpoints

1. **Pre-cutover**
   - Confirm token refresh and SSE behavior against production API.
   - Confirm existing conversations render correctly in rebuilt tree.
2. **Mid-rollout**
   - Compare chat completion success rates between cohorts.
   - Validate export/share functions in canary users.
3. **Post-cutover**
   - Keep rollback switch for at least one full release cycle.

## Fallback & Rollback Behavior

- Primary rollback: toggle `NEXT_PUBLIC_CHAT_REBUILD_ENABLED=false` and redeploy frontend.
- Safe degradation:
  - hide mutation UI (rename/duplicate/archive) until backend ready.
  - keep attachment flow in client-only mode when backend upload is unavailable.
- Data safety:
  - conversation/message persistence remains server-side under same API domain.
  - draft/settings remain localStorage scoped and non-destructive.

## Operational Runbook (Concise)

1. Deploy with flags set for Stage 0.
2. Verify internal smoke checklist.
3. Enable canary cohort (5-10%).
4. Monitor metrics/logs for 30-60 minutes.
5. Expand gradually to 100% if stable.
6. If regression occurs, flip rebuild flag off and redeploy.

## Success Metrics

- Chat stream success ratio ≥ baseline.
- No increase in auth refresh or SSE parsing errors.
- No major mobile navigation regressions.
- No unresolved P1 accessibility defects.

## Known Risks & Mitigations

1. **Backend endpoint mismatch (attachments/mutations)**
   - Mitigation: keep sub-flags off until backend confirms contracts.
2. **SSE event shape drift**
   - Mitigation: event parser supports token/done/error variants and token refresh retry.
3. **User confusion during phased rollout**
   - Mitigation: cohort-based enablement and rapid rollback path.

## Final Cutover Recommendation

Proceed with staged rollout once Stage 0 and Stage 1 pass with no critical regressions. Keep deferred backend-dependent features behind explicit flags until backend APIs are production-ready.
