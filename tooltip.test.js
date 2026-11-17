import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

// The client bundle only exposes its parts through the host module loader, so the
// tooltip helper is exercised by slicing it out and running it against a stub React.
const source = await readFile(new URL('./client.js', import.meta.url), 'utf8')
const start = source.indexOf('    const hostPrimitives = (() => {')
const end = source.indexOf('    // ---------------------------------------------------------------- locale')
assert.ok(start > 0 && end > start, 'tooltip helper block is missing from client.js')

const element = (type, props, children) => ({ type, props: props ?? {}, children })
const h = (type, props, ...children) => element(type, props, children)
const React = {
  isValidElement: (value) => typeof value === 'object' && value !== null && 'type' in value,
  cloneElement: (child, extra) => ({ ...child, props: { ...child.props, ...extra } }),
}

const FakeTooltip = function Tooltip() {}
const load = (requireImpl) => {
  const factory = vm.runInNewContext(
    '(function (require, React, h) {' + source.slice(start, end) + '\nreturn { Tip, tipChild }})',
    {},
  )
  return factory(requireImpl, React, h)
}
const withPrimitives = load(() => ({ Tooltip: FakeTooltip }))
const withoutPrimitives = load(() => {
  throw new Error('unknown module')
})

test('host tooltip wraps the button and owns the hint', () => {
  const bubble = withPrimitives.Tip({ label: '存为笔记', children: element('button', { className: 'dn-answer-action' }) })
  assert.equal(bubble.type, FakeTooltip)
  assert.equal(bubble.props.label, '存为笔记')
  assert.equal(bubble.props.side, 'bottom', 'menu rows place hints under the row, not at the default right side')
  assert.equal(bubble.props.portal, true)

  const button = bubble.children[0]
  assert.equal(button.props['aria-label'], '存为笔记', 'icon-only buttons keep an accessible name')
  assert.equal(button.props.title, undefined, 'no native title left to fight the host bubble')
})

test('a native title on the button is removed so only one hint can open', () => {
  const bubble = withPrimitives.Tip({ label: '置顶', children: element('button', { title: '置顶' }) })
  assert.equal(bubble.children[0].props.title, undefined)
})

test('hosts without the primitives module fall back to the native title', () => {
  const button = withoutPrimitives.Tip({ label: '关联笔记', children: element('button', {}) })
  assert.equal(button.type, 'button')
  assert.equal(button.props.title, '关联笔记')
  assert.equal(button.props['aria-label'], '关联笔记')
})

test('an empty label leaves the button untouched', () => {
  const plain = element('button', {})
  assert.equal(withPrimitives.Tip({ label: '', children: plain }), plain)
  assert.equal(withPrimitives.Tip({ label: null, children: plain }), plain)
})
