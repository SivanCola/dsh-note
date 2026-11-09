import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const source = await readFile(new URL('./client.js', import.meta.url), 'utf8')
const start = source.indexOf('    function escapeHtml(')
const end = source.indexOf('    // ---------------------------------------------------------------- styles')
const { renderMarkdown } = vm.runInNewContext('(function () {' + source.slice(start, end) + 'return { renderMarkdown }})()')

test('pipe tables become a real table with a header row', () => {
  const html = renderMarkdown('| 指标 | 阈值 |\n| --- | --- |\n| 错误率 | > 1% |\n| 首屏耗时 | > 2.5s |')
  assert.ok(html.startsWith('<table><thead><tr><th>指标</th><th>阈值</th></tr></thead><tbody>'))
  assert.ok(html.includes('<tr><td>错误率</td><td>&gt; 1%</td></tr>'))
  assert.ok(html.includes('<tr><td>首屏耗时</td><td>&gt; 2.5s</td></tr>'))
  assert.ok(html.endsWith('</tbody></table>'))
  assert.ok(!html.includes('| --- |'))
})

test('table cells keep inline markup and column alignment', () => {
  const html = renderMarkdown('| 名称 | 状态 |\n| :--- | ---: |\n| **上线** | `ok` |')
  assert.ok(html.includes('<th style="text-align:left">名称</th>'))
  assert.ok(html.includes('<th style="text-align:right">状态</th>'))
  assert.ok(html.includes('<td style="text-align:left"><strong>上线</strong></td>'))
  assert.ok(html.includes('<td style="text-align:right"><code>ok</code></td>'))
})

test('tables do not swallow neighbouring paragraphs or the toolbar insert shape', () => {
  const html = renderMarkdown('前置段落\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n后续段落')
  assert.equal((html.match(/<p>/g) || []).length, 2)
  assert.ok(html.includes('<p>前置段落</p>'))
  assert.ok(html.includes('<p>后续段落</p>'))
  const empty = renderMarkdown('| 列 1 | 列 2 |\n| --- | --- |\n|  |  |')
  assert.ok(empty.includes('<thead>'))
  assert.equal((empty.match(/<td><\/td>/g) || []).length, 2)
})

test('a lone pipe line stays a paragraph so prose is not turned into a table', () => {
  const html = renderMarkdown('用 a | b 表示二者之一')
  assert.ok(html.startsWith('<p>'))
  assert.ok(!html.includes('<table>'))
})
