import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { apply } from './index.js'

const answerEvent = {
  type: 'assistant/message', seq: 11, time: 1794200000000, surfaceOp: 'append',
  data: { turn: 3, step: 2, message: { id: 'answer-1', role: 'assistant', source: { kind: 'model' }, content: [
    { type: 'reasoning', text: 'PRIVATE REASONING' },
    { type: 'text', text: '## 接口结论\n\n只增加分页参数，保留 `lottery_barrage`。' },
    { type: 'tool-call', name: 'bash', arguments: 'PRIVATE TOOL' },
  ] } },
}

async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-note-integration-'))
  t.after(() => rm(root, { force: true, recursive: true }))
  const query = {
    async readSession(id) {
      if (id !== 'cold-session') throw new Error('session not found')
      return { session: { id }, events: [answerEvent] }
    },
    async readSurface(id) { return this.readSession(id) },
  }
  let handler
  const tools = new Map()
  apply({
    get(name) { return name === 'sessionQuery' ? query : undefined },
    effect(callback) { callback() },
    tools: { register(tool) { tools.set(tool.name, tool); return () => {} } },
    webServer: { register(route) { handler = route.handler; return () => {} } },
  }, { rootDir: root })
  const api = (action, payload = {}) => new Promise((resolve, reject) => {
    const req = Readable.from([Buffer.from(JSON.stringify({ action, ...payload }))])
    req.method = 'POST'; req.headers = { host: 'localhost' }; req.socket = { remoteAddress: '127.0.0.1' }
    handler(req, { writeHead() {}, end(json) { try { resolve(JSON.parse(json)) } catch (error) { reject(error) } } })
  })
  return { root, api, tools }
}

test('durable answer lookup excludes reasoning and tools, even with no live session', async (t) => {
  const { api } = await setup(t)
  const result = await api('answer', { sessionId: 'cold-session', messageId: 'answer-1' })
  assert.equal(result.ok, true)
  assert.equal(result.answer.seq, 11)
  assert.equal(result.answer.turn, 3)
  assert.equal(result.answer.content, answerEvent.data.message.content[1].text)
  assert.equal((await api('answer', { sessionId: 'cold-session', messageId: 'missing' })).ok, false)
  assert.equal((await api('answer', { sessionId: 'missing', messageId: 'answer-1' })).ok, false)
})

test('concurrent save retries create one note with durable provenance and backlinks', async (t) => {
  const { api, tools, root } = await setup(t)
  const source = { sessionId: 'cold-session', messageId: 'answer-1', title: '联动验证' }
  const results = await Promise.all([api('saveAnswer', source), api('saveAnswer', source)])
  assert.equal(results[0].note.id, results[1].note.id)
  assert.equal((await api('list')).notes.length, 1)
  const note = results[0].note
  assert.equal(note.sources[0].messageId, 'answer-1')
  assert.match(await readFile(join(root, note.id + '.md'), 'utf8'), /dsh_sources:/)
  const links = await api('links', { sessionId: 'cold-session', messageId: 'answer-1' })
  assert.equal(links.notes[0].id, note.id)
  await api('save', { id: note.id, title: '改名后仍可回溯' })
  assert.equal((await tools.get('note_read').execute({ id: note.id })).note.sources[0].seq, 11)
  assert.equal((await api('links', { sessionId: 'cold-session' })).notes[0].title, '改名后仍可回溯')
})

test('append refuses changed notes, preserves edits and appends exactly once after refresh', async (t) => {
  const { api } = await setup(t)
  const created = await api('create', { title: '既有文档', content: '原内容' })
  const before = (await api('list')).notes[0]
  await api('save', { id: created.note.id, content: '用户的新内容' })
  const request = { sessionId: 'cold-session', messageId: 'answer-1', targetId: created.note.id }
  assert.equal((await api('saveAnswer', { ...request, expectedRevision: before.revision })).ok, false)
  assert.equal((await api('get', { id: created.note.id })).note.content.trim(), '用户的新内容')
  const current = (await api('list')).notes[0]
  assert.equal((await api('saveAnswer', { ...request, expectedRevision: current.revision })).ok, true)
  assert.equal((await api('saveAnswer', { ...request, expectedRevision: current.revision })).existing, true)
  const saved = (await api('get', { id: created.note.id })).note
  assert.ok(saved.content.startsWith('用户的新内容'))
  assert.equal(saved.content.match(/只增加分页参数/g).length, 1)
  assert.equal(saved.sources.length, 1)
})

