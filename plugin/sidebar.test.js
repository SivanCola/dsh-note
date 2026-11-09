import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const source = await readFile(new URL('./client.js', import.meta.url), 'utf8')
const helpers = source.slice(source.indexOf('    function filterNotes('), source.indexOf('    /** The same overlay hosts'))
const plainStart = source.indexOf('    function plainInline(')
const plain = source.slice(plainStart, source.indexOf('\n    //', plainStart))
const { filterNotes, filterTodos, createEditorDraft } = vm.runInNewContext(plain + helpers + '\n({filterNotes,filterTodos,createEditorDraft})')
const note = (patch = {}) => ({ id: 'note', title: '文档', content: '- [ ] 联调', tags: ['接口'], updated: '2026-11-09T01:00:00Z', revision: 'rev-1', pinned: false, starred: false, ...patch })

test('favorites use stars, tags and search compose, and recent ignores pin priority', () => {
  const records = [note({ id: 'pinned', pinned: true }), note({ id: 'starred', starred: true })]
  const options = { view: 'starred', activeTag: '', query: '', sort: 'updated' }
  assert.equal(filterNotes(records, options).map((item) => item.id).join(), 'starred')
  assert.equal(filterNotes(records, { ...options, view: 'tag', activeTag: '接口', query: '联调' }).length, 2)
  assert.equal(filterNotes(records, { ...options, view: 'tag', activeTag: '会议' }).length, 0)
  const many = [note({ id: 'old-pin', updated: '2020-01-01', pinned: true }), ...Array.from({ length: 16 }, (_, index) => note({ id: String(index), updated: `2026-11-${String(index + 1).padStart(2, '0')}` }))]
  const recent = filterNotes(many, { ...options, view: 'recent' })
  assert.equal(recent.length, 15)
  assert.equal(recent[0].id, '15')
  assert.ok(!recent.some((item) => item.id === 'old-pin'))
})

test('todo search matches task labels, source titles and tags in both states', () => {
  const notes = [note(), note({ id: 'other', title: '周会记录', tags: ['会议'] })]
  const todos = [{ noteId: 'note', noteTitle: '文档', text: '**联调** lottery_barrage', done: false }, { noteId: 'other', noteTitle: '周会记录', text: '发布', done: true }]
  assert.equal(filterTodos(todos, notes, 'LOTTERY_BARRAGE').length, 1)
  assert.equal(filterTodos(todos, notes, '周会')[0].done, true)
  assert.equal(filterTodos(todos, notes, '会议')[0].text, '发布')
  assert.equal(filterTodos(todos, notes, '不存在').length, 0)
  assert.equal(filterTodos(todos, notes, '').length, 2)
})

test('same-note refresh adopts todo changes without starting a save, but never discards local edits', () => {
  let writes = 0
  const draft = createEditorDraft(note(), async () => { writes += 1 })
  draft.sync(note({ content: '- [x] 联调', revision: 'rev-2' }))
  assert.equal(draft.getSnapshot().content, '- [x] 联调')
  assert.equal(draft.dirty(), false)
  assert.equal(writes, 0)
  draft.edit({ content: '- [x] 联调\n用户尚未保存的内容' })
  draft.sync(note({ content: '外部修改', revision: 'rev-3' }))
  assert.ok(draft.getSnapshot().content.includes('用户尚未保存'))
  assert.equal(draft.dirty(), true)
})

test('edits made during an in-flight save are saved next and not marked clean early', async () => {
  const calls = []
  const complete = []
  let nextSave
  const secondStarted = new Promise((resolve) => { nextSave = resolve })
  const draft = createEditorDraft(note(), (input) => {
    calls.push(input)
    if (calls.length === 2) nextSave()
    return new Promise((resolve) => complete.push(() => resolve({ note: note({ ...input, updated: '2026-11-09T02:00:00Z' }), revision: 'rev-' + (calls.length + 1) })))
  })
  draft.edit({ content: '第一次修改' })
  const pending = draft.flush()
  draft.edit({ content: '保存期间继续输入' })
  assert.equal(draft.flush(), pending)
  assert.equal(draft.dirty(), true)
  complete[0]()
  await secondStarted
  assert.equal(calls.length, 2)
  assert.equal(calls[1].content, '保存期间继续输入')
  assert.equal(calls[1].expectedRevision, 'rev-2')
  complete[1]()
  await pending
  assert.equal(draft.dirty(), false)
  assert.equal(draft.getSnapshot().content, '保存期间继续输入')
  assert.equal(draft.getSnapshot().status, 'saved')
})

test('failed saves retain local text and block refresh until explicit reload', async () => {
  const draft = createEditorDraft(note(), async () => { throw new Error('version conflict') })
  draft.edit({ title: '本地标题', content: '保留本地修改' })
  await assert.rejects(draft.flush(), /version conflict/)
  draft.sync(note({ content: '磁盘上的新内容', revision: 'rev-2' }))
  assert.equal(draft.getSnapshot().title, '本地标题')
  assert.equal(draft.getSnapshot().content, '保留本地修改')
  assert.equal(draft.getSnapshot().status, 'error')
  draft.sync(note({ content: '磁盘上的新内容', revision: 'rev-2' }), true)
  assert.equal(draft.getSnapshot().status, 'saved')
  assert.equal(draft.getSnapshot().content, '磁盘上的新内容')
})
