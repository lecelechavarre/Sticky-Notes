# Sticky Notes Pro

Production-ready Sticky Notes web app (localStorage) — includes drag & drop reordering, export/import, and a Firebase sync example stub.

## Features
- Create, edit, delete notes (offline, localStorage)
- Drag & drop to reorder notes (positions saved)
- Color selection for notes
- Export / Import notes as JSON
- Ctrl/Cmd+N to create a new note
- Firebase sync **example stub** (replace config to enable real sync)
- One-file playground (index.html) and modular files (style.css, script.js)
- Jest example test for storage module

## Quick start (no npm required)
1. Open `index.html` in your browser.
2. Use the `+ New` button or `Ctrl/Cmd+N` to create notes.
3. Drag notes to reorder, edit content, change colors, export/import JSON.

## With live-server (optional)
If you prefer a local dev server:

```bash
npm install -g live-server
live-server
```

or with the provided `package.json`:

```bash
npm install
npm run start
```

## Tests (Jest example)
This repo includes a sample Jest test for storage utilities. To run:

```bash
npm install
npm run test
```

> Note: The test uses `jsdom` and a simple mock of `localStorage`.

## Firebase sync (how-to)
This project contains a stubbed `firebaseSync` object inside `script.js`. To enable:
1. Create a Firebase project.
2. Add a Realtime Database (or Firestore) and obtain config.
3. Replace the stub logic with the official Firebase v9 modular SDK initialization and read/write handlers.
4. Implement conflict resolution / merge strategy.

## License
MIT
