# MCP Dashboard UI Enhancement Plan

This is a large, multi-area change set. I'll group the work into focused phases and implement each without touching unrelated functionality.

## Phase 0 — Quick fixes & foundation

- Fix the SSR hydration mismatch on the dashboard timestamp (`30 Jun 2026, 06:07 AM` vs `11:37 AM`): wrap the live clock in a `useEffect`-mounted state so the server renders an empty placeholder and the client fills it in.
- Add a lightweight **ThemeProvider** (`light` / `dark`) using a `data-theme` attribute on `<html>` plus a `useTheme` hook persisted in `localStorage`. Toggle lives in the Header next to view tabs.
- Read current `DashboardView`, `SettingsView`, `Header`, and `ChatView` to map exact integration points before editing.

## Phase 1 — AI Chat simplification (Spec §1)

- Remove `APPLICATIONS` grouping and collapsible group rows in `ChatView`.
- Replace the sidebar with: **+ New Chat** button at the top, then a flat chronological list of past sessions (newest first).
- On mount of `ChatView`, auto-create and select a new blank chat (skip if one was just created).
- Remove the "Select a chat" empty state — there is always an active chat.
- Update `sendMessage` greeting/scope text to be tool-agnostic (no per-app scope).

## Phase 2 — Evaluation Matrix (Spec §2)

- In `DashboardView`'s matrix:
  - Reorder columns so `Application` comes before `Source`.
  - Replace black cell backgrounds with white; ensure all text stays black for readability in light theme (dark theme uses inverted tokens).
  - Remove any grouping; sort rows by **most recent issue timestamp desc**, tiebreak alphabetically by Source.

## Phase 3 — Issue Details popup (Spec §3)

- Add an `IssueDetailsDialog` using existing `ui/dialog`.
- Wire row click in the All Issues table to open it with a property/value grid of every field on the issue object.

## Phase 4 — Global filtering (Spec §4)

- Lift filter state (search query + selected KPI cards + selected issue-category card) to `DashboardView`.
- Compute a single `filteredIssues` array and feed it to KPI cards, Issue cards, Charts, Evaluation Matrix, and Issue Table.
- KPI card selection rules:
  - Same group → union.
  - KPI selections + one Issue Category card → `category AND union(kpis)`.
  - Re-clicking a selected card deselects it; visual highlight via `ring-2 ring-primary` on selected card.
- Top-bar search now filters the same dataset (not just the table).

## Phase 5 — Issue Categorization (Spec §5)

- New Settings section **Issue Categorization** with create / edit / delete categories, each with a name and a keyword list.
- Validation: a keyword can belong to only one category; show inline warning on duplicate attempt.
- Persist to `localStorage` (no backend).

## Phase 6 — Time filter restrictions (Spec §7)

- Remove the `30D` preset; add presets `1H / 6H / 24H / 7D` and `Custom`.
- Custom range picker rejects > 7 days with an inline validation message; Apply button disabled until valid.

## Phase 7 — Manual Refresh (Spec §8)

- Add a **Refresh** icon button in the dashboard header.
- On click: regenerate the data snapshot (or bump a `refreshKey`), update "last updated" timestamp, and clear all active dashboard filters (search, KPI selections, category selection).

## Phase 8 — AI Monitoring page (Spec §9)

- Add a new view `ai-monitoring` to `View` union and a nav item in the Header.
- Build `AIMonitoringView.tsx` with a grid of stat cards & gauges for: Total Tokens, Questions Today, Cache Usage, Memory Usage, Prompt Tokens, Completion Tokens, Active Model, Model Status, Requests Processed, Cache Hit Rate, Total Conversations, Avg Response Time, GPU Usage.
- Mock data only.

## Phase 9 — Theme support (Spec §10)

- Apply the Phase 0 theme provider across all surfaces (already use semantic tokens, so most just inherit). Verify Evaluation Matrix, charts, dialogs.
- Add a sun/moon toggle in the Header.

## Phase 10 — Settings cleanup (Spec §11)

- Remove from `SettingsView`: Import Configuration, Export Configuration, Recently Modified.
- Leave all other settings (Monitoring Services, Dashboard, AI & Models, etc.) untouched apart from adding the new Issue Categorization section from Phase 5.

## Technical notes

- All state additions are client-only; no schema or backend changes.
- Filter logic centralized in a `useDashboardFilters` hook inside `DashboardView` to keep child components dumb.
- Theme uses CSS variables already defined in `styles.css`; just toggle a class/attribute on `<html>`.
- Where existing types live in `src/app/config.ts`, extend the `View` union and add an optional `AI_MONITORING` constant.
- Run `tsgo` after each phase; fix any type errors before moving on.

## Out of scope (per spec)

- Backend wiring for AI Monitoring stats.
- Any redesign of existing components beyond what's listed.
- Changes to Header/Sidebar visual style beyond adding the theme toggle, AI Monitoring nav item, and Refresh button.
