# SUMMIT DESIGN MANIFESTO: The Definitive Intelligence OS

## 1. EXECUTIVE DIAGNOSIS
**Current Maturity Assessment:** The current Summit UI represents a functional, MVP-to-Growth stage engineering-driven interface. It is capable but lacks the unified, cinematic precision required for an apex-tier intelligence platform.
**Top Weaknesses:** Fragmented component usage, generic SaaS visual cues, insufficient data density paired with excessive chrome, and a lack of explicit provenance and governance surfacing.
**Biggest Opportunity Zones:** IntelGraph visualization, multi-pane analyst investigative workflows, unified evidence chain-of-custody, and cinematic executive dashboards.
**What Prevents Billion-Dollar Optics:** The absence of a cohesive, "museum-grade" architectural layout. It feels like software built from disparate libraries rather than a singular, inevitable command center.

## 2. SUMMIT NORTH STAR
**Product Presence:** Summit is the definitive intelligence operating system—a monumentally powerful, impossibly clear, and intensely serious command center that turns chaotic data into inevitable action.
**Website/Company Presence:** Summit is the apex predator of the intelligence space; the site must exude institutional credibility, absolute security, and undeniable superiority over Palantir and Recorded Future.

## 3. PRODUCT + BRAND DESIGN PRINCIPLES
1. **Density with Clarity:** Maximize signal; eliminate chartjunk and chrome.
2. **Cinematic Restraint:** Dark-first, high contrast, architectural panels, zero gimmicks.
3. **Truth is Visible:** Evidence, provenance, and governance are first-class citizens.
4. **Inevitable Navigation:** Interactions should feel obvious to novices and limitless to experts.
5. **Architectural Grids:** Use whitespace as structure, not emptiness.
6. **Semantic Restraint:** Color is for meaning (status, alert, anomaly), never decoration.
7. **Calm Power:** The UI must feel serene even when displaying massive complexity.
8. **Keyboard-First Command:** Expert operators never leave the keyboard.
9. **Progressive Disclosure:** Reveal depth dynamically; never hide power behind obscure menus.
10. **Absolute Trust:** Every interaction must reinforce system maturity and institutional reliability.

## 4. INFORMATION DESIGN DOCTRINE
*   **Density:** We embrace high density. Data should be tightly packed but rigidly aligned. Use monospace fonts for tabular data and precise alignment for rapid scanning.
*   **Evidence & Hierarchy:** Every claim or insight surfaced by AI MUST have a one-click path to its provenance. Evidence is visually tethered to the insight (e.g., via muted, interactive citation badges).
*   **Power:** Action surfaces (commands, graph traversals, policy updates) must be omnipresent but visually quiet until invoked.

## 5. VISUAL SYSTEM SPEC
*   **Color:** Deep space/obsidian backgrounds (`#0A0A0A` to `#121212`). Crisp white/off-white text for primary reading. High-contrast semantic accents (e.g., a striking electric blue or stark amber for critical signals).
*   **Type:** Editorial, institutional sans-serif (e.g., Inter, Inter Tight, or a geometric sans) paired with a rigorous monospace (e.g., JetBrains Mono, Fira Code) for data and intelligence artifacts.
*   **Spacing & Grid:** Strict 4px/8px baseline grid. Minimal padding inside data-dense tables; generous padding around macro-panels to create architectural separation.
*   **Surfaces:** Flat, solid fills. 1px stark borders (`border-white/10`). Zero soft drop shadows; use hard shadows or border-bottoms to indicate elevation.
*   **Iconography:** Sharp, 1px stroke, geometric. No whimsical or rounded edges.
*   **Motion:** Snap, zero-bounce transitions (e.g., 150ms ease-out). Motion is strictly for orienting the user (e.g., slide-in panels), never for flair.
*   **Charts & Graphs:** Tufte-inspired. No gridlines unless necessary. High data-ink ratio.

## 6. INFORMATION ARCHITECTURE
**App IA:**
*   `/command`: Global mission control (executive view).
*   `/intelgraph`: The flagship spatial/network analysis environment.
*   `/investigations`: Multi-pane workspace for active case files and narrative analysis.
*   `/agents`: AI orchestration and deployment command.
*   `/governance`: Audit, policy, chain-of-custody, and system health.
*   *Global Nav:* Left-rail, collapsed to icons for experts, expandable.
*   *Command Palette:* `Cmd+K` global access to any entity, action, or workflow.

## 7. DESIGN SYSTEM SPEC
*   **Tokens:** `color-bg-base`, `color-bg-panel`, `color-border-subtle`, `color-text-primary`, `color-text-muted`, `color-signal-alert`.
*   **Primitives:** `<Box>`, `<Text>`, `<Grid>`, `<Flex>`.
*   **Canonical Components:**
    *   `CommandPanel`: Hard-edged container for data.
    *   `EvidenceTag`: Inline citation linking to provenance.
    *   `DataGrid`: Ultra-dense, sortable table with monospace numeric columns.
*   **State Patterns:** Hover states are crisp (background shift, no scale). Focus states have a stark 1px outline.

## 8. SCREEN REDESIGN SPECS
*   **Command Center:** 3-column split view. Left: Alert streams. Center: Macro trends. Right: Active AI agent status.
*   **IntelGraph:** Full-bleed canvas. Translucent floating control palettes. Nodes are sharp rectangles or hard circles. Edges are 1px solid lines with directional arrows.
*   **Entity Dossier:** Journalistic layout. Title, aliases, confidence score top-left. Timeline of events bottom. Right-rail for connected entities.

## 9. DEMO EXPERIENCE DESIGN
*   **90-Second Wow Sequence:**
    1. Open on a globally zoomed IntelGraph resolving a massive threat network.
    2. Click a node, open a split-pane Dossier instantly.
    3. Trigger an AI Agent to "Resolve Sub-Network", watching the graph animate the resolution live with EvidenceTags popping in.
*   **Seeded Data:** Fictional but hyper-realistic geopolitical or cyber-threat data. No "John Doe" or "Test User".

## 10. IMPLEMENTATION PLAN
1.  **Foundation:** Refactor Tailwind/CSS tokens to the new dark-architectural palette.
2.  **Typography:** Swap out font stacks and enforce monospace in data tables.
3.  **Layout:** Replace standard padding/margins with the rigid 4/8px grid. Remove all border-radius > 4px. Remove soft drop shadows.
4.  **IntelGraph:** Reskin the graph rendering engine (e.g., React Flow, Cytoscape) to match the new sharp, high-contrast aesthetic.
5.  **Evidence CI:** Ensure all UI components that display insights accept an `evidenceRef` prop.

## 11. PRODUCTION REFACTOR / CODE
*(Phase 1 Execution: Global CSS & Tailwind Refoundation)*
*   Reset `tailwind.config.ts` to strip default colors and inject the `Summit Obsidian` palette.
*   Update `globals.css` with the strict border and typography rules.
*   Refactor standard `<Card>` to `<Panel>` with stark borders.

## 12. FINAL COMPETITIVE QUALITY CHECK
*   *Does it look museum-grade?* Yes, through extreme restraint and typographic rigor.
*   *Does it feel procurement-ready?* Yes, the immediate surfacing of governance and audit trails sells the enterprise reality.
*   *Does it support expert operations?* Yes, density and keyboard-first design respect the operator's time.
