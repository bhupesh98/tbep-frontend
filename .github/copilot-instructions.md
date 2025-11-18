# TBEP Frontend - AI Coding Agent Instructions

## Project Overview
**Target & Biomarker Exploration Portal (TBEP)** - A Next.js 16 bioinformatics platform for drug target discovery and network visualization using interactive graphs powered by Sigma.js and graphology.

## Architecture

### Core Stack
- **Framework**: Next.js 16 (App Router) with static export (`output: "export"`)
- **UI**: React 19, Tailwind CSS, Radix UI components, shadcn/ui patterns
- **Graph**: Sigma.js 3.x with `@react-sigma/core`, graphology for network analysis
- **Data**: Apollo Client for GraphQL queries to backend microservices
- **State**: Zustand store (`lib/hooks/use-store.ts`) for global graph state
- **AI Chat**: Vercel AI SDK with streaming responses (`components/chat/`)

### Service Architecture (Backend URLs)
The app communicates with 3 separate backend services via environment variables:
- `NEXT_PUBLIC_BACKEND_URL` - Main GraphQL API (gene data, interactions, Leiden clustering)
- `NEXT_PUBLIC_LLM_BACKEND_URL` - AI chat endpoint (streaming responses)
- `NEXT_PUBLIC_PYTHON_BACKEND_URL` - Python analytics service (GSEA pathway analysis only)

All backend calls use the `envURL()` helper from `lib/utils.ts` to validate URLs.

**Python Backend Integration**: Uses REST API with JSON payloads:
```tsx
// GSEA pathway analysis - POST with gene names array
const response = await fetch(`${envURL(process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL)}/gsea`, {
  method: 'POST',
  body: JSON.stringify(geneNames),
  headers: { 'Content-Type': 'application/json' },
  cache: 'force-cache',
});
```
Leiden clustering is NOT on Python backend - it's a GET endpoint on main backend.

### Data Flow
1. **User Input** (`app/(navbar)/(sidebar)/explore/page.tsx`) → Validate genes via GraphQL
2. **Graph Generation** → Query `GENE_GRAPH_QUERY`, store config in `localStorage.graphConfig`
3. **Network Page** (`app/network/page.tsx`) → Load from IndexedDB, render in `SigmaContainer`
4. **Analysis** → Fetch properties on-demand via `useLazyQuery`, update Zustand store

## Critical Patterns & Conventions

### GraphQL Usage
```tsx
// Always use useLazyQuery for on-demand fetching
import { useLazyQuery } from '@apollo/client/react';
const [fetchData, { loading }] = useLazyQuery<DataType, VariablesType>(QUERY);
```
Queries defined in `lib/gql.ts`: `GENE_GRAPH_QUERY`, `GENE_PROPERTIES_QUERY`, etc.

### State Management (Zustand)
```tsx
// Import store from lib/hooks
import { useStore } from '@/lib/hooks';       // Gene graph state
import { useKGStore } from '@/lib/hooks';     // Knowledge graph state
// Shallow equality for array/object selectors
import { useShallow } from 'zustand/react/shallow';
const geneIds = useStore(useShallow(state => state.geneNames.map(g => state.geneNameToID.get(g) ?? g)));
```

**Gene Graph Store (`useStore`):**
- Properties: `selectedNodes`, `networkStatistics`, `radioOptions`, `defaultNodeColor`, `forceSettings`
- Gene-specific data: `universalData`, `geneNames`, `geneNameToID`, `diseaseName`

**Knowledge Graph Store (`useKGStore`):**
- Properties: `nodePropertyData`, `kgPropertyOptions`, `sigmaInstance`
- Border treatment: `activePropertyNodeTypes: { color: Set<string>, size: Set<string> }`
- Node search: `nodeSearchQuery`, `nodeSuggestions`
- **CRITICAL**: `activePropertyNodeTypes` uses Sets to track which node types have active properties independently for color and size

### Client-Side Storage
- **localStorage**: Graph config (`graphConfig`), user history (`history`), UI preferences
- **IndexedDB**: Full network data in `universal` database with `network` and `files` stores
- Helper: `openDB(name, mode)` from `lib/utils.ts`

### Component Organization
```
components/
├── graph/             # Core graph logic (LoadGraph, SigmaContainer, GraphAnalysis)
├── knowledge-graph/   # KG-specific components (KGSigmaContainer, KGColorAnalysis, KGSizeAnalysis)
├── left-panel/        # Gene search, node styling controls
├── right-panel/       # Network stats, layout controls, legends
├── legends/           # NodeTypeLegend, EdgeTypeLegend - always-visible legends
├── statistics/        # OpenTargets heatmaps, Leiden analysis
├── chat/              # AI chat interface with streaming
├── ui/                # shadcn/ui primitives (DO NOT modify directly)
```

