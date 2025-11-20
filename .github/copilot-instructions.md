# TBEP Frontend - AI Coding Agent Instructions

## Project Overview
**Target & Biomarker Exploration Portal (TBEP)** - Next.js 16 bioinformatics platform for drug target discovery with interactive network visualization (Sigma.js + graphology) and AI-powered analysis.

## Tech Stack
- **Framework**: Next.js 16 App Router, static export (`output: "export"`)
- **UI**: React 19, Tailwind CSS, Radix UI, shadcn/ui, lucide-react icons
- **Graph**: Sigma.js 3.x (`@react-sigma/core`), graphology, D3-force layout
- **Data**: Apollo Client (GraphQL), IndexedDB, localStorage
- **State**: Zustand (`lib/hooks/use-store.ts` for gene graphs, `useKGStore` for knowledge graphs)
- **AI**: Vercel AI SDK with streaming (`components/chat/`, `ai-elements/`)
- **Code Quality**: Biome (NOT ESLint), Husky pre-commit hooks

## Service Architecture
Three backend services accessed via environment variables (validated with `envURL()` from `lib/utils.ts`):

| Service | Variable | Purpose | API Type |
|---------|----------|---------|----------|
| Main Backend | `NEXT_PUBLIC_BACKEND_URL` | Gene data, interactions, Leiden clustering | GraphQL + REST |
| LLM Backend | `NEXT_PUBLIC_LLM_BACKEND_URL` | AI chat (streaming responses) | REST |
| Python Backend | `NEXT_PUBLIC_PYTHON_BACKEND_URL` | GSEA pathway analysis ONLY | REST |

**Critical**: Leiden clustering is on main backend (GET), NOT Python backend. GSEA uses Python backend (POST with JSON).

## Data Flow & Storage

### Client-Side Storage
- **localStorage**: `graphConfig` (network settings), `history` (user searches), UI preferences
- **IndexedDB**: Full network data (`universal` database with `network` and `files` stores)
- Helper: `openDB(name, mode)` from `lib/utils.ts`

### Typical Flow
1. **Explore Page** (`app/(navbar)/(sidebar)/explore/page.tsx`) → Validate genes via `GENE_VERIFICATION_QUERY`
2. **Generate Graph** → `GENE_GRAPH_QUERY`, store config in `localStorage.graphConfig`
3. **Network Page** (`app/network/page.tsx`) → Load from IndexedDB, render in `SigmaContainer` (dynamic import, SSR disabled)
4. **Analysis** → Fetch properties with `useLazyQuery`, update Zustand store

## Critical Patterns

### GraphQL (Apollo Client)
```tsx
// ALWAYS use useLazyQuery for on-demand fetching
import { useLazyQuery } from '@apollo/client/react';
const [fetchData, { loading }] = useLazyQuery<DataType, VariablesType>(QUERY);
```
Queries in `lib/gql.ts`: `GENE_GRAPH_QUERY`, `GENE_PROPERTIES_QUERY`, `TOP_GENES_QUERY`, etc.

### State Management (Zustand)
```tsx
import { useStore } from '@/lib/hooks';       // Gene graph state
import { useKGStore } from '@/lib/hooks';     // Knowledge graph state
import { useShallow } from 'zustand/react/shallow';

// ALWAYS use shallow for array/object selectors
const geneIds = useStore(useShallow(state => 
  state.geneNames.map(g => state.geneNameToID.get(g) ?? g)
));
```

**Key Store Properties**:
- **useStore**: `selectedNodes`, `networkStatistics`, `geneNames`, `universalData`, `radioOptions`
- **useKGStore**: `nodePropertyData`, `sigmaInstance`, `activePropertyNodeTypes: string[]`

## Component Architecture

```
components/
├── graph/             # Gene network (LoadGraph, SigmaContainer, GraphAnalysis)
├── knowledge-graph/   # KG-specific (KGSigmaContainer, KGColorAnalysis, KGBorderTreatment)
├── ai-elements/       # Vercel AI SDK UI primitives (conversation, message, prompt-input)
├── chat/              # Chat integration (ChatBase.tsx with useChat hook)
├── left-panel/        # Gene search, node styling
├── right-panel/       # Network stats, layout, legends
├── legends/           # Always-visible NodeTypeLegend, EdgeTypeLegend
├── statistics/        # OpenTargets heatmaps, Leiden analysis
├── ui/                # shadcn/ui primitives (DO NOT modify directly)
```

