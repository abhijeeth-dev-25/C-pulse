# Quickstart Guide

This quickstart guide gets you directly into visualizing your first block of C code. C-Pulse is designed to require absolutely zero `#include` modifications or boilerplate additions to your underlying source code.

## 1. Prepare your Workspace

Create a brand new folder on your computer and open it in your running **Extension Development Host** (or standard VS Code window, assuming you have built the `.vsix`).

Create a file named `main.c` and add some simple memory interactions:

```c
#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node* next;
};

int main() {
    // Stack Allocation
    int rootId = 10;
    
    // Heap Allocation
    struct Node* head = (struct Node*)malloc(sizeof(struct Node));
    head->data = 100;
    head->next = NULL;

    struct Node* second = (struct Node*)malloc(sizeof(struct Node));
    second->data = 200;
    head->next = second; // Linked assignment

    free(head); // Simulate a memory leak since `second` is never freed!
    
    return 0;
}
```

## 2. Launch the Visualizer

With `main.c` the active tab in your editor:

1. Open the VS Code Command Palette (`Cmd+Shift+P` on Mac, `Ctrl+Shift+P` on Windows/Linux).
2. Type and select `C-Pulse: Visualize`.

## 3. The Visualization Experience

A new WebView tab explicitly named **C-Pulse** will dock to the side of your workspace.
The extension immediately builds an instrumented binary, executes it completely, and renders its timeline inside the React interface.

- **Stack Column**: You will see your integer declaration `rootId` dynamically mapped.
- **Heap Region**: The two `malloc` instructions will materialize on the Heap chart as explicit nodes.
- **Trace Arrows**: C-Pulse will draw a dynamic SVG arrow spanning from the first node into the second node when `head->next = second` resolves.
- **Bug Capture**: The Memory Engine will immediately flag the run entirely with a **MEMORY ERROR** badge in the header since your system failed to safely free `second`.

You are now ready to deeply analyze code! For further information on the user interface, refer to the [Usage Document](usage.md).
