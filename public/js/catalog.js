import { ASK_EVERY_HALL, PHOTOVIDEO } from './content.js'
import { openDrawer } from './drawer.js'
import { isSaved, toggleSave } from './saves.js'
import { store } from './store.js'
import { escapeHtml } from './util.js'

const items = (cat) =>
  (store.data.catalog || []).filter((c) => c.category === cat)

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
      <div class="cat-name">${escapeHtml(item.name)}</div>
      <div class="cat-meta">${escapeHtml(meta)}</div>
      ${item.note ? `<div class="cat-note">${escapeHtml(item.note)}</div>` : ''}
      <div class="cat-foot">${flag}<span class="cat-open">Open &rarr;</span></div>
    </div>`
}

function grid(cat, host, rerender) {
  if (!host) return
  const list = items(cat)
  host.innerHTML =
    list.map(card).join('') || '<div class="empty">Nothing here yet.</div>'
  host.querySelectorAll('.cat-card').forEach((el) =>
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-star]')) return
      const item = items(cat).find((c) => String(c.id) === el.dataset.id)
      if (item) openDrawer(item, rerender)
    }),
  )
  host.querySelectorAll('[data-star]').forEach((b) =>
    b.addEventListener('click', async (e) => {
      e.stopPropagation()
      const item = items(cat).find((c) => String(c.id) === b.dataset.star)
      if (!item) return
      const picked = await toggleSave(item)
      b.classList.toggle('on', picked)
      b.textContent = picked ? '★' : '☆'
    }),
  )
}

export function renderVenues() {
  const el = document.getElementById('tab-venues')
  if (!el) return
  el.innerHTML = `
    <div class="card">
      <h2>Venues</h2>
      <p class="hint">Tap a hall to see it on the map, call, and get directions. Star to save it together.</p>
      <div class="cat-grid" id="venues-grid"></div>
    </div>
    <div class="card">
      <h2>Ask every hall</h2>
      <ol class="ask-list">${ASK_EVERY_HALL.map((q) => `<li>${escapeHtml(q)}</li>`).join('')}</ol>
    </div>`
  grid('venue', el.querySelector('#venues-grid'), renderVenues)
}

export function renderPhotoVideo() {
  const el = document.getElementById('tab-photo')
  if (!el) return
  el.innerHTML = `
    <div class="card">
      <h2>Photo and video</h2>
      <div class="dw-verify" style="margin:0 0 14px"><b>Hard requirement</b> ${escapeHtml(PHOTOVIDEO.requirement)}</div>
      <div class="cat-grid" id="photo-grid"></div>
    </div>`
  grid('photo', el.querySelector('#photo-grid'), renderPhotoVideo)
}