### Knowledge Graph (KG) Components
- **KGSigmaContainer** - Main container, passes refs (`clickedNodesRef`, `highlightedNodesRef`) to children
- **KGGraphSettings** - Node/edge reducers (positioning, label hiding, highlighting)
- **KGColorAnalysis** / **KGSizeAnalysis** - Apply properties, update `activePropertyNodeTypes` array
- **KGBorderTreatment** - Centralized border management (faded nodes with colored borders)

### Error Handling
Use `sonner` toasts for user-facing errors (NOT `console.log`):
```tsx
import { toast } from 'sonner';
toast.error('Error message', { description: 'Details', cancel: { label: 'Close', onClick() {} } });
toast.promise(asyncFn(), { loading: 'Processing...', success: 'Done!', error: 'Failed' });
```

### Icons
**ALWAYS** use lucide-react, never raw SVG:
```tsx
import { IconName } from 'lucide-react';
<IconName className="size-5" />
```

## Critical Rules

### Graph Mutations
**NEVER** mutate graph directly. Use `graph.updateNode()`, `graph.updateEdge()`, `graph.updateEachNodeAttributes()`.

### Sigma.js Context
`useSigma()` hook ONLY works inside `<SigmaContainer>`. Outside, use `useKGStore(state => state.sigmaInstance)`.

### Refs & Re-renders
Refs don't trigger React re-renders. After updating `clickedNodesRef.current`, call `sigma.refresh()` to re-run reducers.

### Border Treatment (Knowledge Graph)
- Uses `activePropertyNodeTypes: string[]` to track node types with active properties
- Array contains node types that have color OR size properties applied
- Visual: Active nodes = `type: 'circle'`, Inactive = `type: 'border', color: FADED_NODE_COLOR`

### Label Hiding (Knowledge Graph)
Labels hide for non-active node types UNLESS:
1. Hovered (`node === hoveredNode`)
2. Clicked (`clickedNodesRef.current.has(node)`)
3. Searched (`highlightedNodesRef.current.has(node)`)

## Development Workflow

### Setup
```bash
pnpm install
pnpm dev  # localhost:3000
```
Create `.env.local` with backend URLs (see `.env.example`).

### Code Quality
```bash
pnpm check         # Auto-fix with Biome (--unsafe flag)
pnpm lint          # Lint only
pnpm format        # Format only
pnpm check:report  # Summary without changes
```
Pre-commit: Husky runs `biome check` on `*.{js,ts,tsx,json}`.

### Build
```bash
pnpm build  # Static export + sitemap + pagefind search index
```
Nextra docs in `/docs/**`, static network app.

## Critical Constraints

### Dependency Locks
```json
"@radix-ui/react-scroll-area": "1.2.0"  // DO NOT UPGRADE (breaks left sidebar scroll)
```