**Key Knowledge Graph Components:**
- `KGSigmaContainer` - Main container with graph settings, passes refs to child components
- `KGGraphEvents` - Event handlers (click, hover, drag, search highlighting)
- `KGGraphSettings` - Node/edge reducers for positioning, label hiding, highlighting
- `KGColorAnalysis` - Applies color properties to nodes (Gene + KG node types)
- `KGSizeAnalysis` - Applies size properties to nodes (Gene + KG node types)
- `KGBorderTreatment` - Centralized border treatment (faded nodes with colored borders)
- `LoadKnowledgeGraph` - Loads graph data from IndexedDB

### Error Handling & User Feedback
Use `sonner` toast notifications (NOT console.log for user-facing errors):
```tsx
import { toast } from 'sonner';
toast.error('Error message', { description: 'Details...' });
toast.promise(asyncFn(), { loading: 'Processing...', success: 'Done!', error: 'Failed' });
```

### Dynamic Imports
Sigma.js requires client-side only:
```tsx
const SigmaContainer = dynamic(() => import('@/components/graph').then(m => m.SigmaContainer), {
  ssr: false,
  loading: () => <Spinner />
});
```

### Use lucide-react Icons
Don't use svg for icons instead use lucide-icons.
```tsx
import { IconName } from 'lucide-react';
<IconName className="size-5 text-gray-600" />
```

## Critical Developer Workflows

### Development Setup
```bash
pnpm install
pnpm dev  # Runs on localhost:3000
```
**Required**: Create `.env.local` with backend URLs (see `.env.example`)

### Code Quality (Biome - NOT ESLint)
```bash
pnpm check         # Auto-fix lint + format issues (--unsafe)
pnpm lint          # Lint only
pnpm format        # Format only
pnpm check:report  # Summary report without changes
```
**Pre-commit**: Husky runs `biome check` via lint-staged on `*.{js,ts,tsx,json}`

### Build & Deploy
```bash
pnpm build  # Static export to .next/, generates sitemap + pagefind search index
```
**Note**: Builds with Nextra for docs (`/docs/**`) and static network app

## Key Technical Constraints

### Critical Dependency Versions
```json
"@radix-ui/react-scroll-area": "1.2.0"  // DO NOT UPGRADE - breaks left sidebar scroll
```
**Hours wasted**: 3 (per README)

### Next.js Configuration
- Static export mode (`output: "export"`)
- Images unoptimized (no Image Optimization API)
- Nextra integration for docs with `contentDirBasePath: "/docs"`
- Turbopack enabled for faster dev

### Graph Performance
- Large graphs (>500 nodes) show warning dialog before render
- Force layout uses D3-force library (note: `forceWorker` in store is a misnomer, no Web Workers used)
- Network statistics computed on-demand, not real-time

## File Naming & Structure
- Route groups: `app/(navbar)/(sidebar)/` for shared layouts
- Component exports: Use barrel exports (`index.ts`) in `components/*/`
- Interface types: Centralized in `lib/interface/` with category subfolders

## Documentation Site (Nextra)
Content in `content/` with `_meta.ts` files for nav structure. Uses MDX with custom components from `mdx-components.tsx`. Theme config in `theme.config.tsx`.

## Common Pitfalls
1. **Don't mutate graph directly** - Use `graph.updateNode()`, `graph.updateEdge()` methods
2. **Check IndexedDB availability** - Wrap in try/catch, show user-friendly error
3. **GraphConfig in localStorage** - Always validate existence before parsing JSON
4. **Component biome-ignore comments** - Next.js metadata exports trigger false positives
5. **Video files** - Not in git, download from Google Drive for production
6. **Backend service confusion** - Leiden is on main backend (GET), GSEA is on Python backend (POST)
7. **useSigma() context** - Only inside `SigmaContainer`, otherwise will throw error, if needed outside use `useKGStore(state => state.sigmaInstance)`. Before using useSigma() hook, ensure that the component is wrapped within the SigmaContainer component.
8. **Refs don't trigger re-renders** - When passing refs between components (e.g., `clickedNodesRef`, `highlightedNodesRef`), changes to `ref.current` won't trigger React re-renders. Must call `sigma.refresh()` to force Sigma to re-run node/edge reducers.
9. **Border treatment architecture** - Uses dual Set tracking (`activePropertyNodeTypes.color` + `activePropertyNodeTypes.size`) to preserve effects when switching between color/size tabs. Never use single string tracking.
10. **Label hiding with properties** - When properties are applied, labels hide for non-active node types UNLESS node is hovered, clicked, or searched. Always check all three conditions.

