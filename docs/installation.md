# Installation Guide

Welcome to the C-Pulse documentation! This guide will walk you through setting up the repository and configuring your environment to natively run the visual debugger.

## Prerequisites

Before installing C-Pulse, ensure you have the following installed on your system:

- **Node.js**: Very recent versions (v18+) recommended.
- **npm**: The Node package manager.
- **Visual Studio Code**: The host editor where the extension will mount.
- **GCC**: The GNU Compiler Collection to natively compile your C source codes.

## Repository Setup

1. **Clone the Repository**
   You can copy the source code to your local machine using standard Git tools:
   ```bash
   git clone https://github.com/yourusername/c-pulse.git
   cd c-pulse
   ```

2. **Install Dependencies**
   C-Pulse consists of an Extension backend and a React (Vite) WebView frontend. To manage dependencies for both cleanly, install them directly from the workspace root:
   ```bash
   npm install
   ```

## Starting the Development Server

For development and hot-reloading (without building standalone releases), we use `concurrently` to tie the watch commands together safely.

1. **Run the Watchers**
   Keep a terminal open at the root of the project and execute:
   ```bash
   npm run dev
   ```
   This immediately starts:
   - Typescript Webpack monitor for the extension (`/src`)
   - Vite React Dev Server for the webview (`/webview-ui`)

2. **Launch the VS Code Extension**
   Once the watchers have completed their first compilation:
   - Open the primary Workspace in VS Code.
   - Press **F5** to start an `Extension Development Host`.
   - In the new pop-up window, C-Pulse is now running natively!

Next up, check out the [Quickstart Guide](quickstart.md) to learn how to visualize your first memory trace!
