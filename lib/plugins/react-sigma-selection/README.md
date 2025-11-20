# react-sigma-selection

`react-sigma-selection` is a selection plugin for [@react-sigma/core](https://github.com/sim51/react-sigma) that provides **box** and **lasso** selection capabilities for Sigma.js graphs. This plugin is designed to enhance graph visualization by enabling users to interactively select nodes using intuitive selection tools.

## Features

- **Box Selection**: Drag a rectangular area to select nodes within the box.
- **Lasso Selection**: Draw a freeform shape to select nodes within the lasso path.
- **Customizable Visuals**: Highlight selected nodes with custom styles.
- **Imperative API**: Activate, deactivate, and clear selections programmatically.
- **Spatial Indexing**: Efficient node selection using a quadtree-based spatial index.
- **Event Handlers**: Register custom event handlers for selection changes.

## Installation

Install the package:

```bash
npm install react-sigma-selection
# or
pnpm add react-sigma-selection
# or
yarn add react-sigma-selection
```

### Peer Dependencies

Ensure the following peer dependencies are installed in your project:

- `react >= 18`
- `@react-sigma/core >= 5.0.0`
- `sigma >= 3.0.0`
- `graphology >= 0.25`
- `d3-quadtree >= 3.0.0`
- `throttleit >= 2.0.0`

## Usage

### Basic Example

```tsx
import React, { useRef } from 'react';
import { SigmaContainer } from '@react-sigma/core';
import { NodeCircleProgram } from 'sigma/rendering';
import { NodeBorderProgram } from '@sigma/node-border';
import { SelectionPlugin } from 'react-sigma-selection';


const GraphWithSelection = () => {
  const selectionPluginRef = useRef(null);

  const handleSelectionChange = (selectedNodeIds) => {
    console.log('Selected nodes:', selectedNodeIds);
  };

  return (
    <SigmaContainer settings={{
        nodeProgramClasses: {
          border: NodeBorderProgram,
          circle: NodeCircleProgram,
        },
        // Other Sigma settings...
    }}>
      <SelectionPlugin
        ref={selectionPluginRef}
        onSelectionChange={handleSelectionChange}
        selectedNodeType="border"
      />
      {/* Add your graph rendering logic here */}
    </SigmaContainer>
  );
};

export default GraphWithSelection;
```

### Imperative API

The `SelectionPlugin` exposes the following methods via its `ref`:

- `activateBoxSelection()`: Activates box selection mode.
- `activateLassoSelection()`: Activates lasso selection mode.
- `clearSelection()`: Clears the current selection.
- `deactivate()`: Deactivates the selection plugin.
- `isActive()`: Returns whether the plugin is active.
- `getEventHandlers()`: Returns the event handlers for the active selection mode.

### Example: Activating Selection Modes

```tsx
const handleActivateBox = () => {
  selectionPluginRef.current?.activateBoxSelection();
};

const handleActivateLasso = () => {
  selectionPluginRef.current?.activateLassoSelection();
};

const handleClearSelection = () => {
  selectionPluginRef.current?.clearSelection();
};
```

## Configuration

The `SelectionPlugin` accepts the following props:

| Prop                | Type                          | Default       | Description                                                                 |
|---------------------|-------------------------------|---------------|-----------------------------------------------------------------------------|
| `onSelectionChange` | `(nodeIds: string[]) => void` | **Required** | Callback triggered when the selection changes.                             |
| `selectedNodeType`  | `string`                      | `'border'`    | Node type to apply to selected nodes (e.g., `'circle'`, `'border'`).       |
| `shouldIncludeNode` | `(nodeId: string) => boolean` | `() => true`  | Function to filter nodes eligible for selection.                           |
| `autoRegisterEvents`| `boolean`                    | `true`        | Whether to automatically register event handlers for the active selection. |

## Development

### File Structure

- **`components/SelectionPlugin.tsx`**: Main plugin component.
- **`createBoxSelectionHandlers.ts`**: Logic for box selection.
- **`createLassoSelectionHandlers.ts`**: Logic for lasso selection.
- **`spatial-index.ts`**: Utility for building a quadtree-based spatial index.
- **`types.ts`**: Type definitions for the plugin.

## License

This project is licensed under the [MIT License](./LICENSE).

## Author

Developed by **Bhupesh Dewangan**.