/**
 * dsh-note — 本地 Markdown 笔记页面 (Client half).
 *
 * Three columns inside the main panel: filter rail, note list, editor with a
 * source/preview split. Notes live as plain `.md` files in the vault the Host
 * half owns; this module only talks to it over /api/dsh-note.
 */
window.__ModuleLoader__.load({
  id: '@sivancola/dsh-note',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useMemo, useRef, useCallback } = React

    const NS = 'dsh-note'
    const API = '/api/dsh-note'

    // ---------------------------------------------------------------- locale
    const ZH = {
      'panel.label': '笔记',
      'page.new': '新建',
      'page.newFolder': '新建文件夹',
      'page.folderName': '文件夹名称',
      'page.create': '创建',
      'page.cancel': '取消',
      'page.allNotes': '全部笔记',
      'page.showSummary': '切换到摘要列表',
      'page.showTree': '切换到目录树',
      'page.sortTitle': '按标题排序',
      'page.sortUpdated': '按更新时间排序',
      'page.collapseAll': '收起全部文件夹',
      'page.newInFolder': '在此文件夹新建笔记',
      'page.folderError': '创建失败，名称可能已存在',
      'link.join': '加入对话',
      'link.saveAnswer': '保存回答到笔记',
      'link.related': '关联笔记',
      'link.sources': '来源与关联',
      'link.source': '来源回答',
      'link.openNote': '打开笔记',
      'link.current': '当前对话',
      'link.newSession': '新建对话（当前工作区）',
      'link.draftHint': '内容会加入对话草稿，保留已有草稿和引用，由你发送。',
      'link.snapshotHint': '加入的是此刻的笔记快照，后续编辑不会改变已发送的内容。',
      'link.saved': '回答已保存',
      'link.existing': '这条回答已经保存，可直接打开笔记。',
      'link.createNote': '新建笔记',
      'link.appendNote': '追加到已有笔记',
      'link.target': '目标笔记',
      'link.title': '笔记标题',
      'link.folder': '保存位置',
      'link.loading': '读取中…',
      'link.save': '保存',
      'link.close': '关闭',
      'link.noNotes': '还没有关联笔记',
      'link.full': '整篇笔记',
      'link.selection': '选中文字',
      'link.reference': '加入过此会话草稿',
      'link.back': '返回来源会话',
      'link.waitSave': '正在保存笔记，请稍后加入对话',
      'link.blocked': '目标对话暂时不能编辑，内容仍保留在此窗口。请稍后重试。',
      'link.truncated': '内容较长，本次只加入前 12000 个字符；可改为选中一段文字。',
      'page.search': '搜索笔记',
      'page.emptyList': '还没有笔记',
      'page.emptyListHint': '点击「新建」写第一篇',
      'page.emptySelect': '选择左侧的一篇笔记',
      'page.emptySelectHint': '或者新建一篇，支持 Markdown 与双栏预览',
      'page.count': (n) => `共 ${n} 篇`,
      'page.copy': '复制',
      'page.copied': '已复制',
      'page.delete': '删除',
      'page.deleteConfirm': '删除后不可恢复，确定删除这篇笔记？',
      'page.pin': '置顶',
      'page.unpin': '取消置顶',
      'page.star': '收藏',
      'page.unstar': '取消收藏',
      'page.searchTodos': '搜索待办、笔记标题或标签',
      'page.noMatch': '没有匹配的笔记',
      'page.noStars': '还没有收藏的笔记',
      'page.noStarsHint': '点击笔记右上角的星标即可收藏',
      'page.reload': '重新载入',
      'page.reloadConfirm': '重新载入会放弃当前尚未保存的修改，是否继续？',
      'page.preview': '预览',
      'page.split': '分栏',
      'page.edit': '编辑',
      'page.titlePlaceholder': '笔记标题',
      'page.tagsPlaceholder': '添加标签',
      'page.saved': '已保存',
      'page.saving': '保存中…',
      'page.dirty': '未保存',
      'page.saveFailed': '保存失败',
      'page.deposit': '存为笔记',
      'page.depositing': '保存中…',
      'page.deposited': '已沉淀为笔记',
      'page.depositFailed': '沉淀失败',
      'nav.all': '笔记',
      'nav.recent': '最近',
      'nav.todos': '待办',
      'nav.starred': '收藏',
      'nav.tags': '标签',
      'todos.empty': '还没有待办',
      'todos.noMatch': '没有匹配的待办',
      'todos.done': '已完成',
      'todos.from': '来自',
      'toolbar.body': '正文',
      'toolbar.bold': '加粗',
      'toolbar.italic': '斜体',
      'toolbar.code': '行内代码',
      'toolbar.codeBlock': '代码块',
      'toolbar.heading': '标题',
      'toolbar.list': '列表',
      'toolbar.task': '待办项',
      'toolbar.quote': '引用',
      'toolbar.link': '链接',
      'toolbar.table': '表格',
      'status.refresh': '刷新',
      'view.hint': '⌘S 保存 · ⌘K 搜索',
      'settings.label': '笔记',
      'settings.root': '笔记库目录',
      'settings.rootDesc': 'Markdown 文件所在的文件夹；保存后插件会重新加载并立即使用新目录',
      'settings.save': '保存',
      'settings.saved': '已保存，插件正在重新加载…',
      'settings.saveFailed': '保存失败',
      'settings.stats': '当前库',
      'settings.statsValue': (counts) => `${counts.notes} 篇 · ${counts.folders} 个文件夹 · ${counts.tags} 个标签 · ${counts.todos} 个待办`,
      'settings.open': '打开笔记面板',
      'settings.openDesc': '与对话页平级的三栏笔记库',
      'settings.openButton': '打开',
      'settings.shortcuts': '快捷键',
      'settings.shortcutsDesc': '⌘K 搜索笔记 · ⌘S 立即保存',
      'settings.format': '数据格式',
      'settings.formatDesc': '每篇笔记一个 Markdown 文件，frontmatter 存标题、标签、时间与来源；可直接用 git 或 Obsidian 打开',
      'settings.loadFailed': '读取笔记库失败',
      'settings.font': '字号',
      'settings.fontDesc': '笔记列表与正文的文字大小，只影响本机',
      'settings.fontSmall': '小',
      'settings.fontStandard': '标准',
      'settings.fontLarge': '大',
      'settings.fontXLarge': '特大',
    }

    const EN = {
      'panel.label': 'Notes',
      'page.new': 'New',
      'page.newFolder': 'New folder',
      'page.folderName': 'Folder name',
      'page.create': 'Create',
      'page.cancel': 'Cancel',
      'page.allNotes': 'All notes',
      'page.showSummary': 'Switch to summary list',
      'page.showTree': 'Switch to folder tree',
      'page.sortTitle': 'Sort by title',
      'page.sortUpdated': 'Sort by last update',
      'page.collapseAll': 'Collapse all folders',
      'page.newInFolder': 'New note in this folder',
      'page.folderError': 'Could not create folder; the name may already exist',
      'link.join': 'Add to chat',
      'link.saveAnswer': 'Save answer to note',
      'link.related': 'Linked notes',
      'link.sources': 'Sources and links',
      'link.source': 'Source answer',
      'link.openNote': 'Open note',
      'link.current': 'Current chat',
      'link.newSession': 'New chat (current workspace)',
      'link.draftHint': 'Add this snapshot to the draft, preserving existing text and references. You choose when to send.',
      'link.snapshotHint': 'Later note edits do not change the snapshot already sent.',
      'link.saved': 'Answer saved',
      'link.existing': 'This answer is already saved. You can open the note.',
      'link.createNote': 'New note',
      'link.appendNote': 'Append to an existing note',
      'link.target': 'Target note',
      'link.title': 'Note title',
      'link.folder': 'Folder',
      'link.loading': 'Loading…',
      'link.save': 'Save',
      'link.close': 'Close',
      'link.noNotes': 'No linked notes yet',
      'link.full': 'Whole note',
      'link.selection': 'Selected text',
      'link.reference': 'Added to this chat draft',
      'link.back': 'Return to source chat',
      'link.waitSave': 'Wait for the note to finish saving before adding it to a chat',
      'link.blocked': 'The target draft cannot be edited yet. Your content is retained here; try again later.',
      'link.truncated': 'Only the first 12000 characters will be added. You can select a shorter passage instead.',
      'page.search': 'Search notes',
      'page.emptyList': 'No notes yet',
      'page.emptyListHint': 'Use New to write the first one',
      'page.emptySelect': 'Select a note on the left',
      'page.emptySelectHint': 'Or create one — Markdown with split preview',
      'page.count': (n) => `${n} notes`,
      'page.copy': 'Copy',
      'page.copied': 'Copied',
      'page.delete': 'Delete',
      'page.deleteConfirm': 'Delete this note? This cannot be undone.',
      'page.pin': 'Pin',
      'page.unpin': 'Unpin',
      'page.star': 'Star',
      'page.unstar': 'Unstar',
      'page.searchTodos': 'Search todos, note titles or tags',
      'page.noMatch': 'No matching notes',
      'page.noStars': 'No starred notes yet',
      'page.noStarsHint': 'Use the star in the note header to add one',
      'page.reload': 'Reload',
      'page.reloadConfirm': 'Reloading discards unsaved local edits. Continue?',
      'page.preview': 'Preview',
      'page.split': 'Split',
      'page.edit': 'Edit',
      'page.titlePlaceholder': 'Note title',
      'page.tagsPlaceholder': 'Add tag',
      'page.saved': 'Saved',
      'page.saving': 'Saving…',
      'page.dirty': 'Unsaved',
      'page.saveFailed': 'Save failed',
      'page.deposit': 'Save as note',
      'page.depositing': 'Saving…',
      'page.deposited': 'Saved as note',
      'page.depositFailed': 'Failed',
      'nav.all': 'Notes',
      'nav.recent': 'Recent',
      'nav.todos': 'Todos',
      'nav.starred': 'Starred',
      'nav.tags': 'Tags',
      'todos.empty': 'No todos yet',
      'todos.noMatch': 'No matching todos',
      'todos.done': 'Completed',
      'todos.from': 'from',
      'toolbar.body': 'Body',
      'toolbar.bold': 'Bold',
      'toolbar.italic': 'Italic',
      'toolbar.code': 'Inline code',
      'toolbar.codeBlock': 'Code block',
      'toolbar.heading': 'Heading',
      'toolbar.list': 'List',
      'toolbar.task': 'Task',
      'toolbar.quote': 'Quote',
      'toolbar.link': 'Link',
      'toolbar.table': 'Table',
      'status.refresh': 'Refresh',
      'view.hint': '⌘S save · ⌘K search',
      'settings.label': 'Notes',
      'settings.root': 'Vault directory',
      'settings.rootDesc': 'Folder holding the Markdown files; saving reloads the plugin and switches to it immediately',
      'settings.save': 'Save',
      'settings.saved': 'Saved — the plugin is reloading…',
      'settings.saveFailed': 'Save failed',
      'settings.stats': 'Current vault',
      'settings.statsValue': (counts) => `${counts.notes} notes · ${counts.folders} folders · ${counts.tags} tags · ${counts.todos} todos`,
      'settings.open': 'Open the notes panel',
      'settings.openDesc': 'The three-column vault sitting beside the conversation',
      'settings.openButton': 'Open',
      'settings.shortcuts': 'Shortcuts',
      'settings.shortcutsDesc': '⌘K search notes · ⌘S save now',
      'settings.format': 'Data format',
      'settings.formatDesc': 'One Markdown file per note, with title, tags, timestamps and sources in frontmatter; opens directly in git or Obsidian',
      'settings.loadFailed': 'Could not read the vault',
      'settings.font': 'Text size',
      'settings.fontDesc': 'Size of the note list and body text; stored on this machine',
      'settings.fontSmall': 'Small',
      'settings.fontStandard': 'Default',
      'settings.fontLarge': 'Large',
      'settings.fontXLarge': 'XL',
    }

    // ------------------------------------------------------------------- api
    async function api(action, payload) {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...(payload ?? {}) }),
      })
      let body
      try {
        body = await response.json()
      } catch {
        throw new Error('HTTP ' + response.status)
      }
      if (body.ok !== true) throw new Error(body.error ?? 'HTTP ' + response.status)
      return body
    }

    // -------------------------------------------------------------- markdown
    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    function inline(text) {
      let out = escapeHtml(text)
      out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
      out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>')
      out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>')
      return out
    }

    function renderMarkdown(source) {
      const lines = String(source ?? '').replace(/\r\n/g, '\n').split('\n')
      const out = []
      let index = 0
      let listOpen = false
      let listTag = 'ul'

      const closeList = () => {
        if (!listOpen) return
        out.push('</' + listTag + '>')
        listOpen = false
      }
      const openList = (tag, className) => {
        if (listOpen && listTag !== tag) closeList()
        if (listOpen) return
        listTag = tag
        out.push('<' + tag + (className ? ' class="' + className + '"' : '') + '>')
        listOpen = true
      }

      while (index < lines.length) {
        const line = lines[index]

        if (/^```/.test(line)) {
          closeList()
          const lang = line.slice(3).trim()
          index += 1
          const buffer = []
          while (index < lines.length && !/^```/.test(lines[index])) {
            buffer.push(lines[index])
            index += 1
          }
          index += 1
          out.push(
            '<pre class="dn-code" data-lang="' + escapeHtml(lang) + '"><code>' + escapeHtml(buffer.join('\n')) + '</code></pre>',
          )
          continue
        }

        if (/^\s*$/.test(line)) {
          closeList()
          index += 1
          continue
        }

        const heading = /^(#{1,6})\s+(.*)$/.exec(line)
        if (heading !== null) {
          closeList()
          const level = heading[1].length
          out.push('<h' + level + '>' + inline(heading[2]) + '</h' + level + '>')
          index += 1
          continue
        }

        if (/^\s*([-*_])\s*\1\s*\1[\s\1]*$/.test(line)) {
          closeList()
          out.push('<hr/>')
          index += 1
          continue
        }

        const task = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/.exec(line)
        if (task !== null) {
          openList('ul', 'dn-tasks')
          const done = task[1] !== ' '
          out.push(
            '<li class="dn-task' + (done ? ' dn-task-done' : '') + '"><span class="dn-check">' + (done ? '✓' : '') + '</span><span>' + inline(task[2]) + '</span></li>',
          )
          index += 1
          continue
        }

        const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
        if (bullet !== null) {
          openList('ul')
          out.push('<li>' + inline(bullet[1]) + '</li>')
          index += 1
          continue
        }

        const ordered = /^\s*\d+\.\s+(.*)$/.exec(line)
        if (ordered !== null) {
          openList('ol')
          out.push('<li>' + inline(ordered[1]) + '</li>')
          index += 1
          continue
        }

        const quote = /^\s*>\s?(.*)$/.exec(line)
        if (quote !== null) {
          closeList()
          out.push('<blockquote>' + inline(quote[1]) + '</blockquote>')
          index += 1
          continue
        }

        closeList()
        const paragraph = [line]
        index += 1
        while (
          index < lines.length &&
          !/^\s*$/.test(lines[index]) &&
          !/^(#{1,6}\s|```|\s*[-*]\s|\s*\d+\.\s|\s*>)/.test(lines[index])
        ) {
          paragraph.push(lines[index])
          index += 1
        }
        out.push('<p>' + inline(paragraph.join(' ')) + '</p>')
      }

      closeList()
      return out.join('\n')
    }

    // ---------------------------------------------------------------- styles
    const CSS = `
      .dn-page{--dn-accent:#5b83ff;display:flex;height:100%;min-height:0;width:100%;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:var(--dn-fs,13px);container-type:inline-size;}
      .dn-rail{width:50px;box-sizing:border-box;flex:none;display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 3px 10px;border-right:1px solid var(--dsw-alias-border-l1);background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-layer-1));}
      .dn-rail-item{display:flex;flex-direction:column;align-items:center;gap:5px;width:42px;padding:9px 0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit;font-size:calc(var(--dn-fs,13px) * 0.769);line-height:1.2;}
      .dn-rail-item:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
      .dn-rail-item.on{background:var(--dsw-alias-bg-base);color:var(--dn-accent);font-weight:500;box-shadow:0 2px 8px #00000006;}
      .dn-rail-item svg{width:18px;height:18px;}
      .dn-rail-spacer{flex:1;}
      .dn-listpane{width:254px;box-sizing:border-box;flex:none;display:flex;flex-direction:column;min-height:0;border-right:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);}
      .dn-listhead{display:flex;flex-direction:column;gap:10px;padding:14px 12px 12px;}
      .dn-listtop{display:flex;flex-direction:column;align-items:stretch;gap:10px;}
      .dn-search{flex:1;min-width:0;height:28px;padding:0 10px;border-radius:7px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:calc(var(--dn-fs,13px) * 0.923);outline:none;}
      .dn-search:focus{border-color:var(--dn-accent);}
      .dn-new{flex:none;display:inline-flex;align-items:center;justify-content:center;gap:4px;height:28px;padding:0 10px;border-radius:4px;border:1px solid transparent;background:var(--dn-accent);color:#fff;font:inherit;font-size:calc(var(--dn-fs,13px) * 0.923);font-weight:500;cursor:pointer;}
      .dn-new:hover{filter:brightness(1.06);}
      .dn-listmeta{display:flex;align-items:center;justify-content:space-between;color:var(--dsw-alias-label-secondary);font-size:calc(var(--dn-fs,13px) * 0.846);font-variant-numeric:tabular-nums;}
      .dn-sectionhead{display:flex;align-items:center;gap:3px;margin:8px 12px 4px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l1);min-height:24px;font-size:calc(var(--dn-fs,13px) * 0.885);}
      .dn-sectiontitle{flex:1;min-width:0;font-weight:500;}
      .dn-listaction{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:3px;border:0;border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;}
      .dn-listaction svg{width:14px;height:14px;}
      .dn-listaction:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dn-accent);}
      .dn-folderform{display:flex;flex-direction:column;gap:6px;padding:8px 12px;font-size:calc(var(--dn-fs,13px) * 0.846);}
      .dn-folderform input{width:100%;box-sizing:border-box;}
      .dn-folderform-actions{display:flex;justify-content:flex-end;gap:5px;}
      .dn-foldererror{color:var(--dsw-alias-state-error-primary);}
      .dn-tagrow{display:flex;flex-wrap:wrap;gap:4px;padding:6px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);}
      .dn-tagchip{border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:999px;padding:1px 8px;font:inherit;font-size:calc(var(--dn-fs,13px) * 0.846);cursor:pointer;line-height:1.6;}
      .dn-tagchip:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-secondary);}
      .dn-tagchip.on{background:var(--dsw-alias-brand-primary);border-color:transparent;color:#fff;}
      .dn-rows{flex:1;min-height:0;overflow-y:auto;margin:0;padding:4px 6px 8px;list-style:none;scrollbar-width:thin;}
      .dn-row{position:relative;display:flex;flex-direction:column;gap:2px;padding:6px 9px;margin:0;border-radius:6px;cursor:pointer;border:1px solid transparent;}
      .dn-row:hover{background:var(--dsw-alias-bg-layer-2);}
      .dn-row.on{background:color-mix(in srgb,var(--dn-accent) 10%,var(--dsw-alias-bg-layer-1));}
      .dn-row-top{display:flex;align-items:center;gap:5px;min-width:0;}
      .dn-row-title{flex:1;min-width:0;font-size:calc(var(--dn-fs,13px) * 0.962);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .dn-pin{color:var(--dsw-alias-state-warn-primary);flex:none;font-size:calc(var(--dn-fs,13px) * 0.846);}
      .dn-pin svg{width:12px;height:12px;}
      .dn-editor-error{display:flex;gap:12px;align-items:center;padding:6px 18px;color:var(--dsw-alias-state-error-primary);font-size:calc(var(--dn-fs,13px) * 0.846);}
      .dn-row-excerpt{font-size:calc(var(--dn-fs,13px) * 0.885);line-height:1.4;color:var(--dsw-alias-label-secondary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;}
      .dn-row-meta{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);font-size:calc(var(--dn-fs,13px) * 0.808);font-variant-numeric:tabular-nums;}
      .dn-summary-list{list-style:none;margin:0;padding:0;}
      .dn-tree-scroll{padding-left:0;padding-right:0;}
      .dn-tree,.dn-tree ul{list-style:none;margin:0;padding:0;}
      .dn-tree{padding:0 10px 12px;}
      .dn-tree ul{position:relative;}
      .dn-tree ul::before{content:'';position:absolute;left:calc(12px + var(--dn-level,0)*14px);top:0;bottom:0;width:1px;background:var(--dsw-alias-border-l1);pointer-events:none;}
      .dn-tree-node{position:relative;margin:0;padding:0;outline:none;}
      .dn-tree-line{display:flex;align-items:center;gap:5px;height:28px;box-sizing:border-box;padding:0 5px 0 calc(5px + var(--dn-level,0)*14px);border-radius:3px;cursor:pointer;}
      .dn-tree-line:hover{background:var(--dsw-alias-bg-layer-2);}
      .dn-tree-node[aria-selected=true]>.dn-tree-line{background:color-mix(in srgb,var(--dn-accent) 10%,var(--dsw-alias-bg-layer-1));}
      .dn-tree-node:focus-visible>.dn-tree-line{outline:1px solid var(--dn-accent);outline-offset:-1px;}
      .dn-tree-caret{display:inline-flex;flex:none;width:10px;color:var(--dsw-alias-label-secondary);}
      .dn-tree-caret svg{width:10px;height:10px;transition:transform .12s ease;}
      .dn-tree-caret.open svg{transform:rotate(90deg);}
      .dn-tree-icon{display:inline-flex;flex:none;color:var(--dsw-alias-label-secondary);opacity:.75;}
      .dn-tree-icon svg{width:13px;height:13px;stroke-width:1.4;}
      .dn-tree-node[aria-selected=true]>.dn-tree-line .dn-tree-icon{color:var(--dn-accent);opacity:1;}
      .dn-tree-label{flex:1;min-width:0;font-size:calc(var(--dn-fs,13px) * 0.923);font-weight:400;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .dn-folder-add{opacity:0;flex:none;width:20px;height:20px;}
      .dn-tree-line:hover .dn-folder-add,.dn-tree-line:focus-within .dn-folder-add{opacity:1;}
      .dn-breadcrumb{display:flex;align-items:center;gap:6px;min-height:30px;padding:0 18px;border-bottom:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-size:calc(var(--dn-fs,13px) * 0.808);white-space:nowrap;overflow:hidden;}
      .dn-breadcrumb button{border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;padding:2px 0;flex:none;}
      .dn-breadcrumb button:hover{color:var(--dn-accent);}
      .dn-breadcrumb-current{overflow:hidden;text-overflow:ellipsis;color:var(--dsw-alias-label-primary);}
      .dn-note-sources{padding:6px 18px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:calc(var(--dn-fs,13px) * 0.846);color:var(--dsw-alias-label-secondary);}
      .dn-note-sources summary{cursor:pointer;}
      .dn-source-row{display:flex;align-items:center;gap:8px;margin:6px 0;}
      .dn-link{border:0;background:transparent;color:#5b83ff;font:inherit;cursor:pointer;text-align:left;padding:2px 0;}
      .dn-link:hover{text-decoration:underline;}
      .dn-answer-action{display:inline-flex;align-items:center;gap:4px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:calc(var(--dn-fs,13px) * 0.846);cursor:pointer;padding:3px 5px;border-radius:4px;}
      .dn-answer-action:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
      .dn-answer-action svg{width:15px;height:15px;}
      .dn-modal-shade{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:#0005;padding:24px;color:var(--dsw-alias-label-primary);font-size:13px;}
      .dn-modal{display:flex;flex-direction:column;width:min(620px,100%);max-height:85vh;box-sizing:border-box;padding:20px;gap:14px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-base);box-shadow:0 16px 60px #0003;}
      .dn-modal-heading{display:flex;align-items:center;gap:12px;}
      .dn-modal-heading h2{font-size:16px;line-height:1.5;margin:0;flex:1;}
      .dn-modal-main{min-height:0;overflow:auto;display:flex;flex-direction:column;gap:12px;}
      .dn-modal label{display:flex;flex-direction:column;gap:6px;font-size:12px;}
      .dn-modal input,.dn-modal select{box-sizing:border-box;width:100%;height:32px;border:1px solid var(--dsw-alias-border-l1);border-radius:5px;padding:0 8px;background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;}
      .dn-modal-actions{display:flex;justify-content:flex-end;align-items:center;gap:8px;}
      .dn-modal-primary{border:0;border-radius:5px;padding:7px 16px;background:#5b83ff;color:white;font:inherit;cursor:pointer;}
      .dn-modal button:disabled{opacity:.5;cursor:default;}
      .dn-modal-hint{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6;margin:0;}
      .dn-modal-error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:1.5;white-space:pre-wrap;}
      .dn-modal-preview{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:12px;line-height:1.6;max-height:240px;overflow:auto;padding:10px;background:var(--dsw-alias-bg-layer-1);border-radius:6px;}
      .dn-modal-result{font-size:13px;line-height:1.6;}
      .dn-modal-result .dn-preview{padding:0;}
      .dn-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:40px 16px;color:var(--dsw-alias-label-secondary);text-align:center;font-size:calc(var(--dn-fs,13px) * 0.923);}
      .dn-editorpane{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0;background:var(--dsw-alias-bg-base);}
      .dn-editorbody{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0;}
      .dn-edhead{display:flex;align-items:center;gap:8px;padding:12px 18px 6px;}
      .dn-title{flex:1;min-width:0;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:calc(var(--dn-fs,13px) * 1.462);font-weight:600;line-height:1.4;outline:none;padding:0;}
      .dn-title::placeholder{color:var(--dsw-alias-label-secondary);}
      .dn-edactions{display:flex;align-items:center;gap:4px;flex:none;}
      .dn-iconbtn{display:inline-flex;align-items:center;justify-content:center;gap:4px;height:26px;min-width:26px;padding:0 7px;border-radius:6px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:calc(var(--dn-fs,13px) * 0.885);cursor:pointer;}
      .dn-iconbtn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
      .dn-iconbtn.on{color:var(--dsw-alias-state-warn-primary);}
      .dn-iconbtn.danger:hover{color:var(--dsw-alias-state-error-primary);}
      .dn-edsub{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:2px 18px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);}
      .dn-edtags{display:flex;align-items:center;gap:4px;flex-wrap:wrap;}
      .dn-edtag{display:inline-flex;align-items:center;gap:3px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:0 6px;font-size:calc(var(--dn-fs,13px) * 0.846);color:var(--dsw-alias-label-secondary);line-height:1.7;}
      .dn-edtag button{border:0;background:transparent;color:inherit;cursor:pointer;padding:0;font:inherit;opacity:.65;}
      .dn-edtag button:hover{opacity:1;color:var(--dsw-alias-state-error-primary);}
      .dn-taginput{width:88px;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:calc(var(--dn-fs,13px) * 0.885);outline:none;padding:2px 0;}
      .dn-taginput::placeholder{color:var(--dsw-alias-label-secondary);}
      .dn-spacer{flex:1;}
      .dn-status{font-size:calc(var(--dn-fs,13px) * 0.846);color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;}
      .dn-status.err{color:var(--dsw-alias-state-error-primary);}
      .dn-modes{display:inline-flex;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;overflow:hidden;}
      .dn-mode{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:calc(var(--dn-fs,13px) * 0.846);padding:3px 8px;cursor:pointer;}
      .dn-mode.on{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600;}
      .dn-toolbar{display:flex;align-items:center;gap:2px;flex-wrap:wrap;padding:6px 14px;border-bottom:1px solid var(--dsw-alias-border-l1);}
      .dn-tool{min-width:26px;height:26px;padding:0 4px;border-radius:5px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font:inherit;font-size:calc(var(--dn-fs,13px) * 0.923);white-space:nowrap;line-height:1;}
      .dn-tool:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
      .dn-toolsep{width:1px;height:16px;background:var(--dsw-alias-border-l1);margin:0 4px;}
      .dn-body{flex:1;min-height:0;display:flex;}
      .dn-source{flex:1;min-width:0;border:0;outline:none;resize:none;background:transparent;color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:calc(var(--dn-fs,13px) * 0.962);line-height:1.75;padding:14px 18px;tab-size:2;}
      .dn-preview{flex:1;min-width:0;overflow-y:auto;padding:6px 22px 40px;line-height:1.75;font-size:calc(var(--dn-fs,13px) * 1.038);scrollbar-width:thin;}
      .dn-body.split .dn-source{flex:1 1 50%;}
      .dn-body.split .dn-preview{flex:1 1 50%;border-left:1px solid var(--dsw-alias-border-l1);}
      .dn-preview h1,.dn-preview h2,.dn-preview h3,.dn-preview h4{margin:18px 0 8px;line-height:1.35;font-weight:600;}
      .dn-preview h1{font-size:calc(var(--dn-fs,13px) * 1.615);} .dn-preview h2{font-size:calc(var(--dn-fs,13px) * 1.385);} .dn-preview h3{font-size:calc(var(--dn-fs,13px) * 1.192);} .dn-preview h4{font-size:calc(var(--dn-fs,13px) * 1.077);}
      .dn-preview p{margin:8px 0;}
      .dn-preview ul,.dn-preview ol{margin:8px 0;padding-left:22px;}
      .dn-preview li{margin:3px 0;}
      .dn-preview blockquote{margin:10px 0;padding:6px 12px;border-left:3px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border-radius:0 6px 6px 0;}
      .dn-preview code{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:calc(var(--dn-fs,13px) * 0.923);background:var(--dsw-alias-bg-layer-2);padding:1px 5px;border-radius:4px;}
      .dn-preview pre.dn-code{margin:10px 0;padding:10px 12px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;overflow:auto;}
      .dn-preview pre.dn-code code{background:transparent;padding:0;font-size:calc(var(--dn-fs,13px) * 0.923);line-height:1.6;}
      .dn-preview hr{border:0;border-top:1px solid var(--dsw-alias-border-l1);margin:16px 0;}
      .dn-preview a{color:var(--dsw-alias-brand-primary);text-decoration:none;}
      .dn-preview a:hover{text-decoration:underline;}
      .dn-preview .dn-tasks{list-style:none;padding-left:2px;}
      .dn-task{display:flex;align-items:flex-start;gap:6px;}
      .dn-check{flex:none;width:14px;height:14px;margin-top:4px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;font-size:calc(var(--dn-fs,13px) * 0.769);line-height:14px;text-align:center;color:var(--dsw-alias-label-primary-foreground,#fff);}
      .dn-task-done .dn-check{background:var(--dsw-alias-state-success-primary);border-color:transparent;}
      .dn-task-done > span:last-child{color:var(--dsw-alias-label-secondary);text-decoration:line-through;}
      .dn-todo-row{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border-radius:8px;border:1px solid transparent;}
      .dn-todo-row button.dn-check{padding:0;cursor:pointer;background:transparent;font:inherit;font-size:calc(var(--dn-fs,13px) * 0.769);line-height:14px;}
      .dn-todo-row button:disabled{opacity:.5;cursor:wait;}
      .dn-todo-row:hover{background:var(--dsw-alias-bg-layer-2);}
      .dn-todo-text{flex:1;min-width:0;font-size:calc(var(--dn-fs,13px) * 0.962);line-height:1.45;word-break:break-word;}
      .dn-todo-row.done .dn-todo-text{color:var(--dsw-alias-label-secondary);text-decoration:line-through;}
      .dn-todo-row.done button.dn-check{background:var(--dsw-alias-state-success-primary);border-color:transparent;}
      .dn-todo-src{display:block;color:var(--dsw-alias-label-secondary);font-size:calc(var(--dn-fs,13px) * 0.808);margin-top:2px;border:0;padding:0;background:transparent;text-align:left;cursor:pointer;}
      .dn-hdrbtn{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 9px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:calc(var(--dn-fs,13px) * 0.885);cursor:pointer;white-space:nowrap;}
      .dn-hdrbtn:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-secondary);}
      .dn-hdrbtn.ok{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 45%,transparent);}
      .dn-hdrbtn.err{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,transparent);}
      @container (max-width: 900px){.dn-listpane{width:220px;}}
      .dn-set{display:flex;flex-direction:column;padding:4px 0 24px;max-width:760px;container-type:inline-size;}
      .dn-set-row{display:flex;flex-direction:column;gap:8px;padding:14px 2px;border-bottom:1px solid var(--dsw-alias-border-l1);}
      .dn-set-row:last-of-type{border-bottom:0;}
      .dn-set-main{min-width:0;display:flex;flex-direction:column;gap:3px;}
      .dn-set-label{font-size:13.5px;line-height:1.4;color:var(--dsw-alias-label-primary);}
      .dn-set-desc{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary);word-break:break-word;}
      .dn-set-control{display:flex;align-items:center;gap:8px;min-width:0;}
      .dn-set-input{flex:1;min-width:0;max-width:430px;height:30px;padding:0 10px;border-radius:7px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;outline:none;}
      .dn-set-input:focus{border-color:var(--dsw-alias-brand-primary);}
      .dn-set-btn{height:30px;padding:0 14px;border-radius:7px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap;flex:none;}
      .dn-set-btn:hover{border-color:var(--dsw-alias-label-secondary);}
      .dn-set-btn:disabled{opacity:.5;cursor:wait;}
      .dn-set-btn.primary{background:var(--dsw-alias-brand-primary);border-color:transparent;color:#fff;font-weight:600;}
      .dn-set-btn.primary:hover{filter:brightness(1.06);}
      .dn-set-stat{font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;}
      .dn-set-seg{display:inline-flex;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;padding:2px;background:var(--dsw-alias-bg-layer-2);}
      .dn-set-seg button{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:1.5;padding:3px 12px;border-radius:5px;cursor:pointer;white-space:nowrap;}
      .dn-set-seg button:hover{color:var(--dsw-alias-label-primary);}
      .dn-set-seg button.on{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-weight:600;}
      .dn-set-seg button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;}
      .dn-set-msg{padding:10px 2px 0;font-size:12px;color:var(--dsw-alias-label-secondary);}
      .dn-set-msg.ok{color:var(--dsw-alias-state-success-primary);}
      .dn-set-msg.err{color:var(--dsw-alias-state-error-primary);}
      @container (min-width: 640px){
        .dn-set-row{flex-direction:row;align-items:center;gap:16px;}
        .dn-set-main{flex:1;}
        .dn-set-control{flex:none;}
        .dn-set-input{width:300px;flex:none;}
        .dn-set-stat{text-align:right;}
      }
    `

    // ----------------------------------------------------------------- icons
    function svg(paths, size) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size ?? 18,
          height: size ?? 18,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        paths.map((path, index) => h('path', { key: index, d: path })),
      )
    }

    const ICONS = {
      all: () => svg(['M4 5h16', 'M4 12h16', 'M4 19h10']),
      recent: () => svg(['M12 7v5l3 2', 'M21 12a9 9 0 1 1-3.2-6.9']),
      todos: () => svg(['M4 6h7', 'M4 12h7', 'M4 18h7', 'M15 6l2 2 3-3', 'M15 15l2 2 3-3']),
      starred: () => svg(['M12 4l2.4 5 5.6.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.6-.8z']),
      tags: () => svg(['M4 12V5a1 1 0 0 1 1-1h7l8 8-8 8-8-8z', 'M8.5 8.5h.01']),
      note: (size) => svg(['M6 3h9l4 4v14H6z', 'M15 3v4h4', 'M9 12h7', 'M9 16h5'], size),
      plus: () => svg(['M12 5v14', 'M5 12h14']),
      search: () => svg(['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3']),
      pin: () => svg(['M12 17v5', 'M8 3h8l-1 6 3 4H6l3-4-1-6z']),
      trash: () => svg(['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 14h10l1-14']),
      copy: () => svg(['M9 9h10v12H9z', 'M5 3h10v2', 'M5 3v12h2']),
      check: () => svg(['M4 12l5 5L20 6']),
      deposit: (size) => svg(['M6 3h9l4 4v14H6z', 'M12 10v7', 'M9 14l3 3 3-3'], size),
      refresh: () => svg(['M3 12a9 9 0 0 1 15-6.7L21 8', 'M21 4v4h-4', 'M21 12a9 9 0 0 1-15 6.7L3 16', 'M3 20v-4h4']),
      folder: () => svg(['M3 7V5h6l2 2h10v13H3z']),
      chevron: () => svg(['M9 5l7 7-7 7']),
      summary: () => svg(['M4 5h16', 'M4 10h16', 'M4 15h16', 'M4 20h10']),
      tree: () => svg(['M4 4v16h5', 'M4 9h5', 'M12 6h8v6h-8z', 'M12 17h8v5h-8z']),
      sort: () => svg(['M4 5h12', 'M4 11h9', 'M4 17h6', 'M19 4v16', 'M16 17l3 3 3-3']),
      collapse: () => svg(['M4 4h12v12H4z', 'M8 20h12V8', 'M7 10h6']),
    }

    function readPreference(key, fallback) {
      try { return JSON.parse(localStorage.getItem('dsh-note:' + key)) ?? fallback } catch { return fallback }
    }

    function usePreference(key, fallback) {
      const [value, setValue] = useState(() => readPreference(key, fallback))
      useEffect(() => {
        try { localStorage.setItem('dsh-note:' + key, JSON.stringify(value)) } catch { /* Storage may be disabled. */ }
      }, [key, value])
      return [value, setValue]
    }

    /** Text sizes the notes page offers; everything else derives from this base. */
    const FONT_SIZES = [12, 13, 14.5, 16]
    const DEFAULT_FONT_SIZE = 13

    function clampFontSize(value) {
      const size = Number(value)
      return FONT_SIZES.includes(size) ? size : DEFAULT_FONT_SIZE
    }

    function currentFontSize() {
      return clampFontSize(readPreference('fontSize', DEFAULT_FONT_SIZE))
    }

    /** Persist the choice and let an open notes page restyle without a reload. */
    function applyFontSize(size) {
      const next = clampFontSize(size)
      try { localStorage.setItem('dsh-note:fontSize', JSON.stringify(next)) } catch { /* Storage may be disabled. */ }
      window.dispatchEvent(new CustomEvent('dsh-note:font-size', { detail: next }))
    }

    function parentFolder(id) {
      return id.includes('/') ? id.slice(0, id.lastIndexOf('/')) : ''
    }

    /** One plugin-owned bridge; Harness remains the owner of sessions, drafts and navigation. */
    function createIntegrationBridge(ctx) {
      let state = { modal: null, noteId: null, openRequest: 0, revision: 0 }
      const listeners = new Set()
      let sequence = 0
      let alive = true
      const emit = (patch) => {
        if (!alive) return
        state = { ...state, ...patch }
        for (const listener of listeners) listener()
      }
      const bridge = {
        getSnapshot: () => state,
        subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
        sessions: () => ctx.sessions.list.getSnapshot(),
        currentSession: () => Object.values(ctx.sessions.list.getSnapshot().byId).find((row) => (row.retainedBy?.mainView ?? 0) > 0),
        sessionLabel: (id) => ctx.sessions.list.getSnapshot().byId[id]?.displayTitle || id,
        selectNote: (id) => emit({ noteId: id }),
        changed: () => {
          emit({ revision: state.revision + 1 })
          window.dispatchEvent(new CustomEvent('dsh-note:changed'))
        },
        show: (kind, data = {}) => emit({ modal: { ...data, kind, key: ++sequence } }),
        close: () => emit({ modal: null }),
        error: (error) => bridge.show('error', { error: String(error?.message ?? error) }),
        async openNote(id) {
          try {
            await api('get', { id })
            if (!alive) return
            emit({ noteId: id, modal: null, openRequest: state.openRequest + 1, revision: state.revision + 1 })
            ctx.layout.selectPanel('dsh-note')
          } catch (error) { bridge.error(error) }
        },
        async openSource(source) {
          try {
            await ctx.sessions.using(source.sessionId, { source: 'dsh-note' }, async (reference) => {
              await reference.ready
              if (!alive) return
              ctx.uiWorkspace.openSession(source.sessionId)
              if (source.messageId) bridge.show('source', source)
              else bridge.show('links', { sessionId: source.sessionId })
            })
          } catch (error) { bridge.error(error) }
        },
        async addReference(targetId, prepared) {
          const insert = (reference) => {
            if (!alive) throw new Error('笔记插件已卸载')
            const source = ctx.uiSession.bindingSource(reference).getSnapshot()
            const input = source.props.inputActions
            if (!input) throw new Error('Harness 会话输入接口尚未就绪')
            const span = input.captureInsertion()
            if (!input.insertText(prepared.prompt, { ...span, start: span.end })) throw new Error(translate('link.blocked'))
            input.persistDraft()
          }
          const record = async (sessionId) => {
            let linkFailure = null
            try {
              await api('recordReference', { id: prepared.note.id, sessionId, referenceId: prepared.referenceId,
                revision: prepared.revision, scope: prepared.scope })
              bridge.changed()
            } catch (error) { linkFailure = error }
            if (!alive) return
            if (linkFailure) {
              const scope = ctx.sessions.scope(sessionId)
              if (scope) ctx.conversation.input.for(scope).notify('error', '已加入草稿，但关联记录保存失败：' + linkFailure.message)
            }
          }
          if (targetId === 'new') {
            const current = bridge.currentSession()
            const workspaces = ctx.get('workspaces')?.list.getSnapshot().items ?? []
            const workspace = workspaces.find((item) => item.sessionIds.includes(current?.id))
              || workspaces.find((item) => item.path === current?.cwd)
              || (workspaces.length === 1 ? workspaces[0] : undefined)
            if (!workspace) throw new Error('请先在 Harness 中选择工作区，再新建对话')
            let selectedId
            await ctx.uiWorkspace.openWorkspace(workspace.workspaceId, (sessionId) => {
              const reference = ctx.sessions.retain(sessionId, { source: 'dsh-note' })
              try { insert(reference); selectedId = sessionId } finally { reference.release() }
            })
            if (!selectedId) throw new Error('导航已取消，笔记内容仍保留在此窗口')
            bridge.close()
            await record(selectedId)
          } else {
            const signal = ctx.layout.beginNavigation()
            await ctx.sessions.using(targetId, { source: 'dsh-note', signal }, async (reference) => {
              await reference.ready
              signal.throwIfAborted()
              insert(reference)
              ctx.uiWorkspace.openSession(targetId)
              bridge.close()
              await record(targetId)
            })
          }
        },
        dispose: () => { alive = false; listeners.clear() },
      }
      return bridge
    }

    function useBridge(bridge) {
      const [snapshot, setSnapshot] = useState(bridge.getSnapshot)
      useEffect(() => {
        const update = () => setSnapshot(bridge.getSnapshot())
        const dispose = bridge.subscribe(update)
        update()
        return dispose
      }, [bridge])
      return snapshot
    }

    /** Recent means last updated; pin ordering does not change membership in that list. */
    function filterNotes(notes, { view, activeTag, query, sort }) {
      let result = notes
      if (view === 'starred') result = result.filter((note) => note.starred)
      else if (view === 'recent') result = [...result].sort((a, b) => String(b.updated).localeCompare(String(a.updated))).slice(0, 15)
      else if (view === 'tag' && activeTag) result = result.filter((note) => note.tags.includes(activeTag))
      const needle = query.trim().toLowerCase()
      if (needle) result = result.filter((note) => (note.title + '\n' + note.content).toLowerCase().includes(needle))
      return sort === 'title' ? [...result].sort((a, b) => a.title.localeCompare(b.title, 'zh-CN', { numeric: true })) : result
    }

    function filterTodos(todos, notes, query) {
      const needle = query.trim().toLowerCase()
      if (!needle) return todos
      const byId = new Map(notes.map((note) => [note.id, note]))
      return todos.filter((todo) => [plainInline(todo.text), todo.noteTitle, ...(byId.get(todo.noteId)?.tags ?? [])].join('\n').toLowerCase().includes(needle))
    }

    /** Own editable fields, sequential saves and clean-only adoption of refreshed note content. */
    function createEditorDraft(note, save) {
      let baseline = note
      let revision = note.revision
      let version = 0
      let savedVersion = 0
      let pending = null
      const listeners = new Set()
      let state = { title: note.title, content: note.content, tags: note.tags, status: 'saved', savedAt: note.updated, error: '' }
      const publish = (patch) => {
        state = { ...state, ...patch }
        for (const listener of listeners) listener()
      }
      const draft = {
        getSnapshot: () => state,
        subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
        dirty: () => version !== savedVersion,
        edit(patch) { version += 1; publish({ ...patch, status: 'dirty', error: '' }) },
        sync(next, force = false) {
          if (!force && (draft.dirty() || pending)) return
          baseline = next
          revision = next.revision
          savedVersion = version
          if (state.title !== next.title || state.content !== next.content || JSON.stringify(state.tags) !== JSON.stringify(next.tags)
            || state.savedAt !== next.updated || state.status !== 'saved') {
            publish({ title: next.title, content: next.content, tags: next.tags, savedAt: next.updated, status: 'saved', error: '' })
          }
        },
        flush() {
          if (pending) return pending
          if (!draft.dirty()) return Promise.resolve()
          pending = (async () => {
            while (draft.dirty()) {
              const capturedVersion = version
              const { title, content, tags } = state
              publish({ status: 'saving', error: '' })
              try {
                const result = await save({ id: baseline.id, title, content, tags, expectedRevision: revision })
                baseline = result.note
                revision = result.revision
                savedVersion = capturedVersion
                publish({ status: draft.dirty() ? 'dirty' : 'saved', savedAt: result.note.updated })
              } catch (error) {
                publish({ status: 'error', error: String(error?.message ?? error) })
                throw error
              }
            }
          })().finally(() => { pending = null })
          return pending
        },
      }
      return draft
    }

    /** The same overlay hosts save, provenance and draft choices without a second chat implementation. */
    function IntegrationDialog({ bridge, modal }) {
      const t = useT()
      const [data, setData] = useState(null)
      const [error, setError] = useState(modal.error || '')
      const [busy, setBusy] = useState(false)
      const [result, setResult] = useState(null)
      const [target, setTarget] = useState(() => bridge.currentSession()?.id || 'new')
      const [saveMode, setSaveMode] = useState('create')
      const [title, setTitle] = useState('')
      const [folder, setFolder] = useState('')
      const [targetNote, setTargetNote] = useState('')
      const [loadKey, setLoadKey] = useState(0)
      const dialog = useRef(null)
      const alive = useRef(true)
      useEffect(() => {
        const previous = document.activeElement
        const root = dialog.current
        const focus = root.querySelector('input,select,button')
        focus?.focus()
        const onKey = (event) => {
          if (event.key === 'Escape' && !busy) { event.preventDefault(); bridge.close() }
          if (event.key !== 'Tab') return
          const controls = [...root.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')]
          const first = controls[0], last = controls.at(-1)
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
        }
        root.addEventListener('keydown', onKey)
        return () => { root.removeEventListener('keydown', onKey); if (previous?.isConnected) previous.focus() }
      }, [bridge, busy])
      useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
      useEffect(() => {
        let current = true
        const load = async () => {
          try {
            let next
            if (modal.kind === 'join') next = await api('prepareReference', { id: modal.noteId, selectedText: modal.selectedText })
            else if (modal.kind === 'save') {
              const [answer, vault] = await Promise.all([api('answer', modal), api('list')])
              next = { ...answer, ...vault }
            } else if (modal.kind === 'source') next = await api('answer', modal)
            else if (modal.kind === 'links') next = await api('links', modal)
            else next = {}
            if (!current) return
            setData(next)
            if (next.answer) setTitle(next.answer.title)
          } catch (failure) { if (current) setError(String(failure?.message ?? failure)) }
        }
        load()
        return () => { current = false }
      }, [modal, loadKey])
      const run = async () => {
        if (busy || !data) return
        setBusy(true)
        setError('')
        try {
          if (modal.kind === 'join') await bridge.addReference(target, data)
          else {
            const selected = data.notes.find((note) => note.id === targetNote)
            const saved = await api('saveAnswer', { sessionId: modal.sessionId, messageId: modal.messageId,
              ...(saveMode === 'append' ? { targetId: targetNote, expectedRevision: selected?.revision } : { title, folder }) })
            bridge.changed()
            if (alive.current) setResult(saved)
          }
        } catch (failure) {
          if (alive.current) {
            setError(String(failure?.message ?? failure))
            if (modal.kind === 'save') { setData(null); setLoadKey((value) => value + 1) }
          }
        } finally { if (alive.current) setBusy(false) }
      }
      const label = modal.kind === 'join' ? t('link.join') : modal.kind === 'save' ? t('link.saveAnswer')
        : modal.kind === 'source' ? t('link.source') : modal.kind === 'links' ? t('link.related') : t('page.saveFailed')
      const sessionList = bridge.sessions()
      const options = sessionList.ids.map((id) => sessionList.byId[id]).filter((row) => row.origin !== 'subagent')
      const current = bridge.currentSession()?.id
      const field = (label, control) => h('label', null, label, control)
      return h('div', { className: 'dn-modal-shade' },
        h('div', { className: 'dn-modal', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'dn-integration-title', ref: dialog },
          h('div', { className: 'dn-modal-heading' }, h('h2', { id: 'dn-integration-title' }, label),
            h('button', { className: 'dn-iconbtn', disabled: busy, onClick: bridge.close }, t('link.close'))),
          h('div', { className: 'dn-modal-main' },
            error ? h('div', { className: 'dn-modal-error', role: 'alert' }, error) : null,
            !data && !error ? h('p', { className: 'dn-modal-hint' }, t('link.loading')) : null,
            result ? h('div', { className: 'dn-modal-result', role: 'status' },
              h('p', null, result.existing ? t('link.existing') : t('link.saved')),
              h('button', { className: 'dn-modal-primary', onClick: () => bridge.openNote(result.note.id) }, t('link.openNote') + ' · ' + result.note.title),
            ) : data && modal.kind === 'join' ? h(React.Fragment, null,
              h('p', { className: 'dn-modal-hint' }, data.note.title + ' · ' + t(modal.selectedText ? 'link.selection' : 'link.full')),
              field(t('link.join'), h('select', { value: target, onChange: (event) => setTarget(event.target.value), disabled: busy },
                h('option', { value: 'new' }, t('link.newSession')),
                options.map((row) => h('option', { key: row.id, value: row.id }, (row.id === current ? t('link.current') + ' · ' : '') + row.displayTitle)),
              )),
              h('p', { className: 'dn-modal-hint' }, t('link.draftHint')),
              h('p', { className: 'dn-modal-hint' }, t('link.snapshotHint')),
              data.truncated ? h('p', { className: 'dn-modal-error' }, t('link.truncated')) : null,
              h('details', null, h('summary', null, t('page.preview')), h('pre', { className: 'dn-modal-preview' }, data.prompt)),
            ) : data && modal.kind === 'save' ? h(React.Fragment, null,
              field(t('link.save'), h('select', { value: saveMode, disabled: busy, onChange: (event) => setSaveMode(event.target.value) },
                h('option', { value: 'create' }, t('link.createNote')), h('option', { value: 'append' }, t('link.appendNote')))),
              saveMode === 'create' ? h(React.Fragment, null,
                field(t('link.title'), h('input', { value: title, disabled: busy, onChange: (event) => setTitle(event.target.value) })),
                field(t('link.folder'), h('select', { value: folder, disabled: busy, onChange: (event) => setFolder(event.target.value) },
                  h('option', { value: '' }, t('page.allNotes')), data.folders.map((item) => h('option', { key: item.path, value: item.path }, item.path)))),
              ) : field(t('link.target'), h('select', { value: targetNote, disabled: busy, onChange: (event) => setTargetNote(event.target.value) },
                h('option', { value: '' }, t('link.target')), data.notes.map((note) => h('option', { key: note.id, value: note.id }, note.title + (parentFolder(note.id) ? ' · ' + parentFolder(note.id) : ''))))),
              h('pre', { className: 'dn-modal-preview' }, data.answer.content),
            ) : data && modal.kind === 'source' ? h(React.Fragment, null,
              h('p', { className: 'dn-modal-hint' }, bridge.sessionLabel(modal.sessionId) + ' · Turn ' + data.answer.turn + ' · ' + new Date(data.answer.time).toLocaleString()),
              h('div', { className: 'dn-modal-result' }, h('div', { className: 'dn-preview', dangerouslySetInnerHTML: { __html: renderMarkdown(data.answer.content) } })),
            ) : data && modal.kind === 'links' ? h(React.Fragment, null,
              h('p', { className: 'dn-modal-hint' }, bridge.sessionLabel(modal.sessionId)),
              data.notes.length === 0 ? h('p', null, t('link.noNotes')) : data.notes.map((note) => h('button', { key: note.id, className: 'dn-link', onClick: () => bridge.openNote(note.id) }, note.title)),
            ) : null,
          ),
          !result && data && ['join', 'save'].includes(modal.kind) ? h('div', { className: 'dn-modal-actions' },
            h('button', { className: 'dn-modal-primary', onClick: run, disabled: busy || (modal.kind === 'save' && (saveMode === 'append' ? !targetNote : !title.trim())) }, busy ? t('page.saving') : t(modal.kind === 'join' ? 'link.join' : 'link.save')),
          ) : null,
        ),
      )
    }

    function IntegrationOverlay({ bridge }) {
      const { modal } = useBridge(bridge)
      return modal ? h(IntegrationDialog, { key: modal.key, bridge, modal }) : null
    }

    function AnswerSaveAction({ bridge, sessionId, messageId }) {
      return h('button', { className: 'dn-answer-action', title: translate('link.saveAnswer'), onClick: () => bridge.show('save', { sessionId, messageId }) }, ICONS.deposit(), h('span', null, translate('link.saveAnswer')))
    }

    function RelatedNotesAction({ bridge, sessionId }) {
      return h('button', { className: 'dn-hdrbtn', onClick: () => bridge.show('links', { sessionId }) }, ICONS.note(14), h('span', null, translate('link.related')))
    }

    function NoteReference({ bridge, node, interactive, raw }) {
      return interactive ? h('button', { className: 'dn-link', onClick: () => bridge.openNote(node.data.noteId) }, node.data.label) : h('span', null, node.data.label || raw)
    }

    /** Build the hierarchy from actual vault directories; filters retain ancestors. */
    function noteTree(notes, folders, includeEmpty = true) {
      const root = { path: '', folders: [], notes: [] }
      const nodes = new Map([['', root]])
      const ensure = (path) => {
        if (nodes.has(path)) return nodes.get(path)
        const node = { path, name: path.split('/').pop(), folders: [], notes: [] }
        nodes.set(path, node)
        ensure(parentFolder(path)).folders.push(node)
        return node
      }
      if (includeEmpty) for (const folder of folders) ensure(folder.path)
      for (const note of notes) ensure(parentFolder(note.id)).notes.push(note)
      for (const node of nodes.values()) node.folders.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }))
      return root
    }

    function NoteTree(props) {
      const { notes, folders, selectedId, expanded, onExpand, onSelect, onFolder, onCreate, filtered, t } = props
      const root = useMemo(() => noteTree(notes, folders, !filtered), [notes, folders, filtered])
      const [focused, setFocused] = useState(null)
      const treeRef = useRef(null)
      const visiblePaths = []
      const collect = (branch) => {
        for (const folder of branch.folders) {
          visiblePaths.push(folder.path)
          if (filtered || expanded.includes(folder.path)) collect(folder)
        }
        visiblePaths.push(...branch.notes.map((note) => note.id))
      }
      collect(root)
      const tabStop = visiblePaths.includes(focused) ? focused : visiblePaths.includes(selectedId) ? selectedId : visiblePaths[0]
      const focus = (element) => {
        if (element) {
          setFocused(element.dataset.path)
          element.focus()
        }
      }
      const onKeyDown = (event) => {
        if (event.target !== event.currentTarget) return
        const node = event.currentTarget
        const visible = [...treeRef.current.querySelectorAll('.dn-tree-node')]
        const index = visible.indexOf(node)
        const path = node.dataset.path
        const folder = node.dataset.kind === 'folder'
        const open = folder && (filtered || expanded.includes(path))
        switch (event.key) {
          case 'ArrowDown': focus(visible[index + 1]); break
          case 'ArrowUp': focus(visible[index - 1]); break
          case 'Home': focus(visible[0]); break
          case 'End': focus(visible[visible.length - 1]); break
          case 'ArrowRight':
            if (folder && !open) onExpand(path, true)
            else if (folder) focus(node.querySelector('.dn-tree-node'))
            break
          case 'ArrowLeft':
            if (open && !filtered) onExpand(path, false)
            else focus(visible.find((item) => item.dataset.kind === 'folder' && item.dataset.path === parentFolder(path)))
            break
          case 'Enter':
          case ' ':
            if (folder) { onFolder(path); onExpand(path, !open) }
            else onSelect(path)
            break
          default: return
        }
        event.preventDefault()
        event.stopPropagation()
      }
      const nodeProps = (path, level, folder) => ({
        className: 'dn-tree-node', role: 'treeitem', 'data-path': path, 'data-kind': folder ? 'folder' : 'note',
        'aria-level': level + 1, 'aria-selected': !folder && selectedId === path,
        tabIndex: tabStop === path ? 0 : -1,
        onFocus: (event) => { if (event.target === event.currentTarget) setFocused(path) },
        onKeyDown,
      })
      const render = (branch, level) => [
        ...branch.folders.map((folder) => {
          const open = filtered || expanded.includes(folder.path)
          return h('li', { key: 'folder:' + folder.path, ...nodeProps(folder.path, level, true), 'aria-expanded': open },
            h('div', { className: 'dn-tree-line', style: { '--dn-level': level }, onClick: () => { onFolder(folder.path); onExpand(folder.path, !open) } },
              h('span', { className: 'dn-tree-caret' + (open ? ' open' : '') }, ICONS.chevron()),
              h('span', { className: 'dn-tree-icon' }, ICONS.folder()),
              h('span', { className: 'dn-tree-label', title: folder.path }, folder.name),
              h('button', { className: 'dn-listaction dn-folder-add', title: t('page.newInFolder'), onClick: (event) => { event.stopPropagation(); onCreate(folder.path) } }, ICONS.plus()),
            ),
            open ? h('ul', { role: 'group', style: { '--dn-level': level } }, render(folder, level + 1)) : null,
          )
        }),
        ...branch.notes.map((note) => h('li', { key: 'note:' + note.id, ...nodeProps(note.id, level, false) },
          h('div', { className: 'dn-tree-line', style: { '--dn-level': level }, onClick: () => onSelect(note.id) },
            h('span', { className: 'dn-tree-caret' }),
            h('span', { className: 'dn-tree-icon' }, ICONS.note()),
            h('span', { className: 'dn-tree-label', title: note.title }, note.title),
            note.pinned ? h('span', { className: 'dn-pin', title: t('page.pin') }, ICONS.pin()) : null,
            note.starred ? h('span', { className: 'dn-pin', title: t('page.star') }, ICONS.starred()) : null,
          ),
        )),
      ]
      return h('ul', { className: 'dn-tree', role: 'tree', 'aria-label': t('page.allNotes'), ref: treeRef }, render(root, 0))
    }

    // ------------------------------------------------------------ list pane
    function NoteRow(props) {
      const { note, selected, onSelect, t } = props
      return h(
        'li',
        { className: 'dn-row' + (selected ? ' on' : ''), onClick: () => onSelect(note.id) },
        h(
          'div',
          { className: 'dn-row-top' },
          h('span', { className: 'dn-row-title', title: note.title }, note.title),
          note.pinned ? h('span', { className: 'dn-pin', title: t('page.pin') }, ICONS.pin()) : null,
          note.starred ? h('span', { className: 'dn-pin', title: t('page.star') }, ICONS.starred()) : null,
        ),
        note.excerpt ? h('div', { className: 'dn-row-excerpt' }, note.excerpt) : null,
        h(
          'div',
          { className: 'dn-row-meta' },
          h('span', null, formatDay(note.updated)),
          note.tags.length > 0 ? h('span', null, '· ' + note.tags.slice(0, 3).join(' / ')) : null,
        ),
      )
    }

    function formatDay(iso) {
      if (typeof iso !== 'string' || iso === '') return ''
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return iso.slice(0, 10)
      const now = new Date()
      const sameYear = date.getFullYear() === now.getFullYear()
      const pad = (n) => String(n).padStart(2, '0')
      return sameYear ? pad(date.getMonth() + 1) + '-' + pad(date.getDate()) : date.getFullYear() + '-' + pad(date.getMonth() + 1)
    }

    function formatTime(iso) {
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return ''
      const pad = (n) => String(n).padStart(2, '0')
      return pad(date.getHours()) + ':' + pad(date.getMinutes())
    }

    /** Plain one-line text for compact rows that should not show markdown noise. */
    function plainInline(value) {
      return String(value ?? '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*\n]+)\*/g, '$1')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1')
        .trim()
    }

    // --------------------------------------------------------------- editor
    function Editor(props) {
      const { note, t, onChanged, onDeleted, bridge } = props
      const [draft] = useState(() => createEditorDraft(note, (input) => api('save', input)))
      const { title, content, tags, status, savedAt, error: saveError } = useBridge(draft)
      const setTitle = (value) => draft.edit({ title: value })
      const setContent = (value) => draft.edit({ content: value })
      const setTags = (value) => draft.edit({ tags: value })
      const changedRef = useRef(onChanged)
      changedRef.current = onChanged
      const [mode, setMode] = usePreference('editorMode', 'preview')
      useEffect(() => {
        if (props.startEditing) setMode('edit')
      }, [props.startEditing, setMode])
      const [tagDraft, setTagDraft] = useState('')
      const [copied, setCopied] = useState(false)
      const [flagBusy, setFlagBusy] = useState(false)
      const [actionError, setActionError] = useState('')
      const textarea = useRef(null)

      useEffect(() => {
        draft.sync(note)
      }, [draft, note])

      useEffect(() => {
        if (status !== 'dirty') return undefined
        const timer = setTimeout(() => {
          draft.flush().then(() => changedRef.current?.()).catch((error) => {
            console.warn('[dsh-note] save failed', error) // The draft retains its text and exposes the failure in the editor.
          })
        }, 650)
        return () => clearTimeout(timer)
      }, [draft, title, content, tags, status])

      useEffect(() => {
        const handle = { id: note.id, flush: async () => {
          const needsSave = draft.dirty()
          await draft.flush()
          if (needsSave) await changedRef.current?.()
        } }
        props.editorHandle.current = handle
        return () => { if (props.editorHandle.current === handle) props.editorHandle.current = null }
      }, [draft, note.id, props.editorHandle])

      const insert = (before, after = '', linePrefix = '') => {
        const element = textarea.current
        if (!element) return
        const start = element.selectionStart
        const end = element.selectionEnd
        const value = content
        if (linePrefix !== '') {
          const lineStart = value.lastIndexOf('\n', start - 1) + 1
          const next = value.slice(0, lineStart) + linePrefix + value.slice(lineStart)
          setContent(next)
          requestAnimationFrame(() => {
            element.focus()
            element.setSelectionRange(start + linePrefix.length, end + linePrefix.length)
          })
          return
        }
        const next = value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end)
        setContent(next)
        requestAnimationFrame(() => {
          element.focus()
          element.setSelectionRange(start + before.length, end + before.length)
        })
      }

      const addTag = (raw) => {
        const value = String(raw ?? '').trim().replace(/^#/, '')
        if (value === '' || tags.includes(value)) return
        setTags([...tags, value])
      }

      const removeTag = (tag) => {
        setTags(tags.filter((item) => item !== tag))
      }

      const toggleFlag = async (field) => {
        if (flagBusy) return
        setFlagBusy(true)
        setActionError('')
        try {
          await draft.flush()
          await api('save', { id: note.id, [field]: !note[field] })
          await onChanged?.()
        } catch (error) {
          setActionError(String(error?.message ?? error))
        } finally { setFlagBusy(false) }
      }

      const copyNote = async () => {
        try {
          await navigator.clipboard.writeText('# ' + title + '\n\n' + content)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          setCopied(false)
        }
      }

      const removeNote = async () => {
        if (!window.confirm(t('page.deleteConfirm'))) return
        try {
          await api('delete', { id: note.id })
          onDeleted?.()
        } catch (error) {
          console.warn('[dsh-note] delete failed', error)
        }
      }

      const joinConversation = () => {
        if (draft.dirty() || status !== 'saved') return
        let selectedText = ''
        const element = textarea.current
        if (element && element.selectionEnd > element.selectionStart) selectedText = content.slice(element.selectionStart, element.selectionEnd)
        else {
          const selection = window.getSelection()
          const preview = selection?.anchorNode?.parentElement?.closest('.dn-preview')
          if (preview && preview.contains(selection.focusNode)) selectedText = selection.toString()
        }
        bridge.show('join', { noteId: note.id, selectedText })
      }

      const statusText =
        status === 'saving'
          ? t('page.saving')
          : status === 'dirty'
            ? t('page.dirty')
            : status === 'error'
              ? t('page.saveFailed')
              : t('page.saved') + ' ' + formatTime(savedAt)

      const tools = [
        { key: 'bold', label: 'B', title: t('toolbar.bold'), run: () => insert('**', '**') },
        { key: 'italic', label: 'I', title: t('toolbar.italic'), run: () => insert('*', '*') },
        { key: 'code', label: '`', title: t('toolbar.code'), run: () => insert('`', '`') },
        { key: 'sep1', sep: true },
        { key: 'h', label: 'H2', title: t('toolbar.heading'), run: () => insert('', '', '## ') },
        { key: 'list', label: '•', title: t('toolbar.list'), run: () => insert('', '', '- ') },
        { key: 'task', label: '☑', title: t('toolbar.task'), run: () => insert('', '', '- [ ] ') },
        { key: 'quote', label: '❝', title: t('toolbar.quote'), run: () => insert('', '', '> ') },
        { key: 'sep2', sep: true },
        { key: 'codeblock', label: '</>', title: t('toolbar.codeBlock'), run: () => insert('```\n', '\n```') },
        { key: 'link', label: '🔗', title: t('toolbar.link'), run: () => insert('[', '](https://)') },
        { key: 'table', label: '▦', title: t('toolbar.table'), run: () => insert('| 列 1 | 列 2 |\n| --- | --- |\n|  |  |\n') },
      ]

      return h(
        'div',
        { className: 'dn-editorbody' },
        h(
          'div',
          { className: 'dn-edhead' },
          h('input', {
            className: 'dn-title',
            value: title,
            autoFocus: props.startEditing === true,
            onFocus: (event) => { if (props.startEditing) event.target.select() },
            placeholder: t('page.titlePlaceholder'),
            onChange: (event) => {
              setTitle(event.target.value)
            },
          }),
          h(
            'div',
            { className: 'dn-edactions' },
            h('button', { className: 'dn-hdrbtn', disabled: status !== 'saved' || draft.dirty(),
              title: status !== 'saved' ? t('link.waitSave') : t('link.join'),
              onMouseDown: (event) => event.preventDefault(), onClick: joinConversation }, t('link.join')),
            h(
              'button',
              { className: 'dn-iconbtn' + (note.starred ? ' on' : ''), title: t(note.starred ? 'page.unstar' : 'page.star'), 'aria-pressed': note.starred, disabled: flagBusy, onClick: () => toggleFlag('starred') },
              ICONS.starred(),
            ),
            h(
              'button',
              { className: 'dn-iconbtn' + (note.pinned ? ' on' : ''), title: t(note.pinned ? 'page.unpin' : 'page.pin'), 'aria-pressed': note.pinned, disabled: flagBusy, onClick: () => toggleFlag('pinned') },
              ICONS.pin(),
            ),
            h(
              'button',
              { className: 'dn-iconbtn', title: t('page.copy'), onClick: copyNote },
              copied ? ICONS.check() : ICONS.copy(),
            ),
            h('button', { className: 'dn-iconbtn danger', title: t('page.delete'), onClick: removeNote }, ICONS.trash()),
          ),
        ),
        saveError || actionError ? h('div', { className: 'dn-editor-error', role: 'alert' },
          saveError || actionError,
          saveError ? h('button', { className: 'dn-link', onClick: async () => {
            if (!window.confirm(t('page.reloadConfirm'))) return
            try {
              const result = await api('get', { id: note.id })
              draft.sync({ ...result.note, revision: result.revision }, true)
              await onChanged?.()
            } catch (error) { setActionError(String(error?.message ?? error)) }
          } }, t('page.reload')) : null,
        ) : null,
        h(
          'div',
          { className: 'dn-edsub' },
          h(
            'div',
            { className: 'dn-edtags' },
            tags.map((tag) =>
              h(
                'span',
                { className: 'dn-edtag', key: tag },
                '#' + tag,
                h('button', { onClick: () => removeTag(tag), title: '×' }, '×'),
              ),
            ),
            h('input', {
              className: 'dn-taginput',
              value: tagDraft,
              placeholder: t('page.tagsPlaceholder'),
              onChange: (event) => setTagDraft(event.target.value),
              onKeyDown: (event) => {
                if (event.key !== 'Enter' && event.key !== ',') return
                event.preventDefault()
                addTag(tagDraft)
                setTagDraft('')
              },
              onBlur: () => {
                if (tagDraft.trim() !== '') {
                  addTag(tagDraft)
                  setTagDraft('')
                }
              },
            }),
          ),
          h('span', { className: 'dn-spacer' }),
          h('span', { className: 'dn-status' + (status === 'error' ? ' err' : '') }, statusText),
          h(
            'div',
            { className: 'dn-modes' },
            h('button', { className: 'dn-mode' + (mode === 'edit' ? ' on' : ''), onClick: () => setMode('edit') }, t('page.edit')),
            h('button', { className: 'dn-mode' + (mode === 'split' ? ' on' : ''), onClick: () => setMode('split') }, t('page.split')),
            h(
              'button',
              { className: 'dn-mode' + (mode === 'preview' ? ' on' : ''), onClick: () => setMode('preview') },
              t('page.preview'),
            ),
          ),
        ),
        note.sources?.length ? h('details', { className: 'dn-note-sources' },
          h('summary', null, t('link.sources') + ' · ' + note.sources.length),
          note.sources.map((source, index) => h('div', { key: source.referenceId || source.messageId || index, className: 'dn-source-row' },
            h('span', null, t(source.kind === 'reference' ? 'link.reference' : source.kind === 'answer' ? 'link.source' : 'page.deposit')),
            h('button', { className: 'dn-link', onClick: () => bridge.openSource(source) },
              bridge.sessionLabel(source.sessionId) + (source.turn ? ' · Turn ' + source.turn : '')),
          )),
        ) : null,
        mode !== 'preview' ? h(
          'div',
          { className: 'dn-toolbar' },
          tools.map((tool, index) =>
            tool.sep
              ? h('span', { className: 'dn-toolsep', key: 'sep' + index })
              : h(
                  'button',
                  { className: 'dn-tool', key: tool.key, title: tool.title ?? tool.label, onClick: tool.run },
                  tool.label,
                ),
          ),
        ) : null,
        h(
          'div',
          { className: 'dn-body' + (mode === 'split' ? ' split' : '') },
          mode !== 'preview'
            ? h('textarea', {
                ref: textarea,
                className: 'dn-source',
                value: content,
                spellCheck: false,
                placeholder: '# 开始写…',
                onChange: (event) => {
                  setContent(event.target.value)
                },
                onKeyDown: (event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
                    event.preventDefault()
                    draft.flush().then(() => changedRef.current?.()).catch((error) => console.warn('[dsh-note] save failed', error))
                  }
                },
              })
            : null,
          mode !== 'edit'
            ? h('div', {
                className: 'dn-preview',
                dangerouslySetInnerHTML: { __html: renderMarkdown(content) },
              })
            : null,
        ),
      )
    }

    // ------------------------------------------------------------- todo pane
    function TodoPane(props) {
      const { todos, t, onToggle, onOpen, searching, busy } = props
      const groups = useMemo(() => {
        const open = todos.filter((todo) => !todo.done)
        const done = todos.filter((todo) => todo.done)
        return [open, done]
      }, [todos])
      if (todos.length === 0) {
        return h('div', { className: 'dn-empty' }, h('div', null, t(searching ? 'todos.noMatch' : 'todos.empty')))
      }
      const renderRow = (todo) =>
        h(
          'div',
          {
            className: 'dn-todo-row' + (todo.done ? ' done' : ''),
            key: todo.noteId + ':' + todo.line,
          },
          h('button', { className: 'dn-check' + (todo.done ? ' dn-check-on' : ''), role: 'checkbox', 'aria-checked': todo.done,
            'aria-label': plainInline(todo.text), disabled: busy, onClick: () => onToggle(todo) }, todo.done ? '✓' : ''),
          h(
            'div',
            { className: 'dn-todo-text' },
            plainInline(todo.text),
            h(
              'button',
              {
                className: 'dn-todo-src',
                onClick: () => onOpen(todo.noteId),
              },
              t('todos.from') + ' · ' + todo.noteTitle,
            ),
          ),
        )
      return h(
        'div',
        { key: 'todos' },
        groups[0].length > 0 ? h('div', null, groups[0].map(renderRow)) : null,
        groups[1].length > 0
          ? h('div', null, h('div', { className: 'dn-listmeta', style: { padding: '10px 10px 2px' } }, t('todos.done')), groups[1].map(renderRow))
          : null,
      )
    }

    // ------------------------------------------------------------- page shell
    function NotesPage({ bridge }) {
      const t = useT()
      const integration = useBridge(bridge)
      const [data, setData] = useState({ notes: [], folders: [], tags: [], todos: [], root: '' })
      const [view, setView] = useState('all')
      const [activeTag, setActiveTag] = useState('')
      const [query, setQuery] = useState('')
      const [selectedId, setSelectedId] = useState(() => bridge.getSnapshot().noteId)
      const [editingNewId, setEditingNewId] = useState(null)
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState('')
      const [layout, setLayout] = usePreference('listLayout', 'tree')
      const [sort, setSort] = usePreference('listSort', 'updated')
      const [expanded, setExpanded] = usePreference('expandedFolders', [])
      const [activeFolder, setActiveFolder] = useState('')
      const [folderDraft, setFolderDraft] = useState(null)
      const [folderParent, setFolderParent] = useState('')
      const [folderError, setFolderError] = useState('')
      const [creatingFolder, setCreatingFolder] = useState(false)
      const [todoBusy, setTodoBusy] = useState(false)
      const [fontSize, setFontSize] = useState(currentFontSize)
      const editorHandle = useRef(null)
      const searchRef = useRef(null)
      useEffect(() => {
        const onFontSize = (event) => setFontSize(event?.detail === undefined ? currentFontSize() : clampFontSize(event.detail))
        window.addEventListener('dsh-note:font-size', onFontSize)
        return () => window.removeEventListener('dsh-note:font-size', onFontSize)
      }, [])
      useEffect(() => {
        if (!integration.noteId) return
        setSelectedId(integration.noteId)
        setView('all')
        setQuery('')
        setActiveFolder(parentFolder(integration.noteId))
        revealFolder(parentFolder(integration.noteId))
      }, [integration.openRequest])

      const refresh = useCallback(async (keepSelection = true) => {
        try {
          const result = await api('list')
          setData(result)
          setError('')
          setSelectedId((current) => {
            const requested = bridge.getSnapshot().noteId
            if (requested && result.notes.some((note) => note.id === requested)) return requested
            if (keepSelection && current !== null && result.notes.some((note) => note.id === current)) return current
            return result.notes.length > 0 ? result.notes[0].id : null
          })
        } catch (failure) {
          setError(String(failure?.message ?? failure))
        } finally {
          setLoading(false)
        }
      }, [])

      useEffect(() => {
        refresh(false)
        const changed = () => refresh(true)
        window.addEventListener('dsh-note:changed', changed)
        const onFocus = () => refresh(true)
        window.addEventListener('focus', onFocus)
        const timer = setInterval(() => refresh(true), 20000)
        return () => {
          window.removeEventListener('dsh-note:changed', changed)
          window.removeEventListener('focus', onFocus)
          clearInterval(timer)
        }
      }, [refresh])

      useEffect(() => {
        const onKey = (event) => {
          if (!(event.metaKey || event.ctrlKey)) return
          const key = event.key.toLowerCase()
          if (key === 'k') {
            event.preventDefault()
            searchRef.current?.focus()
          }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [])

      const filtered = useMemo(() => filterNotes(data.notes, { view, activeTag, query, sort }), [data.notes, view, activeTag, query, sort])
      const filteredTodos = useMemo(() => filterTodos(data.todos, data.notes, query), [data.todos, data.notes, query])

      const selected = useMemo(
        () => data.notes.find((note) => note.id === selectedId) ?? null,
        [data.notes, selectedId],
      )

      const revealFolder = (folder) => {
        const ancestors = []
        for (let path = folder; path; path = parentFolder(path)) ancestors.push(path)
        setExpanded((current) => [...new Set([...current, ...ancestors])])
      }

      const selectNote = async (id) => {
        try {
          if (id !== selectedId) await editorHandle.current?.flush()
          setEditingNewId(null)
          setSelectedId(id)
          bridge.selectNote(id)
          setActiveFolder(parentFolder(id))
          revealFolder(parentFolder(id))
        } catch (failure) { setError(String(failure?.message ?? failure)) }
      }

      const expandFolder = (path, open) => {
        setExpanded((current) => open ? [...new Set([...current, path])] : current.filter((item) => item !== path))
      }

      const createNote = async (folder) => {
        try {
          const target = typeof folder === 'string' ? folder : activeFolder
          const result = await api('create', { title: '未命名笔记', content: '', folder: target })
          await refresh(false)
          await selectNote(result.note.id)
          setEditingNewId(result.note.id)
          setView('all')
          setQuery('')
        } catch (failure) {
          setError(String(failure?.message ?? failure))
        }
      }

      const createFolder = async (event) => {
        event.preventDefault()
        if (folderDraft?.trim() === '' || creatingFolder) return
        setCreatingFolder(true)
        setFolderError('')
        try {
          const result = await api('createFolder', { name: folderDraft, parent: folderParent })
          await refresh(true)
          setActiveFolder(result.folder.path)
          revealFolder(result.folder.path)
          setFolderDraft(null)
          setView('all')
          setQuery('')
          setLayout('tree')
        } catch {
          setFolderError(t('page.folderError'))
        } finally {
          setCreatingFolder(false)
        }
      }

      const toggleTodo = async (todo) => {
        if (todoBusy) return
        setTodoBusy(true)
        try {
          await editorHandle.current?.flush()
          await api('todo', { id: todo.noteId, line: todo.line, done: !todo.done, revision: todo.revision })
          await refresh(true)
        } catch (failure) {
          await refresh(true)
          setError(String(failure?.message ?? failure))
        } finally { setTodoBusy(false) }
      }

      const navItems = [
        { key: 'recent', label: t('nav.recent'), icon: ICONS.recent },
        { key: 'all', label: t('nav.all'), icon: ICONS.note },
        { key: 'starred', label: t('nav.starred'), icon: ICONS.starred },
        { key: 'tag', label: t('nav.tags'), icon: ICONS.tags },
        { key: 'todos', label: t('nav.todos'), icon: ICONS.todos },
      ]

      const showTagRow = view === 'tag' && data.tags.length > 0
      const filtering = query.trim() !== '' || view !== 'all'
      const heading = view === 'all' ? t('page.allNotes') : t('nav.' + (view === 'tag' ? 'tags' : view))
      const folders = data.folders ?? []

      return h(
        'div',
        { className: 'dn-page', style: { '--dn-fs': fontSize + 'px' } },
        h(
          'aside',
          { className: 'dn-rail' },
          navItems.map((item) =>
            h(
              'button',
              {
                key: item.key,
                className: 'dn-rail-item' + (view === item.key ? ' on' : ''),
                'aria-pressed': view === item.key,
                onClick: () => {
                  setView(item.key)
                  if (item.key !== 'tag') setActiveTag('')
                  setFolderDraft(null)
                },
              },
              item.icon(),
              h('span', null, item.label),
            ),
          ),
          h('span', { className: 'dn-rail-spacer' }),
          h(
            'button',
            { className: 'dn-rail-item', title: t('status.refresh'), onClick: () => refresh(true) },
            ICONS.refresh(),
            h('span', null, ''),
          ),
        ),
        h(
          'section',
          { className: 'dn-listpane' },
          h(
            'div',
            { className: 'dn-listhead' },
            h(
              'div',
              { className: 'dn-listtop' },
              h('input', {
                ref: searchRef,
                className: 'dn-search',
                value: query,
                placeholder: t(view === 'todos' ? 'page.searchTodos' : 'page.search'),
                onChange: (event) => setQuery(event.target.value),
              }),
              h('button', { className: 'dn-new', onClick: () => createNote(), title: activeFolder ? t('page.newInFolder') + ' · ' + activeFolder : t('page.new') }, ICONS.plus(), h('span', null, t('page.new'))),
            ),
          ),
          h('div', { className: 'dn-sectionhead' },
            h('span', { className: 'dn-sectiontitle', title: data.root + ' · ' + t('page.count')(filtered.length) }, heading),
            h('button', { className: 'dn-listaction', title: t('page.newFolder'), onClick: () => { setFolderParent(activeFolder); setFolderDraft(''); setFolderError('') } }, ICONS.folder()),
            h('button', { className: 'dn-listaction', title: layout === 'tree' ? t('page.showSummary') : t('page.showTree'), onClick: () => setLayout(layout === 'tree' ? 'summary' : 'tree') }, layout === 'tree' ? ICONS.summary() : ICONS.tree()),
            h('button', { className: 'dn-listaction', title: sort === 'updated' ? t('page.sortTitle') : t('page.sortUpdated'), onClick: () => setSort(sort === 'updated' ? 'title' : 'updated') }, ICONS.sort()),
            layout === 'tree' && folders.length > 0 ? h('button', { className: 'dn-listaction', title: t('page.collapseAll'), onClick: () => setExpanded([]) }, ICONS.collapse()) : null,
          ),
          folderDraft !== null ? h('form', { className: 'dn-folderform', onSubmit: createFolder },
            h('label', { htmlFor: 'dn-folder-name' }, t('page.newFolder') + ' · ' + (folderParent || t('page.allNotes'))),
            h('input', { id: 'dn-folder-name', className: 'dn-search', autoFocus: true, value: folderDraft, placeholder: t('page.folderName'), disabled: creatingFolder, onChange: (event) => setFolderDraft(event.target.value), onKeyDown: (event) => { if (event.key === 'Escape' && !creatingFolder) setFolderDraft(null) } }),
            folderError ? h('span', { className: 'dn-foldererror', role: 'alert' }, folderError) : null,
            h('div', { className: 'dn-folderform-actions' },
              h('button', { type: 'button', className: 'dn-iconbtn', disabled: creatingFolder, onClick: () => setFolderDraft(null) }, t('page.cancel')),
              h('button', { type: 'submit', className: 'dn-new', disabled: creatingFolder || folderDraft.trim() === '' }, t('page.create')),
            ),
          ) : null,
          showTagRow
            ? h(
                'div',
                { className: 'dn-tagrow' },
                data.tags.map((tag) =>
                  h(
                    'button',
                    {
                      key: tag.name,
                      className: 'dn-tagchip' + (activeTag === tag.name ? ' on' : ''),
                      onClick: () => setActiveTag(activeTag === tag.name ? '' : tag.name),
                    },
                    '#' + tag.name + ' ' + tag.count,
                  ),
                ),
              )
            : null,
          view === 'todos'
            ? h('div', { className: 'dn-rows' }, h(TodoPane, {
                todos: filteredTodos,
                searching: query.trim() !== '',
                busy: todoBusy,
                t,
                onToggle: toggleTodo,
                onOpen: (id) => {
                  selectNote(id)
                },
              }))
            : h(
                'div',
                { className: 'dn-rows' + (layout === 'tree' ? ' dn-tree-scroll' : '') },
                loading
                  ? h('div', { className: 'dn-empty' }, '…')
                  : filtered.length === 0 && (filtering || folders.length === 0)
                    ? h(
                        'div',
                        { className: 'dn-empty' },
                        h('div', null, t(query.trim() ? 'page.noMatch' : view === 'starred' ? 'page.noStars' : 'page.emptyList')),
                        h('div', null, query.trim() ? '' : t(view === 'starred' ? 'page.noStarsHint' : 'page.emptyListHint')),
                      )
                    : layout === 'tree' ? h(NoteTree, {
                        notes: filtered, folders, selectedId, expanded, onExpand: expandFolder,
                        onSelect: selectNote, onFolder: setActiveFolder, onCreate: createNote, filtered: filtering, t,
                      }) : h('ul', { className: 'dn-summary-list' }, filtered.map((note) =>
                        h(NoteRow, {
                          key: note.id,
                          note,
                          selected: note.id === selectedId,
                          onSelect: selectNote,
                          t,
                        }),
                      )),
              ),
          error !== '' ? h('div', { className: 'dn-empty', style: { color: 'var(--dsw-alias-state-error-primary)' } }, error) : null,
        ),
        h(
          'section',
          { className: 'dn-editorpane' },
          selected !== null ? h('div', { className: 'dn-breadcrumb' },
            h('button', { onClick: () => { setView('all'); setQuery(''); setActiveFolder(''); setLayout('tree') } }, t('page.allNotes')),
            ...parentFolder(selected.id).split('/').filter(Boolean).map((name, index, parts) => h(React.Fragment, { key: index },
              h('span', { 'aria-hidden': true }, '›'),
              h('button', { onClick: () => { const folder = parts.slice(0, index + 1).join('/'); setView('all'); setQuery(''); setActiveFolder(folder); revealFolder(folder); setLayout('tree') } }, name),
            )),
            h('span', { 'aria-hidden': true }, '›'),
            h('span', { className: 'dn-breadcrumb-current', title: selected.title }, selected.title),
          ) : null,
          selected !== null
            ? h(Editor, {
                key: selected.id,
                note: selected,
                bridge,
                editorHandle,
                startEditing: editingNewId === selected.id,
                t,
                onChanged: () => refresh(true),
                onDeleted: () => {
                  setSelectedId(null)
                  refresh(false)
                },
              })
            : h(
                'div',
                { className: 'dn-empty', style: { flex: 1 } },
                h('div', { style: { fontSize: 15, fontWeight: 600 } }, t('page.emptySelect')),
                h('div', null, t('page.emptySelectHint')),
                h('button', { className: 'dn-new', style: { marginTop: 10 }, onClick: createNote }, ICONS.plus(), h('span', null, t('page.new'))),
              ),
        ),
      )
    }

    // ------------------------------------------------------- session deposit
    function DepositAction(props) {
      const t = useT()
      const [state, setState] = useState('idle')
      const [savedNoteId, setSavedNoteId] = useState(null)
      const run = async () => {
        if (state === 'saving') return
        setState('saving')
        try {
          const result = await api('deposit', { sessionId: props.sessionId })
          if (result.ok !== true) throw new Error(result.error ?? t('page.depositFailed'))
          setSavedNoteId(result.note.id)
          props.bridge.changed()
          setState('done')
          window.dispatchEvent(new CustomEvent('dsh-note:changed'))
        } catch (failure) {
          console.warn('[dsh-note] deposit failed', failure)
          setState('error')
        }
        setTimeout(() => setState('idle'), 2200)
      }
      const label =
        state === 'saving'
          ? t('page.depositing')
          : state === 'done'
            ? t('page.deposited')
            : state === 'error'
              ? t('page.depositFailed')
              : t('page.deposit')
      return h(React.Fragment, null, h(
        'button',
        {
          className: 'dn-hdrbtn' + (state === 'done' ? ' ok' : state === 'error' ? ' err' : ''),
          onClick: run,
          title: t('page.deposit'),
        },
        ICONS.deposit(14),
        h('span', null, label),
      ), savedNoteId ? h('button', { className: 'dn-hdrbtn', onClick: () => props.bridge.openNote(savedNoteId) }, t('link.openNote')) : null)
    }

    // -------------------------------------------------------------- settings
    /** One settings page: where the vault lives, what it holds, and how to open it. */
    function SettingsPanel(props) {
      const t = useT()
      const { close, onOpen } = props
      const [counts, setCounts] = useState({ notes: 0, folders: 0, tags: 0, todos: 0 })
      const [root, setRoot] = useState('')
      const [draft, setDraft] = useState('')
      const [loading, setLoading] = useState(true)
      const [saving, setSaving] = useState(false)
      const [fontSize, setFontSize] = useState(currentFontSize)
      const [status, setStatus] = useState({ kind: '', text: '' })

      const load = useCallback(async () => {
        try {
          const result = await api('list')
          setCounts({
            notes: Array.isArray(result.notes) ? result.notes.length : 0,
            folders: Array.isArray(result.folders) ? result.folders.length : 0,
            tags: Array.isArray(result.tags) ? result.tags.length : 0,
            todos: Array.isArray(result.todos) ? result.todos.filter((todo) => !todo.done).length : 0,
          })
          setRoot(typeof result.root === 'string' ? result.root : '')
          setDraft(typeof result.root === 'string' ? result.root : '')
          setStatus({ kind: '', text: '' })
        } catch (failure) {
          setStatus({ kind: 'err', text: t('settings.loadFailed') + '：' + String(failure?.message ?? failure) })
        } finally {
          setLoading(false)
        }
      }, [t])

      useEffect(() => {
        load()
      }, [load])

      const save = async () => {
        if (saving) return
        setSaving(true)
        setStatus({ kind: '', text: '' })
        try {
          await api('set-root', { rootDir: draft })
          setStatus({ kind: 'ok', text: t('settings.saved') })
        } catch (failure) {
          setStatus({ kind: 'err', text: t('settings.saveFailed') + '：' + String(failure?.message ?? failure) })
        } finally {
          setSaving(false)
        }
      }

      const row = (key, label, desc, ...controls) =>
        h(
          'div',
          { className: 'dn-set-row', key },
          h(
            'div',
            { className: 'dn-set-main' },
            h('div', { className: 'dn-set-label' }, label),
            desc ? h('div', { className: 'dn-set-desc' }, desc) : null,
          ),
          controls.length > 0 ? h('div', { className: 'dn-set-control' }, ...controls) : null,
        )

      return h(
        'div',
        { className: 'dn-set' },
        row(
          'root',
          t('settings.root'),
          t('settings.rootDesc'),
          h('input', {
            className: 'dn-set-input',
            value: draft,
            placeholder: '…/notes',
            spellCheck: false,
            onChange: (event) => setDraft(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter') save()
            },
          }),
          h(
            'button',
            { className: 'dn-set-btn primary', onClick: save, disabled: saving },
            saving ? '…' : t('settings.save'),
          ),
        ),
        row(
          'stats',
          t('settings.stats'),
          root,
          h('span', { className: 'dn-set-stat' }, loading ? '…' : t('settings.statsValue')(counts)),
        ),
        row(
          'font',
          t('settings.font'),
          t('settings.fontDesc'),
          h(
            'div',
            { className: 'dn-set-seg', role: 'group', 'aria-label': t('settings.font') },
            [
              { size: 12, key: 'settings.fontSmall' },
              { size: 13, key: 'settings.fontStandard' },
              { size: 14.5, key: 'settings.fontLarge' },
              { size: 16, key: 'settings.fontXLarge' },
            ].map((choice) =>
              h(
                'button',
                {
                  key: choice.size,
                  className: fontSize === choice.size ? 'on' : '',
                  'aria-pressed': fontSize === choice.size,
                  onClick: () => {
                    setFontSize(choice.size)
                    applyFontSize(choice.size)
                  },
                },
                t(choice.key),
              ),
            ),
          ),
        ),
        row(
          'open',
          t('settings.open'),
          t('settings.openDesc'),
          h(
            'button',
            {
              className: 'dn-set-btn',
              onClick: () => {
                try {
                  onOpen?.()
                } catch (error) {
                  console.warn('[dsh-note] opening the panel failed', error)
                }
                close?.()
              },
            },
            t('settings.openButton'),
          ),
        ),
        row('shortcuts', t('settings.shortcuts'), t('settings.shortcutsDesc')),
        row('format', t('settings.format'), t('settings.formatDesc')),
        status.text !== '' ? h('div', { className: 'dn-set-msg ' + status.kind, role: 'status' }, status.text) : null,
      )
    }

    // ------------------------------------------------------------ translation
    let translate = (key, ...rest) => (typeof key === 'string' ? key : '')

    function useT() {
      return translate
    }

    /** Register panels, the session action, and the stylesheet. */
    function apply(ctx) {
      const bridge = createIntegrationBridge(ctx)
      ctx.effect(() => () => bridge.dispose(), 'dsh-note: integration lifetime')
      ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'dsh-note: dictionaries')

      const bound = ctx.locale.bind(NS)
      translate = bound

      ctx.effect(() => {
        return () => {
          translate = (key) => key
        }
      }, 'dsh-note: translate')

      ctx.effect(() => {
        const style = document.createElement('style')
        style.dataset.plugin = 'dsh-note'
        style.textContent = CSS
        document.head.appendChild(style)
        return () => style.remove()
      }, 'dsh-note: styles')

      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: 'dsh-note',
            order: 15,
            label: () => translate('panel.label'),
            locale: NS,
          },
          PanelIcon,
        ),
      )

      ctx.slots.inject('main', () =>
        ctx.slots.register({ name: 'main', key: 'dsh-note', locale: NS }, (props) => h(NotesPage, { ...props, bridge })),
      )

      ctx.slots.inject('conversation.session.header.actions', () =>
        ctx.slots.register(
          {
            name: 'conversation.session.header.actions',
            id: 'dsh-note-deposit',
            order: 30,
            locale: NS,
          },
          (props) => h(DepositAction, { ...props, bridge }),
        ),
      )

      ctx.slots.inject('settings.section', () =>
        ctx.slots.register(
          {
            name: 'settings.section',
            id: 'dsh-note',
            order: 310,
            label: () => translate('settings.label'),
            locale: NS,
          },
          (props) =>
            h(SettingsPanel, {
              ...props,
              onOpen: () => {
                ctx.layout.selectPanel('dsh-note')
              },
            }),
        ),
      )
      ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
        name: 'conversation.session.header.actions', id: 'dsh-note-links', order: 31, locale: NS,
      }, (props) => h(RelatedNotesAction, { ...props, bridge })))
      ctx.slots.inject('conversation.chat.assistant-actions', () => ctx.slots.register({
        name: 'conversation.chat.assistant-actions', id: 'dsh-note-save-answer', order: 25, locale: NS,
      }, (props) => h(AnswerSaveAction, { ...props, bridge })))
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay', id: 'dsh-note-integration', order: 30, locale: NS,
      }, () => h(IntegrationOverlay, { bridge })))
      ctx.effect(() => ctx.uiConversation.userText.register({
        id: 'dsh-note', order: 15,
        match(text, from) {
          const pattern = /\[笔记：([^\]\n]*)\]\(dsh-note:([^\s)]+)\)/g
          pattern.lastIndex = from
          for (let match; (match = pattern.exec(text));) {
            try {
              return { id: 'dsh-note', start: match.index, end: pattern.lastIndex,
                data: { label: '笔记：' + match[1], noteId: decodeURIComponent(match[2]) } }
            } catch { /* Malformed URI text stays visible as ordinary text. */ }
          }
          return undefined
        },
      }), 'dsh-note: user-text references')
      ctx.slots.inject('conversation.user.text.node', () => ctx.slots.register({
        name: 'conversation.user.text.node', key: 'dsh-note', locale: NS,
      }, (props) => h(NoteReference, { ...props, bridge })))
    }

    function PanelIcon(props) {
      const size = typeof props?.size === 'number' ? props.size : 18
      return h(
        'span',
        { style: { display: 'inline-flex', color: props?.active ? 'var(--dsw-alias-brand-primary)' : 'currentColor' } },
        ICONS.note(size),
      )
    }

    return { inject: ['slots', 'locale', 'sessions', 'uiSession', 'layout', 'uiWorkspace', 'uiConversation', 'conversation'], apply }
  },
})