## Common Pitfalls
1. **IndexedDB checks** - Wrap in try/catch, show user-friendly error
2. **localStorage.graphConfig** - Validate existence before `JSON.parse()`
3. **biome-ignore comments** - Next.js metadata exports trigger false positives
4. **Video files** - Not in git, download from [Google Drive](https://drive.google.com/drive/folders/1LvPTY8Z559shYoWTaSOHFuWOFKGG8QHv) for production
5. **Backend confusion** - Leiden = main backend (GET), GSEA = Python backend (POST)
6. **NodeReducer performance** - Runs for EVERY node on EVERY refresh, keep logic fast

## Testing & Debugging
**No test suite** - Debug via:
1. Browser console (GraphQL errors)
2. Network tab (backend URLs)
3. Application tab (IndexedDB, localStorage)

## AI Chat Integration
- **Current**: Streaming chat (`components/chat/ChatBase.tsx`) with Vercel AI SDK's `useChat` hook
- **Models**: Switchable between GPT-4o and Llama 3.1 (`LLM_MODELS` in `lib/data`)
- **Tracking**: Langfuse integration (`langfuse-tracking.ts`) with localStorage-based user IDs
- **Limitation**: Chat does NOT have graph context (noted in disclaimer)

### Future Agentic Features (Roadmap)
Planning integration of:
- **MCP Servers** - Multi-step reasoning with contextual understanding
- **Graph-Aware Agents** - Natural language queries ("show all genes connected to breast cancer")
- **Web Search** - Tavily API for latest research citations
- **Command Palette** - Cmd+K style interface for task automation
- **Dynamic Graph Updates** - Real-time modifications based on agent outputs

For implementation, maximize Vercel AI SDK and `ai-elements` UI library patterns.

## Advanced Knowledge Graph Patterns

### Algorithm Results & Visualization

**Path Finding & DWPC**:
- Use `graphology-simple-path`'s `allSimplePaths()` for path finding (NOT custom BFS)
- Always sort paths by length: `results.sort((a, b) => a.length - b.length)`
- Set `zIndex: 100` on highlighted nodes/edges for visibility in dense graphs
- Reset `zIndex: undefined` when clearing highlights
- Store original node sizes to prevent accumulation: `originalNodeSizes.get(node)`

**Focused View Pattern**:
```tsx
// Hide all nodes/edges, then show only results
if (focusedView) {
  graph.updateEachNodeAttributes((_node, attr) => {
    attr.hidden = true;
    return attr;
  });
  // Then selectively show result nodes/edges
  resultNodes.forEach(node => {
    if (graph.hasNode(node)) {
      graph.setNodeAttribute(node, 'hidden', false);
    }
  });
}
```

**Form Validation**:
- Disable Apply button when required fields empty
- Use dynamic validation: `disabled={(name === 'DWPC' || name === 'Path Finding') && (!formState.source || !formState.target)}`

### Ref-Based Communication
```tsx
// KGSigmaContainer - Create refs at top
const clickedNodesRef = React.useRef(new Set<string>());
const highlightedNodesRef = React.useRef(new Set<string>());

// Pass to children
<KGGraphEvents clickedNodesRef={clickedNodesRef} highlightedNodesRef={highlightedNodesRef} />
<KGGraphSettings clickedNodesRef={clickedNodesRef} highlightedNodesRef={highlightedNodesRef} />

// Update and force refresh
highlightedNodesRef.current = nodeIds;
sigma.refresh(); // CRITICAL
```

**When to use**:
- **Refs**: Cross-component tracking (clicked/searched nodes)
- **State**: Immediate UI updates (hover, dialogs)
- **Store**: Global app state (properties, settings)

### Property Application
```tsx
// Add nodeType to active properties
useKGStore.setState(state => ({
  activePropertyNodeTypes: state.activePropertyNodeTypes.includes('Gene')
    ? state.activePropertyNodeTypes
    : [...state.activePropertyNodeTypes, 'Gene'],
}));

// Remove nodeType from active properties
useKGStore.setState(state => ({
  activePropertyNodeTypes: state.activePropertyNodeTypes.filter(t => t !== 'Gene'),
}));
```

### Event Restoration
When dismissing clicked nodes, restore correct visual state:
```tsx
const allActive = new Set(activePropertyNodeTypes);
const shouldHaveBorder = allActive.size > 0 && !allActive.has(nodeType);

if (shouldHaveBorder) {
  attr.type = 'border';
  attr.color = FADED_NODE_COLOR;
  attr.borderColor = typeColorMap.get(nodeType) || attr.borderColor;
} else {
  attr.type = 'circle';
}
```

### Performance Tips
- Batch ref updates, then single `sigma.refresh()`
- Cache computed values outside reducers (e.g., `allActiveNodeTypes`)
- Avoid creating objects/arrays inside node reducers
- Use `graph.updateEachNodeAttributes()` for bulk updates

## Quick Reference

### File Structure
- Routes: `app/(navbar)/(sidebar)/` for shared layouts
- Exports: Barrel exports (`index.ts`) in `components/*/`
- Types: `lib/interface/` with category subfolders
- Docs: `content/` with `_meta.ts` for nav (Nextra + MDX)

### Key Files
- GraphQL queries: `lib/gql.ts`
- Utilities: `lib/utils.ts` (`envURL`, `openDB`, event emitter)
- Graph helpers: `lib/graph/` (renderers, canvas utilities)
- Data constants: `lib/data/` (property mappings, color scales)

### Event System
Custom event emitter in `lib/utils.ts`:
```tsx
import { Events, eventEmitter } from '@/lib/utils';
eventEmitter.emit(Events.EXPORT, { format: 'png' });
eventEmitter.on(Events.ALGORITHM_RESULTS, (data) => { /* ... */ });
```
