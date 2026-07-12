import { api } from './api.js'
import { OWNERS } from './content.js'
import { bumpRev, meId, store } from './store.js'
import { confirmDelete, undoToast } from './ui.js'
import { debounce, escapeAttr, escapeHtml } from './util.js'

const OWNER_KEYS = ['you', 'men', 'her', 'hall']
const ownerClass = (o) =>
  o === 'you' ? 'you' : o === 'her' ? 'her' : o === 'men' ? 'men' : 'hall'
const facts = () => store.data.facts || (store.data.facts = [])
const opens = () => store.data.openItems || (store.data.openItems = [])

const pushFact = debounce(async (id) => {
  const f = facts().find((x) => x.id === id)
  if (!f) return
  try {
    bumpRev(await api.fact(f))
  } catch (_) {
    /* next poll reconciles */
  }
}, 500)

const pushOpen = debounce(async (id) => {
  const o = opens().find((x) => x.id === id)
  if (!o) return
  try {
    bumpRev(await api.openItem(o))
  } catch (_) {
    /* next poll reconciles */
  }
}, 500)

function factRow(f) {
  return `<div class="fact" data-id="${f.id}">
      <input class="fact-k" data-f="label" value="${escapeAttr(f.label)}" placeholder="Label">
      <textarea class="fact-v" data-f="value" rows="1" placeholder="Value">${escapeHtml(f.value || '')}</textarea>
      <button class="row-x" data-delf="${f.id}" title="Delete">&times;</button>
    </div>`
}

function openRow(o) {
  return `<div class="open-item" data-id="${o.id}">
      <select class="open-owner t-${ownerClass(o.owner)}" data-f="owner">${OWNER_KEYS.map((k) => `<option value="${k}" ${o.owner === k ? 'selected' : ''}>${OWNERS[k]}</option>`).join('')}</select>
      <input class="open-title" data-f="title" value="${escapeAttr(o.title)}" placeholder="Title">
      <input class="open-detail" data-f="detail" value="${escapeAttr(o.detail)}" placeholder="Detail">
      <button class="row-x" data-delo="${o.id}" title="Delete">&times;</button>
    </div>`
}

export function renderFacts() {
  const el = document.getElementById('tab-facts')
  if (!el) return
  el.innerHTML = `
    <div class="card">
      <h2>The plan, locked</h2>
      <p class="hint">These are settled. Edit any value, or add your own. Tap a field to change it.</p>
      <div class="facts">${facts().map(factRow).join('')}</div>
      <div class="toolbar" style="margin-top:14px"><button class="btn ghost sm" id="addFact">+ Add fact</button></div>
    </div>
    <div class="card">
      <h2>Still open</h2>
      <p class="hint">Loose threads. Do not lose them.</p>
      <div class="open-list">${opens().map(openRow).join('') || '<div class="empty">Nothing open. Add a thread.</div>'}</div>
      <div class="toolbar" style="margin-top:14px"><button class="btn ghost sm" id="addOpen">+ Add item</button></div>
    </div>`
  wire(el)
}

function wire(el) {
  el.querySelector('#addFact')?.addEventListener('click', async () => {
    try {
      const r = await api.fact({
        label: '',
        value: '',
        sort: facts().length + 1,
      })
      bumpRev(r)
      facts().push({
        id: r.id,
        label: '',
        value: '',
        by: 'You',
        byId: meId(),
        at: new Date().toISOString(),
      })
      renderFacts()
      el.querySelector(`.fact[data-id="${r.id}"] .fact-k`)?.focus()
    } catch (_) {
      /* ignore */
    }
  })

  el.querySelector('#addOpen')?.addEventListener('click', async () => {
    try {
      const r = await api.openItem({
        title: '',
        detail: '',
        owner: 'you',
        sort: opens().length + 1,
      })
      bumpRev(r)
      opens().push({
        id: r.id,
        title: '',
        detail: '',
        owner: 'you',
        by: 'You',
        byId: meId(),
        at: new Date().toISOString(),
      })
      renderFacts()
      el.querySelector(`.open-item[data-id="${r.id}"] .open-title`)?.focus()
    } catch (_) {
      /* ignore */
    }
  })

  el.querySelectorAll('.fact input, .fact textarea').forEach((inp) =>
    inp.addEventListener('input', (e) => {
      const f = facts().find(
        (x) => String(x.id) === e.target.closest('.fact').dataset.id,
      )
      if (!f) return
      f[e.target.dataset.f] = e.target.value
      f.by = 'You'
      f.byId = meId()
      f.at = new Date().toISOString()
      pushFact(f.id)
    }),
  )

  el.querySelectorAll('.open-item input, .open-item select').forEach((inp) =>
    inp.addEventListener('input', (e) => {
      const o = opens().find(
        (x) => String(x.id) === e.target.closest('.open-item').dataset.id,
      )
      if (!o) return
      o[e.target.dataset.f] = e.target.value
      o.by = 'You'
      o.byId = meId()
      o.at = new Date().toISOString()
      if (e.target.dataset.f === 'owner') {
        e.target.className = `open-owner t-${ownerClass(o.owner)}`
      }
      pushOpen(o.id)
    }),
  )

  el.querySelectorAll('[data-delf]').forEach((b) =>
    b.addEventListener('click', async (e) => {
      const id = Number(e.currentTarget.dataset.delf)
      const snap = facts().find((x) => x.id === id)
      if (!snap || !(await confirmDelete('this fact'))) return
      const data = { label: snap.label, value: snap.value }
      store.data.facts = facts().filter((x) => x.id !== id)
      renderFacts()
      undoToast('Fact deleted', async () => {
        const r = await api.fact({ ...data, sort: 100 })
        bumpRev(r)
        facts().push({
          id: r.id,
          ...data,
          by: 'You',
          byId: meId(),
          at: new Date().toISOString(),
        })
        renderFacts()
      })
      try {
        bumpRev(await api.factDelete(id))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )

  el.querySelectorAll('[data-delo]').forEach((b) =>
    b.addEventListener('click', async (e) => {
      const id = Number(e.currentTarget.dataset.delo)
      const snap = opens().find((x) => x.id === id)
      if (!snap || !(await confirmDelete('this item'))) return
      const data = { title: snap.title, detail: snap.detail, owner: snap.owner }
      store.data.openItems = opens().filter((x) => x.id !== id)
      renderFacts()
      undoToast('Item deleted', async () => {
        const r = await api.openItem({ ...data, sort: 100 })
        bumpRev(r)
        opens().push({
          id: r.id,
          ...data,
          by: 'You',
          byId: meId(),
          at: new Date().toISOString(),
        })
        renderFacts()
      })
      try {
        bumpRev(await api.openItemDelete(id))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )
}
