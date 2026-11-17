# dsh-note feature guide

[简体中文](features.md) · [Back to README](../README.en.md)

This is the long-form documentation for [dsh-note](../README.en.md). It covers behaviour, limits, data formats and implementation. For installation, see the README.

## Contents

- [1. Workspace and navigation](#1-workspace-and-navigation)
- [2. Editing, preview and search](#2-editing-preview-and-search)
- [3. Todo centre](#3-todo-centre)
- [4. Conversations and notes](#4-conversations-and-notes)
- [5. Agent access](#5-agent-access)
- [6. Data and storage](#6-data-and-storage)
- [7. Settings](#7-settings)
- [8. Implementation and API](#8-implementation-and-api)
- [9. Local verification](#9-local-verification)
- [10. Known limits and roadmap](#10-known-limits-and-roadmap)

---

## 1. Workspace and navigation

The UI is a two-pane layout: a folder tree or aggregated list on the left and the editor on the right. Recent / All notes / Starred / Tags / Todos live in a view menu in the list header, together with "Collapse all folders" and "Refresh".

- **Folder tree**: folders map to real directories on disk. Titles render as single-line rows; click to open, expand or collapse. The current note is tinted and marked with an accent bar. Arrow keys, Home / End and Enter are supported.
- **Filter retention**: opening a note from Recent, Starred, a tag or a search keeps that filter. Jumping from a todo keeps the todo view and its keyword. Coming back from a conversation reference or a related note opens All notes and reveals the target.
- **Stars and pins**: the editor header has separate controls for favourites and pins. Legacy `pinned: true` still means "pinned only" and is never converted into a favourite. Recent picks the 15 most recently updated notes and ignores pin priority.
- **List display**: switch between the tree and the summary list; sort by title or update time. Reading mode, expanded folders, sort and list layout are remembered on this machine.
- **Workspace notes in the right sidebar**: a separate compact page scoped to the current session's workspace. When the vault sits inside the workspace it shows the whole vault; when the workspace sits inside the vault it shows that relative folder; otherwise it matches the vault folder named after the workspace. Open a note to read it, or jump to the full panel to edit. The Workspace / All notes switch changes the scope; a missing folder gets an empty state that offers All notes or a new note. Search, refresh, new note and text size match the full panel.
- **Narrow windows**: at ≤640px the list and editor stack vertically and split edit becomes top/bottom.

## 2. Editing, preview and search

- **Three modes**: edit / split / preview. A note opens as rendered body by default and can be switched at any time.
- **Live preview**: in split mode the source and preview update together. Drag the divider, nudge it with the arrow keys, or double-click to reset to 50/50. The ratio is remembered locally.
- **Toolbar**: bold, italic, inline code, heading level, list, task, quote, code block, link and table. Heading and overflow actions use menus so typing focus is not lost.
- **Autosave**: 650ms debounce; the status line shows "Saved hh:mm". ⌘S saves immediately.
- **Markdown**: headings, paragraphs, ordered / unordered lists, task lists, quotes, inline code and code blocks, links, horizontal rules and pipe tables. Tables scroll horizontally in the preview with a sticky header.
- **Full-text search**: ⌘K focuses the search box and filters on title + body as you type; matches are highlighted in lists and todos.
- **Tags**: each note can carry tags; the tag view aggregates them by frequency and one click filters.
- **Breadcrumbs**: the editor header shows the owning folder.
- **Save ordering**: text typed while a save is in flight is submitted in the next one. Switching notes or ticking a todo waits for the pending save first.
- **Conflicts**: an external refresh only syncs bodies with no local edits. A save conflict keeps the local text and shows an error; only an explicit "Reload" discards unsaved work.
- **Stars and pins are separate**: changing them does not bump the body revision, so they never conflict with editing.

## 3. Todo centre

- Every `- [ ]` across the vault is collected in one place, searchable by task text, source note title or tag; search covers both open and completed items.
- A progress summary and percentage sit at the top, with All / Open / Done filters.
- Ticking a row writes back to the source Markdown and updates the open source and preview. Ticking a checkbox in the open note also updates the centre.
- Each row carries a content revision check: when a note changed underneath an old row, the list refreshes and asks you to tick again.
- Completed items are listed below; the source note title is a link.
- Empty states are provided for "no todos" and for a filter with no matches.

## 4. Conversations and notes

### Session deposit

"Save as note" in any session header turns the user / assistant conversation into a dated note tagged `会话沉淀`.

### Add a note to the conversation

"Add to conversation" at the top of a note can:

- insert the whole note, or only the text selected in the editor / preview;
- target an existing conversation, or open a new one through Harness's workspace flow.

Text is inserted through Harness's native input path, so existing draft text, quotes and undo history survive. **Nothing is sent automatically.** One insert is capped at 12,000 Unicode characters and truncation is called out.

### Save an answer to a note

"Save answer to note" in the assistant action row creates a note or appends to an existing one, with a preview before saving.

- Only text from the durable assistant message is read — no reasoning, no tool calls.
- Saving the same source twice de-duplicates.
- Appending checks the target note revision first and asks for confirmation if it changed.

### Two-way source links

- "Sources & links" on a note goes back to the originating conversation and shows the exact answer, turn and time.
- "Related notes" in the session header opens the notes in reverse.
- Note references inside sent messages are clickable too.

Sources are stored in frontmatter `dsh_sources`, so they survive renames and restarts. "Added to this session draft" only means a draft link, not that it was sent or executed.

Session sources are read through Harness's `sessionQuery.readSession / readSurface`, so persisted cold sessions work; saving an answer requires that service. Whole-session deposit still reads the live session when the service is absent.

### Two known limits

- Harness currently exposes no public API for scrolling a chat message into view. Jumping to a source opens the original session and shows the answer text, but does not scroll the timeline or fake it with DOM queries.
- If the original session is deleted, or the note file / vault directory moves, a jump can fail; the UI says so explicitly. An old note with no source identity never guesses a link from its title.

## 5. Agent access

Four tools are registered:

| Tool | Purpose |
| --- | --- |
| `note_list` | list notes and folders |
| `note_search` | search titles, bodies and tags |
| `note_read` | read one note |
| `note_write` | create or update a note |

So "find the API doc for the Double 11 campaign" can hit the vault directly instead of requiring the content to be pasted into the conversation first.

## 6. Data and storage

### Location

- Default: with `rootDir` empty, `<Harness default working directory>/notes`.
- Environment variable: `DSH_NOTES_DIR`.
- Settings: `Settings → Notes → Vault directory` (recommended). The plugin reloads and applies it immediately, persisted as a profile override.
- Config: edit `config.rootDir` in `cordis.patch.yml` and reinstall the bundle.

### File format

One note is one ordinary Markdown file:

```markdown
---
title: Double 11 lucky wheel — API review
tags: [campaign, api]
created: 2026-11-09T03:34:19.511Z
updated: 2026-11-09T03:35:23.241Z
pinned: false
starred: false
---

## Background
...
```

Open it with any editor, git or Obsidian.

- **Note id**: the path relative to the vault without `.md`, for example `work/2026/api-review`. Existing root-level ids stay stable; renaming the title never renames the file.
- **Folders**: the tree mirrors real folders on disk. The plugin never moves notes automatically by title or tag, and does not follow symlinks.
- **Duplicate names**: creating a note with an existing name in the same folder produces a non-conflicting filename.

### UI preferences

Text size, tree vs. summary, sort, default reading mode and split ratio are stored in this machine's `localStorage` under the `dsh-note:` prefix. They do not travel with the vault or to other devices.

### `dsh_sources`

`dsh_sources` is a JSON array owned by the plugin:

- answer sources carry `sessionId` / `messageId` / `seq` / `turn` / `time`;
- note-reference links carry the session id, a revision digest of the note content, the whole-note or fragment range, and a `draft` flag.

Editing the body keeps these sources. Star and pin changes do not change the body revision.

## 7. Settings

`Settings → Notes` provides:

- the current vault path and counts (notes / folders / tags / open todos);
- a vault directory input; saving reloads the plugin;
- text size: Small / Default / Large / XL, applied instantly and local to this machine;
- an "Open the notes panel" action;
- shortcut reminders: ⌘K search, ⌘S save;
- a note about the data format.

## 8. Implementation and API

### Files

```
index.js          host half: vault I/O, /api/dsh-note routes, note_* tools
client.js         client half: two-pane UI, workspace page, Markdown rendering, session actions
package.json      bundle manifest (dsh.bundle.patch + dsh.client)
cordis.patch.yml  inserts the dsh-note row and configures rootDir
locale/{zh,en}.json  titles and descriptions in the plugin manager
icon.svg          panel icon
screenshots.json  storefront screenshot list
assets/           icons, screenshots and the demo GIF
docs/             long-form documentation
*.test.js         22 tests
```

### HTTP API

`POST /api/dsh-note`:

- base actions: `list` / `get` / `create` / `createFolder` / `save` / `delete` / `search` / `todo` / `deposit`
- integration actions: `answer` / `saveAnswer` / `links` / `prepareReference` / `recordReference`
- settings action: `set-root`, which persists `rootDir` through `configEditor`; it answers first and only then lets the plugin reload.

Routes accept loopback requests only and check same-origin. `list` returns `folders` plus each note's `sources` / `revision`; appending with `saveAnswer` requires the matching `expectedRevision`. `create` accepts a vault-relative `folder`, and `createFolder` takes `name` plus an optional `parent`.

### Host dependencies

`tools`, `webServer`. No third-party npm runtime dependencies and no build step.

### Client

- reuses `sessions` / `uiSession` for session lifetime and standard input props;
- reuses `uiWorkspace` for navigation and new-session preparation;
- inserts drafts through `inputActions.captureInsertion / insertText / persistDraft`;
- renders note references through `uiConversation.userText`;
- registers the right-sidebar Workspace notes page through `sidebarRightTabs`, mounting its body under the plugin id in `sidebar.right.pane.tab`; the workspace is resolved from `sessions` / `workspaces`;
- registers entry points on assistant actions, session header actions and the `shell.overlay` slot; unloading the plugin releases them.

### Theme and styling

The interface has its own "paper and ink" visual language: warm paper surfaces, ink text, a teal accent and a vermillion seal. It is built entirely on Harness theme tokens with `color-mix()`, so light and dark follow the host theme.

- Type: body follows the host; headings use a serif stack and code uses the host monospace font.
- Scale: the text-size preference drives a full `--dn-fs` type scale with minimum sizes.
- Motion: transitions are disabled under `prefers-reduced-motion`; focus rings distinguish text fields from buttons.
- Responsive: the editor area uses container queries; the list/editor stack uses a viewport media query.

## 9. Local verification

At the repository root:

```sh
npm run check   # syntax check
npm test        # 22 tests
```

The tests cover folder recursion, nested note read/write/search/todos, root-level compatibility, duplicate titles, path boundaries, cold-session answer reads, duplicate saves, append conflicts, source retention, reference snapshots, native draft insertion calls, independent star/pin, todo search, and editor refresh plus ordered saving. They run in temporary directories and never touch a real vault.

GitHub Actions runs the same `npm run check` and `npm test` on Node 22 / 24.

## 10. Known limits and roadmap

Not built yet:

- `[[wiki links]]` and a knowledge base;
- moving / renaming folders;
- web clipping;
- AI summaries and continuation;
- Youdao Cloud Notes sync (the `youdaonote` CLI is a candidate);
- daily-journal templates.

Known limitations:

- source jumps cannot scroll to a specific chat message (Harness has no public API for it);
- moving a session, note file or vault directory can break old source links;
- UI preferences stay on this machine and do not sync with the vault.
