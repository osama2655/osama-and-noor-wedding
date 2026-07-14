export const fmt = (n) => {
  n = Number(n) || 0
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export const escapeHtml = (s) =>
  String(s ?? '').replace(
    /[&<>]/g,
    (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m],
  )

export const escapeAttr = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (m) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        m
      ],
  )

export const debounce = (fn, ms = 500) => {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

export function timeAgo(iso) {
  if (!iso) return ''
  const then = new Date(
    iso.replace(' ', 'T') + (iso.includes('T') || iso.includes('Z') ? '' : 'Z'),
  )
  const secs = Math.floor((Date.now() - then.getTime()) / 1000)
  if (isNaN(secs)) return ''
  if (secs < 45) return 'just now'
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`
  if (secs < 86400) return `${Math.round(secs / 3600)}h ago`
  return `${Math.round(secs / 86400)}d ago`
}

// "by You / Noor" attribution pill. `entry` carries {byId, by, at}; `meId` is the current user id.
export function byTag(entry, meId) {
  if (!entry || entry.byId == null) return ''
  const mine = entry.byId === meId
  const who = mine ? 'You' : String(entry.by || '').split(' ')[0]
  const when = entry.at
    ? ` · <span class="by-when">${timeAgo(entry.at)}</span>`
    : ''
  return `<span class="by ${mine ? 'me' : 'them'}"><span class="dot"></span>${escapeHtml(who)}${when}</span>`
}

// Move item `id` one step (`dir` -1 up / +1 down) within `list`, renumber the `sort` field
// sequentially, and call persist(item) for each item whose sort changed. Returns true if moved.
export function reorderBySort(list, id, dir, persist) {
  const i = list.findIndex((x) => String(x.id) === String(id))
  const j = i + dir
  if (i < 0 || j < 0 || j >= list.length) return false
  const [moved] = list.splice(i, 1)
  list.splice(j, 0, moved)
  list.forEach((x, idx) => {
    const s = idx + 1
    if (x.sort !== s) {
      x.sort = s
      persist(x)
    }
  })
  return true
}

// Up/down move controls for a reorderable row.
export const reorderBtns = (id) =>
  `<span class="reorder"><button class="reord" type="button" data-up="${id}" title="Move up" aria-label="Move up">&#9650;</button><button class="reord" type="button" data-down="${id}" title="Move down" aria-label="Move down">&#9660;</button></span>`

// Grip that starts a drag-reorder (see drag-sort.js makeSortable). Six-dot glyph.
export const dragHandle = () =>
  `<button class="drag-handle" type="button" aria-label="Drag to reorder" title="Drag to reorder"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="6" cy="4" r="1.3"/><circle cx="10" cy="4" r="1.3"/><circle cx="6" cy="8" r="1.3"/><circle cx="10" cy="8" r="1.3"/><circle cx="6" cy="12" r="1.3"/><circle cx="10" cy="12" r="1.3"/></svg></button>`

// Wire the up/down controls inside `root`. getList(button) returns the array the row lives in;
// persist(item) saves one item; rerender() repaints after the move.
export function wireReorder(root, getList, persist, rerender) {
  root.querySelectorAll('.reord').forEach((b) =>
    b.addEventListener('click', () => {
      const dir = b.dataset.up != null ? -1 : 1
      const id = b.dataset.up != null ? b.dataset.up : b.dataset.down
      const list = getList(b)
      if (list && reorderBySort(list, id, dir, persist)) rerender()
    }),
  )
}
