# TODO

## Planned UI changes (Settings / Monitoring / Dashboard defaults)

1. **Monitoring Services → per-tool config layout**
   - Remove the “Connection mode / Collection Mode” part from the expand-all cards.
   - Keep only **Basic Configuration** permanently visible (no dropdown / no collapsing).
   - On each tool-specific sub-tab page, show the **mode toggle (Live / Periodic)** as a top control above Basic Configuration.
   - Keep rest of fields and logic identical.

2. **Issue Categorization → tool-wise UI layout**
   - Keep “General issue categorization” as-is.
   - Recreate tool-wise issue categorization UI so that it is shifted to **side/lateral layout** in sub-tabs (layout change only; logic remains).

3. **Dashboard Settings → defaults**
   - In “Dashboard Defaults”, rename/change fields:
     - `Default Time Range` → **Periodic Fetch Time**.
     - `Maximum Alerts Per Page` → **Periodic Data Check Time**.
   - Keep `UI refresh` and `Landing view` labels/logic the same.

## Implementation steps
4. Update `Unified-MCP-Dashboard/src/app/components/SettingsView.tsx` accordingly.
5. Run TypeScript/lint check (if available) and ensure build passes.
6. Manual UI sanity check:
   - Monitoring tab: “All Services” shows no mode controls.
   - Tool-specific sub-tab shows mode toggle above Basic Configuration.
   - Dashboard defaults labels match requirements.

## Progress
- [ ] Implement Monitoring Services UI + mode placement
- [ ] Implement Issue Categorization tool-wise lateral layout
- [ ] Update Dashboard defaults labels