## Testing & Debugging
**No test suite currently** - project does not use automated tests. Debug network issues:
1. Check browser console for GraphQL errors
2. Verify backend URLs in Network tab
3. Inspect IndexedDB in Application tab
4. Check `localStorage.graphConfig` format

## Version Management & Releases
Version tracking follows semantic versioning in `content/CHANGELOG.mdx`:
- Changelog format: First `## v{major}.{minor}.{patch}` heading defines current version
- `getLatestVersionFromChangelog()` in `lib/getChangelogVersion.ts` parses version from changelog
- `package.json` version must match changelog for releases
- **Breaking changes** are documented explicitly (e.g., "BREAKING CHANGES: Now, tbep-backend@1.3.0 is needed")

Release types documented in changelog:
- `[FEATURE]` - New functionality
- `[IMPROVEMENT]` - Performance/UX enhancements
- `[BUG]` - Bug fixes
- `[RELEASE]` - Official releases (e.g., Zenodo DOI)

## AI Chat Integration
Streaming chat in `components/chat/ChatBase.tsx` using Vercel AI SDK's `useChat` hook. Backend must support streaming format. Track user sessions with `langfuse-tracking.ts` (localStorage-based user IDs).

---

## Advanced Knowledge Graph Patterns

### Border Treatment System
**Purpose**: Visual distinction between nodes with/without active properties (color or size analysis).

**Architecture**:
```tsx
// Store tracks properties independently
activePropertyNodeTypes: {
  color: Set<string>,  // e.g., Set(["Gene"])
  size: Set<string>    // e.g., Set(["Disease"])
}

// Combined check in components
const allActive = new Set([...activePropertyNodeTypes.color, ...activePropertyNodeTypes.size]);
const shouldHaveBorder = allActive.size > 0 && !allActive.has(nodeType);
```

**Key Files**:
- `lib/graph/knowledge-graph-renderer.ts` - `applySmartBorderTreatment()` function
- `components/knowledge-graph/KGBorderTreatment.tsx` - Centralized border management
- `KGColorAnalysis` - Updates `activePropertyNodeTypes.color` Set
- `KGSizeAnalysis` - Updates `activePropertyNodeTypes.size` Set

**Visual Effect**:
- Active property nodes: Normal rendering (type: 'circle', full color)
- Inactive nodes: Border treatment (type: 'border', color: FADED_NODE_COLOR, borderColor: original color)

**Critical Rules**:
1. NEVER clear border treatment when switching tabs (color ↔ size)
2. Only clear when BOTH color AND size Sets are empty
3. Always update Sets, never call `applyInactiveNodeBorderTreatment` directly
4. Border treatment applies after property updates via `KGBorderTreatment` useEffect

### Label Hiding System
**Purpose**: Reduce visual clutter when properties are applied, only show labels for relevant nodes.

**Logic Flow**:
```tsx
// In KGGraphSettings nodeReducer
const isHoveredOrClicked = node === hoveredNode || clickedNodesRef?.current.has(node);
const isSearched = highlightedNodesRef?.current.has(node);
const allActive = new Set([...activePropertyNodeTypes.color, ...activePropertyNodeTypes.size]);

// Hide label if property active AND node type not active AND not interacted with
if (allActive.size > 0 && !isHoveredOrClicked && !isSearched) {
  if (!allActive.has(nodeType)) {
    data.label = '';
  }
}

// Force labels for interacted nodes
if ((isHoveredOrClicked || isSearched) && allActive.size > 0) {
  data.label = originalLabel;
  data.forceLabel = true;
}
```

**Three Override Conditions** (always show label):
1. **Hovered**: `node === hoveredNode`
2. **Clicked**: `clickedNodesRef.current.has(node)`
3. **Searched**: `highlightedNodesRef.current.has(node)`

### Ref-Based Communication Pattern
**Problem**: Multiple components need to share state without prop drilling, but refs don't trigger re-renders.

**Solution**:
```tsx
// KGSigmaContainer - Create refs at top level
const clickedNodesRef = React.useRef(new Set<string>());
const highlightedNodesRef = React.useRef(new Set<string>());

// Pass to child components
<KGGraphEvents clickedNodesRef={clickedNodesRef} highlightedNodesRef={highlightedNodesRef} />
<KGGraphSettings clickedNodesRef={clickedNodesRef} highlightedNodesRef={highlightedNodesRef} />

// In child components - After updating ref, force refresh
highlightedNodesRef.current = nodeIds;
sigma.refresh(); // CRITICAL - triggers nodeReducer re-run
```

