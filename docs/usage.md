# Usage Guide

C-Pulse operates completely within the VS Code UI paradigm, presenting rich graphical abstractions synced exactly to your running cursor trace.

## Workspace Layout 

When the visualizer opens, you are presented with three main regions built inside resizable frames (`react-resizable-panels`):

1. **Header Toolbar**
   - **Step Timeline**: Tracks total CPU execution instructions (from step `1 / 45`).
   - **Status Badge**: Flags whether the code ran successfully (`FINISHED`) or crashed (`MEMORY ERROR`).
   - **Focus Action**: Maximize the drawing canvas to hide source code and inspectors.

2. **The Center Canvas**
   - **Graph Sandbox**: Displays a mathematically routed abstraction mapping the distinct differences between **Stack Allocation** limits and dynamically spawned **Heap Fragments**.
   - Hovering over individual Heap Nodes reveals exact Hexadecimal memory addresses and runtime data payload inspection mappings.

3. **Code & Inspector Tooling**
   - **Left Panel (Code Viewer)**: Automatically centers onto the exact C instruction tied to the active step trace. Yellow highlights correspond strictly to memory mutations.
   - **Right Panel (InspectorTabs)**:
     - *Stack*: View all bound local runtime primitives.
     - *Heap*: A linear array view tracking what address allocations are active vs freed.
     - *Events*: Textual timeline tracing step-by-step history logs.

## Navigation & Controls

C-Pulse stores the entire execution payload locally allowing rapid navigation. 
You can use the **UI Buttons** (Prev/Next/Jump), click explicitly on the **Timeline Track bar**, or rely heavily on native keyboard shortcuts:

| Key Binding | Action |
| --- | --- |
| `Right Arrow` | Step forward through execution one frame at a time. |
| `Left Arrow` | Rewind execution state historically. |
| `Space` | Toggle automatic sequential replay mode. |
| `Home` | Instantly jump to step 0. |
| `End` | Fast-forward to the latest completion trace. |

*(Note: Shortcuts automatically disable themselves inside focus input fields like the debug terminal.)*
