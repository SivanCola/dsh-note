import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

// The session header once carried two pills that drew nearly the same picture:
// "save as note" put a download arrow inside a page and "linked notes" reused the
// plain note glyph, so at 14px they read as one icon twice and neither said what
// the button does. These assertions keep one verb glyph per action, one primary
// weight in the header, and one wording shared by both note verbs.
const source = await readFile(new URL('./client.js', import.meta.url), 'utf8')

/** Load the icon table alone: `svg` is stubbed so a call returns its path list. */
function icons() {
  const start = source.indexOf('    const ICONS = {')
  const end = source.indexOf('    function readPreference')
  assert.ok(start > 0 && end > start, 'icon table is missing from client.js')
  const factory = vm.runInNewContext('(function (svg, h) {' + source.slice(start, end) + '\nreturn ICONS})', {})
  return factory((paths, size) => ({ paths, size }), () => null)
}

const PAGE = 'M6 3h9l4 4v14H6z'

test('the two note actions no longer share one silhouette', () => {
  const table = icons()
  const note = table.note(14)
  const deposit = table.deposit(14)
  const relate = table.relate(14)

  const shape = (glyph) => JSON.stringify(glyph.paths)
  assert.equal(deposit.paths.filter((path) => path === PAGE).length, 1, 'writing a note keeps the page it writes into')
  assert.equal(relate.paths.includes(PAGE), false, 'linking to a note is not another page')
  assert.notEqual(shape(deposit), shape(note), 'the save action must not repeat the note mark')
  assert.notEqual(shape(relate), shape(note))
  assert.notEqual(shape(deposit), shape(relate))
})

test('writing a note draws a plus, linking to one draws a chain', () => {
  const table = icons()
  const [, fold, ...mark] = table.deposit(14).paths
  assert.equal(fold, 'M15 3v4h4', 'the page keeps its folded corner')
  assert.equal(mark.length, 2, 'the inner mark is one plus, not a pair of text lines')
  assert.match(mark[0], /^M12\.5 11\.5v5$/)
  assert.match(mark[1], /^M10 14h5$/)

  const chain = table.relate(14)
  assert.equal(chain.paths.length, 2, 'a chain link is two interlocking arcs')
  for (const path of chain.paths) assert.match(path, /a4 4 0 0 0/)
})

test('both header glyphs render at the header size', () => {
  const table = icons()
  assert.equal(table.deposit(14).size, 14)
  assert.equal(table.relate(14).size, 14)
})

const between = (from, to) => {
  const start = source.indexOf(from)
  const end = source.indexOf(to)
  assert.ok(start > 0 && end > start, `could not slice ${from}`)
  return source.slice(start, end)
}

const depositSlice = () => between('function DepositAction', '// -------------------------------------------------------------- settings')
const relatedSlice = () => between('function RelatedNotesAction', 'function NoteReference')

test('both header buttons sit in the host utility language', () => {
  assert.match(depositSlice(), /className: 'dn-hdrbtn icon lead'/)
  assert.match(relatedSlice(), /className: 'dn-hdrbtn icon'/)
  assert.equal(/lead/.test(relatedSlice()), false, 'only the writing action takes primary ink')
  assert.match(depositSlice(), /ICONS\.deposit\(14\)/)
  assert.match(relatedSlice(), /ICONS\.relate\(14\)/)
})