**When to use refs vs state**:
- **Refs**: Cross-component node tracking (clicked, searched nodes) where exact render timing isn't critical
- **State**: UI state that needs immediate visual updates (hover state, dialogs)
- **Store**: Global application state (properties, settings, data)

### Node Property Application Pattern
**For Color Properties**:
```tsx
// Clear property
useKGStore.setState(state => ({
  activePropertyNodeTypes: {
    ...state.activePropertyNodeTypes,
    color: new Set(),
  },
}));

// Set property for specific nodeType
useKGStore.setState(state => ({
  activePropertyNodeTypes: {
    ...state.activePropertyNodeTypes,
    color: new Set(['Gene']),
  },
}));
```

**For Size Properties**: Same pattern but use `size` key instead of `color`.

**Property Detection Logic**:
```tsx
// Detect which nodeType a property belongs to
const propertyNodeType = Object.keys(nodePropertyData).find(
  nodeId => nodePropertyData[nodeId]?.[selectedProperty] !== undefined,
);
const detectedNodeType = propertyNodeType 
  ? graph.getNodeAttribute(propertyNodeType, 'nodeType') 
  : DEFAULT_NODE_TYPE;
```

### Graph Event Restoration Pattern
**Problem**: When dismissing clicked nodes or edges, must restore correct visual state (border treatment if property active).

**Helper Function**:
```tsx
const restoreNodeType = (
  graph, node, highlightedNodes, clickedNodes, activePropertyNodeTypes
) => {
  if (highlightedNodes.has(node) || clickedNodes.has(node)) {
    attr.type = 'border';
    attr.highlighted = true;
  } else {
    const allActive = new Set([...activePropertyNodeTypes.color, ...activePropertyNodeTypes.size]);
    const shouldHaveBorder = allActive.size > 0 && !allActive.has(nodeType);
    
    if (shouldHaveBorder) {
      attr.type = 'border';
      attr.color = FADED_NODE_COLOR;
      attr.borderColor = typeColorMap.get(nodeType) || attr.borderColor;
    } else {
      attr.type = 'circle';
    }
  }
};
```

**Usage**: Call after removing node from clicked/searched sets to restore proper appearance.

### Performance Considerations

**Ref Updates with Refresh**:
- Updating refs is cheap (no React reconciliation)
- `sigma.refresh()` is moderately expensive (re-runs all reducers)
- Only call `sigma.refresh()` when ref changes affect visual state
- Batch updates when possible (update multiple refs, then single refresh)

**NodeReducer Optimization**:
- Runs for EVERY node on EVERY render/refresh
- Keep logic fast and simple
- Cache computed values outside reducer when possible (e.g., `allActiveNodeTypes`)
- Avoid creating new objects/arrays inside reducer

**Border Treatment Updates**:
- Uses `graph.updateEachNodeAttributes()` for bulk updates
- Triggered by `activePropertyNodeTypes` changes via useEffect in `KGGraphSettings`.

### Debugging Tips

**Border treatment not applying**:
1. Check `useKGStore.getState().activePropertyNodeTypes` - are Sets populated?
2. Verify `KGBorderTreatment` is rendered in component tree
3. Check console for errors in `applySmartBorderTreatment`
4. Verify `typeColorMap` has entries for all node types

**Labels not hiding/showing**:
1. Check `allActiveNodeTypes.size > 0` - is a property active?
2. Verify node is not in `clickedNodesRef.current` or `highlightedNodesRef.current`
3. Check if `forceLabel` is being set incorrectly
4. Ensure `sigma.refresh()` called after ref updates

**Searched nodes not highlighting instantly**:
1. Verify `sigma.refresh()` called after `highlightedNodesRef.current = nodeIds`
2. Check `highlightedNodesRef` passed correctly to both Events and Settings
3. Ensure `isSearched` check uses `?.current.has()` with optional chaining

**Property effects disappearing on tab switch**:
1. Check if old `applyInactiveNodeBorderTreatment` calls remain (should be removed)
2. Verify `activePropertyNodeTypes` uses Set structure, not single string
3. Confirm `KGBorderTreatment` monitors both `color` and `size` Sets
4. Check that Sets are updated, not replaced entirely (use spread `...state.activePropertyNodeTypes`)
