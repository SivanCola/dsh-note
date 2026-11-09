import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { apply } from './index.js'

async function vault(t, services = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-note-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const root = join(directory, 'notes')
  let handler
  const tools = new Map()
  apply({
    get(name) { return services[name] },
    effect(callback) { callback() },
    tools: { register(tool) { tools.set(tool.name, tool); return () => {} } },
    webServer: { register(route) { handler = route.handler; return () => {} } },
  }, { rootDir: root })
  const api = (action, payload = {}) => new Promise((resolve, reject) => {
    const request = Readable.from([Buffer.from(JSON.stringify({ action, ...payload }))])
    request.method = 'POST'
    request.headers = { host: 'localhost' }
    request.socket = { remoteAddress: '127.0.0.1' }
    let status
    handler(request, {
      writeHead(value) { status = value },
      end(value) {
        try { resolve({ status, ...JSON.parse(value) }) } catch (error) { reject(error) }
      },
    })
  })
  return { api, tools, root, directory }
}

test('root IDs remain stable; real folders, including empty folders, are listed', async (t) => {
  const { api } = await vault(t)
  assert.deepEqual((await api('list')).notes, [])
  const rootNote = await api('create', { title: '原有笔记', content: '# 原有正文' })
  assert.equal(rootNote.note.id, '原有笔记')
  assert.equal((await api('createFolder', { name: '工作' })).ok, true)
  assert.equal((await api('createFolder', { parent: '工作', name: '2026' })).ok, true)
  const list = await api('list')
  assert.deepEqual(list.folders.map((folder) => folder.path).sort(), ['工作', '工作/2026'])
  assert.equal(list.notes[0].id, rootNote.note.id)
  assert.equal((await api('get', { id: rootNote.note.id })).note.content.trim(), '# 原有正文')
})

test('nested notes support save, search, todos, agent reads and deletion', async (t) => {
  const { api, tools, root } = await vault(t)
  await api('createFolder', { name: '工作' })
  await api('createFolder', { parent: '工作', name: '2026' })
  const { note } = await api('create', { title: '接口评审', folder: '工作/2026', content: '- [ ] 联调 lottery_barrage', tags: ['接口'] })
  assert.equal(note.id, '工作/2026/接口评审')
  assert.equal((await api('list')).todos[0].noteId, note.id)
  assert.equal((await api('search', { q: 'lottery_barrage' })).hits[0].id, note.id)
  assert.equal((await tools.get('note_read').execute({ id: note.id })).note.id, note.id)
  assert.equal((await tools.get('note_list').execute({})).notes[0].id, note.id)
  await api('todo', { id: note.id, line: 0, done: true })
  assert.equal((await api('list')).todos[0].done, true)
  await api('save', { id: note.id, title: '已评审', content: '原文仍在', tags: ['已完成'] })
  assert.match(await readFile(join(root, note.id + '.md'), 'utf8'), /title: 已评审/)
  assert.equal((await api('delete', { id: note.id })).ok, true)
  assert.equal((await api('list')).notes.length, 0)
})

test('same titles in different folders stay distinct; duplicates do not overwrite', async (t) => {
  const { api } = await vault(t)
  await api('createFolder', { name: '工作' })
  const root = await api('create', { title: '笔记', content: '根目录' })
  const nested = await api('create', { title: '笔记', folder: '工作', content: '子目录' })
  const duplicate = await api('create', { title: '笔记', folder: '工作', content: '第二篇' })
  assert.equal(root.note.id, '笔记')
  assert.equal(nested.note.id, '工作/笔记')
  assert.equal(duplicate.note.id, '工作/笔记-2')
  assert.equal((await api('get', { id: nested.note.id })).note.content.trim(), '子目录')
  assert.equal((await api('createFolder', { name: '工作' })).ok, false)
})