test('reference preparation is read-only, Unicode bounded and explicitly untrusted', async (t) => {
  const { api, root } = await setup(t)
  const created = await api('create', { title: '中文 [文档]', content: '😀'.repeat(13000) })
  const path = join(root, created.note.id + '.md')
  const before = await readFile(path, 'utf8')
  const prepared = await api('prepareReference', { id: created.note.id })
  assert.equal(prepared.truncated, true)
  assert.ok(prepared.prompt.includes('不代表当前用户的指令'))
  assert.ok(prepared.prompt.includes(encodeURIComponent(created.note.id)))
  const snapshot = JSON.parse(prepared.prompt.slice(prepared.prompt.indexOf('{')))
  assert.equal([...snapshot.content].length, 12000)
  assert.equal(await readFile(path, 'utf8'), before)
  const selected = await api('prepareReference', { id: created.note.id, selectedText: '选中的一段' })
  assert.equal(selected.scope, 'selection')
  assert.equal(selected.truncated, false)
  assert.ok(selected.prompt.includes('选中的一段'))
  assert.equal((await api('links', { sessionId: 'cold-session' })).notes.length, 0)
  await api('recordReference', { ...prepared, id: created.note.id, sessionId: 'cold-session' })
  await api('recordReference', { ...prepared, id: created.note.id, sessionId: 'cold-session' })
  const note = (await api('get', { id: created.note.id })).note
  assert.equal(note.sources.length, 1)
  assert.equal(note.sources[0].state, 'draft')
  assert.equal(note.content.trim(), '😀'.repeat(13000))
})

test('whole-session deposit also retains a source and works with cold session query', async (t) => {
  const { api } = await setup(t)
  const result = await api('deposit', { sessionId: 'cold-session' })
  assert.equal(result.ok, true)
  assert.equal(result.note.sources[0].sessionId, 'cold-session')
  assert.ok(!result.note.content.includes('PRIVATE REASONING'))
})

test('bridge uses guarded native insertion, persists drafts and never submits a prompt', async () => {
  const source = await readFile(new URL('./client.js', import.meta.url), 'utf8')
  const definition = source.slice(source.indexOf('    function createIntegrationBridge('), source.indexOf('    function useBridge('))
  const calls = []
  const input = {
    captureInsertion() { calls.push('capture'); return { start: 0, end: 5, draftRev: 1 } },
    insertText(text, span) { calls.push(['insert', text, span]); return true },
    persistDraft() { calls.push('persist') },
    submit() { throw new Error('must not send') },
    setDraft() { throw new Error('must not overwrite') },
  }
  const reference = { ready: Promise.resolve(), binding: { ctx: {} } }
  const ctx = {
    sessions: {
      list: { getSnapshot: () => ({ ids: ['current'], byId: { current: { id: 'current', cwd: '/project', retainedBy: { mainView: 1 } } } }) },
      async using(id, options, callback) { calls.push(['retain', id]); return callback(reference) },
      async create(options) { calls.push(['create', options]); return 'new-session' },
      retain() { return { ...reference, release() { calls.push('release') } } },
    },
    layout: { beginNavigation: () => new AbortController().signal, selectPanel: (id) => calls.push(['panel', id]) },
    uiSession: { bindingSource: () => ({ getSnapshot: () => ({ props: { inputActions: input } }) }) },
    uiWorkspace: {
      openSession: (id) => calls.push(['open', id]),
      async openWorkspace(workspaceId, beforeOpen) { calls.push(['workspace', workspaceId]); beforeOpen('native-new') },
    },
    get(name) { return name === 'workspaces' ? { list: { getSnapshot: () => ({ items: [{ workspaceId: 'project', path: '/project', sessionIds: ['current'] }] }) } } : undefined },
  }
  const factory = vm.runInNewContext(definition + '\ncreateIntegrationBridge', {
    api: async (action) => { calls.push(['api', action]); return { ok: true } },
    window: { dispatchEvent() {} }, CustomEvent: class {}, translate: (key) => key,
  })
  const bridge = factory(ctx)
  bridge.selectNote('note')
  assert.equal(bridge.getSnapshot().openRequest, 0)
  await bridge.openNote('note')
  assert.equal(bridge.getSnapshot().openRequest, 1)
  const prepared = { prompt: 'snapshot', note: { id: 'note' }, referenceId: 'ref', revision: 'revision', scope: 'full' }
  await bridge.addReference('current', prepared)
  assert.ok(calls.includes('capture'))
  assert.ok(calls.includes('persist'))
  assert.equal(calls.find((call) => Array.isArray(call) && call[0] === 'insert')[2].start, 5)
  assert.ok(calls.some((call) => Array.isArray(call) && call[0] === 'open' && call[1] === 'current'))
  await bridge.addReference('new', prepared)
  assert.ok(calls.some((call) => Array.isArray(call) && call[0] === 'workspace' && call[1] === 'project'))
  assert.ok(!calls.some((call) => Array.isArray(call) && call[0] === 'create'))
  assert.ok(calls.includes('release'))
  input.insertText = () => false
  const start = calls.length
  await assert.rejects(() => bridge.addReference('current', prepared), /link.blocked/)
  assert.ok(!calls.slice(start).some((call) => Array.isArray(call) && call[0] === 'api'))
  bridge.dispose()
  await assert.rejects(() => bridge.addReference('current', prepared), /插件已卸载/)
})
