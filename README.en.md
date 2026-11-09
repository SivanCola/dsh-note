# dsh-note

[English](README.en.md) · [简体中文](README.md)

[![tests](https://github.com/SivanCola/dsh-note/actions/workflows/test.yml/badge.svg)](https://github.com/SivanCola/dsh-note/actions/workflows/test.yml)

A local Markdown notebook that lives inside [DeepSeek Harness](https://github.com/deepseek-ai): a three-column vault (navigation / list / editor), split live preview, tags, an aggregated todo center — plus one-click "turn this session into a note".

The layout follows the Youdao Cloud Notes desktop app, but the data sits in your own folder: no account, no cloud lock-in, and every note is a plain `.md` file you can open in any editor, commit with git, or point Obsidian at.

## What it does

- **Folder-based vault**: a narrow filter rail, a folder tree, and the note body — the layout of the reference app. Titles render as single-line rows; click to open, expand or collapse folders, and the current note is tinted. The header carries search and a full-width New button; you can create a note inside the current folder, create a subfolder, and sort by title or by update time. The tree supports arrow keys, Home / End and Enter; the toolbar switches back to the summary list.
- **Filter state is preserved**: opening a note from Recent, Starred, a tag or a search keeps that filter; jumping from a todo keeps the todo view and its keyword. Coming back from a conversation reference or a related note opens All notes and reveals the target.
- **Stars and pins**: the star in the editor header controls favorites and the pin controls pinning; the two are stored independently. Legacy `pinned: true` still means "pinned only" and is never converted into a favorite. Recent picks the 15 most recently updated notes and ignores pin priority.
- **Reading and locating**: a note opens as rendered body by default; switch to edit or split. The breadcrumb locates the owning folder. Reading mode, expanded folders, sort and list layout are remembered on this machine.
- **Markdown editing + live preview**: edit / split / preview modes; the toolbar offers bold, italic, inline code, heading, list, task, quote, code block, link and table. Typing saves automatically (650 ms debounce) and the status line shows "Saved hh:mm".
- **Tags**: every note can carry tags; the tag view aggregates them by frequency and one click filters.
- **Todo center**: every `- [ ]` across the vault is collected in one place, searchable by task text, source note title or tag; ticking one writes back to the file and updates the open Markdown and preview. Completed items are listed below, and search covers both states. Each row carries a content revision check, so when a note changed underneath an old row the list refreshes and asks you to tick again.
- **Full-text search**: `⌘K` focuses the search box and filters on title + body as you type.
- **Session deposit**: "Save as note" in any session header turns the user/assistant conversation into a dated note tagged `会话沉淀`.
- **Add a note to the conversation**: "Add to conversation" at the top of a note inserts the whole note, or just the text selected in the editor / preview. Content can go to an existing conversation or open a new one through Harness's workspace flow. Text is inserted through Harness's native input path, so existing draft text, quotes and undo history survive, and nothing is sent automatically. One insert is capped at 12,000 Unicode characters and truncation is called out.
- **Save an answer to a note**: "Save answer to note" in the assistant action row creates a note or appends to an existing one, with a preview before saving. Only text from the durable assistant message is read — no reasoning, no tool calls. Saving the same source twice de-duplicates, and appending checks the target note revision first.
- **Two-way source links**: "Sources & links" on a note goes back to the originating conversation and shows the exact answer, turn and time; "Related notes" in the session header opens the notes in reverse. Note references inside sent messages are clickable too. Sources are stored in frontmatter `dsh_sources`, so they survive renames and restarts; "added to this session draft" only means a draft link, not that it was sent or executed.
- **Agent access**: four tools — `note_list` / `note_search` / `note_read` / `note_write` — so "find the API doc for the Double 11 campaign" can hit the vault directly.
- **Settings page**: `Settings → Notes` shows the vault path and counts (notes / folders / tags / open todos), lets you change the vault directory (the plugin reloads and switches immediately), offers text size (Small / Default / Large / XL — applied instantly, local to this machine), and provides "Open the notes panel" plus the shortcut reminder.

## Where the data lives

With `rootDir` empty the vault is `<Harness default working directory>/notes`; the `DSH_NOTES_DIR` environment variable also works. There are two ways to change it: `Settings → Notes → Vault directory` (recommended — the plugin reloads and applies it at once, persisted as a profile override), or edit `config.rootDir` in `cordis.patch.yml` and reinstall the bundle.

One note is one Markdown file, readable by any editor, git or Obsidian:

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

A note id is its path relative to the vault, without `.md` — for example `work/2026/api-review`. Existing root-level ids stay stable, and renaming the title never renames the file. The tree mirrors real folders on disk: nothing is moved automatically by title or tag, and symlinks are not followed.

UI preferences (text size, tree vs. summary, sort, default reading mode) live in this machine's `localStorage` under the `dsh-note:` prefix. They do not travel with the vault or to other devices.

`dsh_sources` is a JSON array the plugin owns: answer sources carry `sessionId` / `messageId` / `seq` / `turn` / `time`; note-reference links carry the session id, a revision digest of the note content, the whole-note or fragment range, and a `draft` flag. Editing the body keeps these sources. If the original session is deleted, or the note file or vault directory moves, a jump can fail — the UI says so explicitly.

The editor saves changes in order: text typed while a save is in flight is submitted in the next one. Switching notes or ticking a todo waits for the pending save first. An external refresh only syncs bodies with no local edits. A save conflict keeps the local text and shows an error; only an explicit "Reload" discards unsaved work. Star and pin changes do not bump the body revision, so they never conflict with editing.

An old note with no source identity never guesses a link from its title; saving an answer again or using "Add to conversation" establishes an explicit one.

## Structure

```
index.js          Host half: vault I/O, /api/dsh-note routes, note_* tools
client.js         Client half: three-column UI, Markdown rendering, session action
package.json      bundle manifest (dsh.bundle.patch + dsh.client)
cordis.patch.yml  inserts the dsh-note row and configures rootDir
locale/{zh,en}.json  title and description shown in the plugin manager
icon.svg          panel icon
index.test.js / integration.test.js / sidebar.test.js  18 tests
```

- HTTP API: `POST /api/dsh-note` with base actions `list` / `get` / `create` / `createFolder` / `save` / `delete` / `search` / `todo` / `deposit`. Integration actions are `answer` / `saveAnswer` / `links` / `prepareReference` / `recordReference`. The settings page uses `set-root` (persists `rootDir` through `configEditor`; it answers first and only then lets the plugin reload). Routes accept loopback requests only and check same-origin. `list` returns `folders` plus each note's `sources` / `revision`; appending with `saveAnswer` requires the matching `expectedRevision`. `create` accepts a vault-relative `folder`, and `createFolder` takes `name` plus an optional `parent`.
- Host dependencies: `tools`, `webServer`. No third-party npm dependencies, no build step.
- Session sources are read through Harness's `sessionQuery.readSession/readSurface`, so persisted cold sessions work; saving an answer requires that service. Whole-session deposit still reads the live session when the service is absent.
- The Client reuses `sessions` / `uiSession` for session lifetime and standard input props, `uiWorkspace` for navigation and new-session preparation, `inputActions.captureInsertion/insertText/persistDraft` to insert drafts, and `uiConversation.userText` to render note references. Entry points register on Harness's assistant actions, session header actions and the `shell.overlay` slot; unloading the plugin releases them. Backgrounds, text and borders follow the Harness light/dark theme, with a blue accent borrowed from the reference app.

## Install / update

Install straight from GitHub:

```sh
dsh plugin add github:SivanCola/dsh-note
```

For local development, install the repository directory as a bundle with `plugin_manager` (`install_bundle`) inside DSH. Because it is a directory link, after editing the code you can disable and re-enable "Notes" on the plugins page to reload it, refreshing the page when needed; `remove_bundle` + `install_bundle` also updates it.

## Local verification

At the repository root, `npm run check` verifies syntax and `npm test` covers folder recursion, nested note read/write/search/todos, root-level compatibility, duplicate titles, path boundaries, cold-session answer reads, duplicate saves, append conflicts, source retention, reference snapshots, native draft insertion calls, independent star/pin, todo search, and editor refresh plus ordered saving. Tests run in temporary directories and never touch a real vault.

Jumping back to a source answer opens the original session and shows the answer text; Harness currently exposes no public API for scrolling a chat message into view, so the plugin neither scrolls the timeline nor fakes it with DOM queries.

## Roadmap

`[[wiki links]]`, a knowledge base, moving/renaming folders, web clipping, AI summaries and continuation, Youdao Cloud Notes sync (the `youdaonote` CLI is a candidate), and daily-journal templates.