test('traversal and symlinks cannot read, write or delete outside the vault', async (t) => {
  const { api, root, directory } = await vault(t)
  await mkdir(root)
  const outside = join(directory, 'outside')
  await mkdir(outside)
  await writeFile(join(outside, 'private.md'), 'untouched')
  await symlink(outside, join(root, 'linked'))
  await symlink(join(outside, 'private.md'), join(root, 'linked-note.md'))
  for (const id of ['../outside/private', 'linked/private', 'linked-note', '/outside/private', 'a/../private', 'a\\private']) {
    assert.equal((await api('get', { id })).ok, false, id)
    assert.equal((await api('save', { id, content: 'overwrite' })).ok, false, id)
    assert.equal((await api('delete', { id })).ok, false, id)
  }
  for (const folder of ['../outside', 'linked', '/outside']) {
    assert.equal((await api('create', { folder, title: 'escape' })).ok, false)
    assert.equal((await api('createFolder', { parent: folder, name: 'escape' })).ok, false)
  }
  assert.deepEqual((await api('list')).folders, [])
  assert.deepEqual((await api('list')).notes, [])
  assert.equal(await readFile(join(outside, 'private.md'), 'utf8'), 'untouched')
})

test('summary cleaning preserves identifiers and stored transcript content', async (t) => {
  const { api } = await vault(t)
  const content = '> 由 DSH 会话沉淀生成 · 2026/11/9\n\n### 🧑 我\n\n接口评审\n\n### 🤖 DSH\n\n## 结论\n\n- 保留 `lottery_barrage` 与 `--dry-run`\n- [ ] 下一步联调'
  await api('create', { title: '接口评审 · 会话摘录', content })
  const note = (await api('list')).notes[0]
  assert.equal(note.excerpt, '结论：保留 lottery_barrage 与 --dry-run；下一步联调')
  assert.equal(note.content.trim(), content)
})

test('favorites and pins persist independently through edits and tool reads', async (t) => {
  const { api, tools, root } = await vault(t)
  const { note } = await api('create', { title: '独立收藏', pinned: true })
  assert.equal(note.starred, false)
  await api('save', { id: note.id, starred: true })
  await api('save', { id: note.id, pinned: false })
  await api('save', { id: note.id, content: '正文更新' })
  const current = (await api('list')).notes[0]
  assert.equal(current.starred, true)
  assert.equal(current.pinned, false)
  const raw = await readFile(join(root, note.id + '.md'), 'utf8')
  assert.match(raw, /starred: true/)
  assert.match(raw, /pinned: false/)
  assert.equal((await tools.get('note_read').execute({ id: note.id })).note.starred, true)
  await api('save', { id: note.id, starred: false, pinned: true })
  const unstarred = (await api('get', { id: note.id })).note
  assert.equal(unstarred.starred, false)
  assert.equal(unstarred.pinned, true)
})

test('stale todo rows cannot toggle a different line after an edit', async (t) => {
  const { api } = await vault(t)
  const { note } = await api('create', { title: '待办同步', content: '- [ ] 第一项\n- [ ] 第二项' })
  const before = await api('list')
  const todo = before.todos[1]
  await api('save', { id: note.id, content: '新增说明\n- [ ] 第一项\n- [ ] 第二项' })
  const rejected = await api('todo', { id: todo.noteId, line: todo.line, done: true, revision: todo.revision })
  assert.equal(rejected.ok, false)
  assert.ok(!(await api('get', { id: note.id })).note.content.includes('[x]'))
  const latest = (await api('list')).todos[1]
  const changed = await api('todo', { id: latest.noteId, line: latest.line, done: true, revision: latest.revision })
  assert.equal(changed.ok, true)
  assert.ok(changed.note.content.includes('- [x] 第二项'))
  const staleSave = await api('save', { id: note.id, content: '旧正文', expectedRevision: before.notes[0].revision })
  assert.equal(staleSave.ok, false)
  assert.ok((await api('get', { id: note.id })).note.content.includes('- [x] 第二项'))
})
