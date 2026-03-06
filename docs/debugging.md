# Advanced Bug Detection

Unlike simple visualizers, C-Pulse ships entirely with a highly advanced instruction trapping system strictly engineered for trapping deep `stdlib` memory violation bugs.

## How Detection Works

When C-Pulse identifies a memory anomaly native to the Heap, the UI Header natively switches to a glowing red `MEMORY ERROR` state.

You can explicitly debug the source of this vulnerability by looking at the **Warnings Tab** on the right side of the interface, or explicitly pressing the big red **Replay Bug** automated tracking button natively built into the Header toolbar.

### Covered memory faults:

1. **Memory Leaks**
   If a Heap fragment is safely allocated via `malloc` or `calloc`, but never eventually mapped heavily into a `free()` lifecycle call before the termination frame activates, an execution-end flag traces and labels the specific leaked block permanently.

2. **Double Free**
   Attempting to pass exactly identical address maps entirely into `free(ptr)` multiple times traces back inherently and flags a crash logic warning avoiding nasty runtime OS segfaults.

3. **Invalid Free**
   Using mathematical boundary mappings, trying to pass a stack-variable scope primitive or an unknown external integer directly inside explicit `free(ptr)` blocks drops trace sequences and warns your system dynamically.

4. **Null Pointer Dereference (Segfault Guard)**
   If a pointer actively assigned explicit `NULL` coordinates strictly assigns itself properties via standard arrow operator methodologies (e.g. `head->value = 10`), the tracker dynamically captures it explicitly and tags the system.

## The Ghost Node System

When a memory block safely passes into `free()`, standard systems pretend it permanently ceases to exist completely.

C-Pulse instead implements the **Ghost Nodes** algorithm. The node explicitly visually changes states—blurring its structural frame logic heavily, adopting explicitly dashed stroke borders, and turning red—but permanently maintains spatial UI positioning!

This cleanly clarifies exactly how **Use-After-Free** vulnerabilities explicitly emerge explicitly when Dangling Pointers point visually heavily back to dead Ghost nodes instead of completely empty spaces.