test('the header icon buttons copy the host chrome instead of plugin colours', () => {
  const icon = source.slice(source.indexOf('.dn-hdrbtn.icon{'), source.indexOf('.dn-sr{'))
  assert.equal(/var\(--dn-accent\)/.test(icon), false, 'the notes teal stays inside the notes surface')
  assert.match(icon, /border-color:transparent/, 'no outline at rest, like the neighbouring utilities')
  assert.match(icon, /border-radius:var\(--dsw-radius-sm,8px\)/, 'the hover chip is the host rounded square, not a circle')
  assert.match(icon, /hover\{[^}]*var\(--dsw-alias-interactive-bg-hover/, 'hover paints the host translucent chip')
  assert.equal(/hover\{[^}]*var\(--dsw-alias-bg-layer-2/.test(icon), false,
    'bg-layer-2 is pure white in the light palette, so it paints no chip at all')
  assert.match(icon, /:active\{[^}]*interactive-bg-active/, 'pressed keeps the same family as the host')
  assert.match(icon, /lead\{[^}]*var\(--dsw-alias-label-primary/, 'the lead action is marked by ink weight')
  assert.match(icon, /\.ok\{[^}]*state-success-primary/, 'saving results keep the host state tokens')
  assert.match(source, /\.dn-new\{[^}]*var\(--dn-accent\)/, 'the panel keeps its own accent for in-panel actions')
})

test('the header pills are glyph only and the hint is the label', () => {
  for (const slice of [depositSlice(), relatedSlice()]) {
    assert.equal(/h\('span', null, label\)/.test(slice), false, 'no visible text label is left in the header')
    assert.match(slice, /h\(\s*Tip,\s*\{ label/, 'the hint carries the words the pill dropped')
  }
  assert.match(source, /\.dn-hdrbtn\.icon\{[^}]*width:28px/, 'an icon pill keeps the 28px hit area')
})

test('dropping the label keeps the state announced', () => {
  const deposit = depositSlice()
  assert.match(deposit, /'aria-busy': state === 'saving'/)
  assert.match(deposit, /className: 'dn-sr', role: 'status'/)
  assert.match(source, /\.dn-sr\{[^}]*clip:rect/)
})

test('the open-note follow-up is the same glyph button', () => {
  const deposit = depositSlice()
  assert.match(deposit, /Tip, \{ label: t\('link\.openSaved'\) \}/)
  assert.match(deposit, /ICONS\.open\(14\)/)
  assert.match(deposit, /className: 'dn-hdrbtn icon',\s*\n\s*onClick: \(\) => props\.bridge\.openAside/)
  assert.equal(/t\('link\.openNote'\)\)\)/.test(deposit), false, 'no text pill is left in the header')
})

test('open previews in the right sidebar and only falls back to the panel', () => {
  const bridge = between('function createIntegrationBridge', 'function useBridge')
  assert.match(bridge, /async openAside\(id\)/)
  assert.match(bridge, /sidebar\.openTab\(RIGHT_TAB_KIND/)
  assert.match(bridge, /ctx\.layout\.openRightbar/, 'a build without the right Sidebar still reveals the column')
  assert.equal(/openAside[\s\S]{0,600}ctx\.layout\.selectPanel/.test(bridge), false,
    'the aside open never takes over the main panel, which belongs to openNote')

  const pane = between('function WorkspaceNotesPane', 'function useT(')
  assert.match(pane, /useBridge\(bridge\)/)
  assert.match(pane, /bridgeState\.asideRequest/)
  assert.match(pane, /asideSeen\.current === request/, 'one request selects once; a vault refresh must not re-select')
  assert.match(pane, /setShowAll\(true\)/, 'a note outside the workspace scope widens the list instead of vanishing')
})

test('every peek entry previews aside; only the panel hand-off is whole-page', () => {
  const dialog = between('function IntegrationDialog', 'function IntegrationOverlay')
  assert.match(dialog, /bridge\.openAside\(result\.note\.id\)/, 'the save result offers the preview, not a page swap')
  assert.match(dialog, /bridge\.openAside\(note\.id\)/, 'a linked note opens where the chat keeps its place')

  const reference = between('function NoteReference', 'function noteTree')
  assert.match(reference, /bridge\.openAside\(node\.data\.noteId\)/)

  const pane = between('function WorkspaceNotesPane', 'function useT(')
  assert.match(pane, /onClick: \(\) => bridge\.openNote\(selected\.id\)/, 'the detail keeps the deliberate "open in panel" exit')
  assert.equal(/bridge\.openNote\(result\.note\.id\)/.test(pane), false, 'creating in the sidebar must not jump to the page')
  assert.match(pane, /setSelectedId\(result\.note\.id\)/)
  assert.match(pane, /if \(vault\.loading\) return/, 'an in-flight refresh must not clear a just-created selection')

  const bridge = between('function createIntegrationBridge', 'function useBridge')
  assert.match(bridge, /asideRequest: state\.asideRequest \+ 1, modal: null/, 'a dialog never outlives the preview it opened')
})

test('the preview hands editing off to the panel instead of growing an editor', () => {
  const bridge = between('function createIntegrationBridge', 'function useBridge')
  assert.match(bridge, /async openNote\(id, options\)/)
  assert.match(bridge, /editNote: options\?\.edit === true/)

  const pane = between('function WorkspaceNotesPane', 'function useT(')
  assert.match(pane, /bridge\.openNote\(selected\.id, \{ edit: true \}\)/, 'the preview offers the edit exit')
  assert.equal(/contentEditable|<textarea/.test(pane), false, 'the narrow pane stays a preview')

  const page = between('function NotesPage', 'function SettingsPanel') 
  assert.match(page, /if \(integration\.editNote\) setEditingNewId\(integration\.noteId\)/, 'the panel then opens the source editor')

  for (const [key, zh, en] of [['right.edit', '在完整面板中编辑', 'Edit in full panel']]) {
    assert.ok(source.includes(`'${key}': '${zh}'`), `${key} is missing its zh-CN label`)
    assert.ok(source.includes(`'${key}': '${en}'`), `${key} is missing its English label`)
  }
})

test('the picker offers whole notes or the passage carried in from a preview', () => {
  const composer = between('function ComposerInsert', 'function InsertDialog')
  assert.match(composer, /onMouseDown: \(event\) => event\.preventDefault\(\)/, 'a live selection has to survive the click')
  assert.match(composer, /selection: \{ noteId: holder\.dataset\.noteId, text \}/)
  assert.match(source, /'data-note-id': note\.id/, 'the page preview names the note it shows')
  assert.match(source, /'data-note-id': selected\.id/, 'so does the Sidebar preview')

  const dialog = between('function InsertDialog', 'function NoteReference')
  assert.match(dialog, /const \[scope, setScope\] = useState\(selection \? 'selection' : 'full'\)/, 'a carried passage opens in its own scope')
  assert.match(dialog, /api\('prepareReference', \{ id: selection\.noteId, selectedText: selection\.text \}\)/, 'the passage goes in as a selection reference')
  assert.match(dialog, /disabled: busy \|\| !selection/, 'no passage, no selection scope')
  assert.match(dialog, /scope === 'selection' \? 1 : picked\.length/)

  for (const [key, zh, en] of [['insert.scopeFull', '整篇笔记', 'Whole notes'], ['insert.scopeSelection', '选中片段', 'Selected passage']]) {
    assert.ok(source.includes(`'${key}': '${zh}'`), `${key} is missing its zh-CN label`)
    assert.ok(source.includes(`'${key}': '${en}'`), `${key} is missing its English label`)
  }
})

test('the composer row can pull notes into the draft', () => {
  assert.match(source, /'conversation\.input\.left'/, 'the entry lives in the composer tool row')
  const composer = between('function ComposerInsert', 'function InsertDialog')
  assert.match(composer, /ICONS\.insert\(16\)/)
  assert.match(composer, /bridge\.show\('insert'/)

  const dialog = between('function InsertDialog', 'function NoteReference')
  assert.match(dialog, /api\('prepareReference'/)
  assert.match(dialog, /bridge\.addReferences\(modal\.sessionId, prepared\)/, 'several notes go in one draft edit')
  assert.match(dialog, /useState\(\[\]\)\s*\n\s*const \[loading/, 'picked notes are a set, not one id')

  const bridge = between('function createIntegrationBridge', 'function useBridge')
  assert.match(bridge, /async addReferences\(sessionId, preparedList\)/)
  assert.match(bridge, /for \(const prepared of preparedList\)/, 'every prepared note is inserted once')
})

test('each note action names its own scope in the hint', () => {
  for (const [key, zh, en] of [
    ['page.depositScope', '存为笔记 · 整段会话', 'Save as note · whole chat'],
    ['link.saveAnswer', '存为笔记 · 这条回答', 'Save as note · this answer'],
    ['link.relatedScope', '关联笔记 · 本会话引用的笔记', 'Linked notes · cited in this chat'],
    ['link.openSaved', '打开刚存的笔记', 'Open the saved note'],
  ]) {
    assert.ok(source.includes(`'${key}': '${zh}'`), `${key} is missing its zh-CN hint`)
    assert.ok(source.includes(`'${key}': '${en}'`), `${key} is missing its English hint`)
  }
})

test('the save dialog keeps a title without the answer scope', () => {
  assert.match(source, /modal\.kind === 'save' \? t\('link\.saveTitle'\)/)
  assert.ok(source.includes("'link.saveTitle': '存为笔记'"))
  assert.ok(source.includes("'link.saveTitle': 'Save as note'"))
})
