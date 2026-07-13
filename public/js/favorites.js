import { CATEGORY_LABELS } from './catalog.js'
import { openDrawer } from './drawer.js'
import { saveKey } from './saves.js'
import { meId, store } from './store.js'
import { byTag, escapeHtml } from './util.js'

function savedCard(item) {
  const p = store.data.picks[saveKey(item)]
  const who = p ? byTag(p, meId()) : ''
  const meta = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.other
  return `<div class="cat-card" data-id="${item.id}">
      <div class="cat-name">${escapeHtml(item.name)}</div>
      <div class="cat-meta">${escapeHtml(meta)}</div>
      <div class="cat-foot">${who}<span class="cat-open">Open &rarr;</span></div>
    </div>`
}

export function renderSaved() {
  const el = document.getElementById('tab-saved')
  if (!el) return
  const picks = store.data.picks || {}
  const saved = (store.data.catalog || []).filter((c) => picks[saveKey(c)])
  el.innerHTML = `
    <div class="card">
      <h2>Saved to look at together</h2>
      <p class="hint">Everything you and Noor starred, in one place. Tap to open it again.</p>
      ${
        saved.length
          ? `<div class="cat-grid">${saved.map(savedCard).join('')}</div>`
          : '<div class="empty">Nothing saved yet. Star a venue or a vendor and it lands here.</div>'
      }
    </div>`
  el.querySelectorAll('.cat-card').forEach((card) =>
    card.addEventListener('click', () => {
      const item = saved.find((c) => String(c.id) === card.dataset.id)
      if (item) openDrawer(item, renderSaved)
    }),
  )
}
