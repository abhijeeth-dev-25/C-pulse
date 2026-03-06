# System Architecture

C-Pulse implements a robust three-tier data-passing abstraction pipeline that specifically isolates the physical GNU runtime components explicitly dynamically from the React security layer.

## Component Breakdown

1. **Compilation Engine (`CInstrumenter.ts`)**
   Your completely unmodified `main.c` file is rapidly analyzed explicitly using standard OS filesystem logic. The typescript backend wraps natively injected tracker functions explicitly around `malloc/free/calloc` calls natively without fundamentally breaking or mutating user file boundaries. It pipes all compiler warnings deeply directly into GCC and executes via native VS code Terminals.

2. **Telemetry Host (`CLiveServer.ts`)**
   The VS Code backend generates a completely dedicated NodeJS high-throughput TCP Host socket securely bound internally heavily. As the target C executable natively physically parses the machine logic dynamically, every `Heap` or `Pointer` execution fires a JSON standard payload locally securely straight into your VS Code extension mapping boundary.

3. **RPC WebView Bridge (`MessageHandler.ts`)**
   The VS code logic dynamically aggregates atomic JSON states and heavily securely ships `window.postMessage` payloads strictly through restricted Webview boundaries securely straight into your React Frontend.

4. **React SVG Renderer (`App.tsx` & `GraphCanvas.tsx`)**
   The completely bundled React Engine aggregates standard JSON traces heavily into persistent React States incrementally mapped to an absolute physical timestamp coordinate! SVG mathematically transforms exactly position states explicitly creating completely standalone visualization charts synced securely back to absolute code ranges explicitly highlighted within your `CodeViewer`.
