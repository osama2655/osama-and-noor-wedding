import { api } from './api.js'
import { ASK_EVERY_HALL, PHOTOVIDEO } from './content.js'
import { openDrawer } from './drawer.js'
import { isSaved, toggleSave } from './saves.js'
import { bumpRev, meId, store } from './store.js'
import { escapeHtml } from './util.js'

// Keys are the category strings stored on catalog rows; shared with the saved screen.
export const CATEGORY_LABELS = {
  venue: 'Venue',
  photo: 'Photo & Video',
  hmua: 'HMUA',
  henna: 'Henna',
  cake: 'Cake',
  caterer: 'Caterer',
  transport: 'Transport',
  car: 'Wedding car',
  other: 'Other',
}

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS)

// Module-level so the chosen filter survives the re-renders background sync triggers.
let activeCat = 'all'

const items = (cat) =>
  (store.data.catalog || []).filter((c) => c.category === cat)

const byId = (id) =>
  (store.data.catalog || []).find((c) => String(c.id) === String(id))

// Create a blank listing and open the drawer to fill it in. Backend handle_catalog
// inserts when there is no id; the drawer edits the core fields from there.
async function addListing(category, rerender) {
  const count = items(category).length
  try {
    const r = await api.catalog({
      category,
      name: '',
      status: 'todo',
      sort: count + 1,
    })
    bumpRev(r)
    const row = {
      id: r.id,
      category,
      name: '',
      area: '',
      phone: '',
      instagram: '',
      mapsQuery: '',
      capacity: null,
      segregated: false,
      femaleCrew: false,
      featured: false,
      status: 'todo',
      note: '',
      verify: '',
      remarks: [],
      files: [],
      by: 'You',
      byId: meId(),
      at: new Date().toISOString(),
    }
    ;(store.data.catalog || (store.data.catalog = [])).push(row)
    rerender()
    openDrawer(row, rerender)
  } catch (_) {
    /* ignore */
  }
}

function card(item) {
  const saved = isSaved(item)
  const meta =
    item.category === 'venue'
      ? [
          item.area,
          item.capacity ? `${item.capacity} guests` : '',
          item.segregated ? 'Segregated' : '',
        ]
          .filter(Boolean)
          .join(' · ')
      : item.instagram || ''
  const flag =
    item.category === 'photo'
      ? item.femaleCrew
        ? '<span class="cat-flag ok">Female crew</span>'
        : '<span class="cat-flag warn">Confirm female</span>'
      : item.featured
        ? '<span class="cat-flag gold">Start here</span>'
        : ''
  return `<div class="cat-card ${item.featured ? 'featured' : ''}" data-id="${item.id}">
      <button class="cat-star ${saved ? 'on' : ''}" data-star="${item.id}" aria-label="Save">${saved ? '★' : '☆'}</button>
      <div class="cat-name">${item.name ? escapeHtml(item.name) : '<span class="cat-untitled">Untitled</span>'}</div>
      <div class="cat-meta">${escapeHtml(meta)}</div>
      ${item.note ? `<div class="cat-note">${escapeHtml(item.note)}</div>` : ''}
      <div class="cat-foot">${flag}<span class="cat-open">Open &rarr;</span></div>
    </div>`
}

// Resolve each card by id against the whole catalog, so one wiring pass serves
// both the single-category grid and the grouped "All" view.
function wireCards(host, rerender) {
  host.querySelectorAll('.cat-card').forEach((el) =>
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-star]')) return
      const item = byId(el.dataset.id)
      if (item) openDrawer(item, rerender)
    }),
  )
  host.querySelectorAll('[data-star]').forEach((b) =>
    b.addEventListener('click', async (e) => {
      e.stopPropagation()
      const item = byId(b.dataset.star)
      if (!item) return
      const picked = await toggleSave(item)
      b.classList.toggle('on', picked)
      b.textContent = picked ? '★' : '☆'
    }),
  )
}

function chipsHTML() {
  const chip = (cat, label) =>
    `<button class="cat-chip ${activeCat === cat ? 'on' : ''}" data-cat="${cat}">${escapeHtml(label)}</button>`
  return `<div class="cat-chips">
      ${chip('all', 'All')}
      ${CATEGORY_ORDER.map((c) => chip(c, CATEGORY_LABELS[c])).join('')}
    </div>`
}

// On "All" the add target is ambiguous, so pick it explicitly; a specific chip
// makes the button self-explanatory.
function addControlHTML() {
  if (activeCat === 'all') {
    const opts = CATEGORY_ORDER.map(
      (c) => `<option value="${c}">${escapeHtml(CATEGORY_LABELS[c])}</option>`,
    ).join('')
    return `<div class="toolbar" style="margin-top:14px">
      <select class="cat-add-cat" id="shortlistAddCat" aria-label="Category for the new listing">${opts}</select>
      <button class="btn sm" id="shortlistAdd">+ Add</button>
    </div>`
  }
  return `<div class="toolbar" style="margin-top:14px">
      <button class="btn sm" id="shortlistAdd">+ Add ${escapeHtml(CATEGORY_LABELS[activeCat])}</button>
    </div>`
}

function groupHTML(cat) {
  const list = items(cat)
  if (!list.length) return ''
  return `<h3 class="cat-group-h">${escapeHtml(CATEGORY_LABELS[cat])}</h3>
      <div class="cat-grid">${list.map(card).join('')}</div>`
}

function bodyHTML() {
  if (activeCat === 'all') {
    const groups = CATEGORY_ORDER.map(groupHTML).filter(Boolean).join('')
    return (
      groups ||
      '<div class="empty">Nothing shortlisted yet. Pick a category and add your first option.</div>'
    )
  }
  const list = items(activeCat)
  return list.length
    ? `<div class="cat-grid">${list.map(card).join('')}</div>`
    : '<div class="empty">Nothing here yet. Tap + Add to start this shortlist.</div>'
}

export function renderShortlist() {
  const el = document.getElementById('tab-shortlist')
  if (!el) return
  const showAsk = activeCat === 'all' || activeCat === 'venue'
  const showPhotoReq = activeCat === 'photo'
  el.innerHTML = `
    <div class="card">
      <h2>Shortlist</h2>
      <p class="hint">Every option you and Noor are weighing, in one place. Filter by category, star to save it together, tap to open.</p>
      ${chipsHTML()}
      ${showPhotoReq ? `<div class="dw-verify" style="margin:14px 0 0"><b>Hard requirement</b> ${escapeHtml(PHOTOVIDEO.requirement)}</div>` : ''}
      ${addControlHTML()}
      ${bodyHTML()}
    </div>
    ${showAsk ? `<div class="card"><h2>Ask every hall</h2><ol class="ask-list">${ASK_EVERY_HALL.map((q) => `<li>${escapeHtml(q)}</li>`).join('')}</ol></div>` : ''}`

  el.querySelectorAll('[data-cat]').forEach((b) =>
    b.addEventListener('click', () => {
      activeCat = b.dataset.cat
      renderShortlist()
    }),
  )
  el.querySelector('#shortlistAdd')?.addEventListener('click', () => {
    const chosen =
      activeCat === 'all'
        ? el.querySelector('#shortlistAddCat')?.value || 'venue'
        : activeCat
    addListing(chosen, renderShortlist)
  })
  wireCards(el, renderShortlist)
}
