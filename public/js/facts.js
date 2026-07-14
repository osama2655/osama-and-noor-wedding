import { api } from './api.js'
import { OWNERS } from './content.js'
import { bumpRev, meId, store } from './store.js'
import {
  confirmDelete,
  emptyState,
  kebabButton,
  openKebabMenu,
  undoToast,
} from './ui.js'
import { makeSortable } from './drag-sort.js'
import {
  debounce,
  dragHandle,
  escapeAttr,
  escapeHtml,
  reorderBySort,
} from './util.js'

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

// Hidden panels report scrollHeight 0; skip until laid out (regrown on tab:shown).
const autoGrow = (ta) => {
  ta.style.height = 'auto'
  const h = ta.scrollHeight
  if (h) ta.style.height = `${h}px`
}

function factRow(f) {
  return `<div class="fact sortable" data-id="${f.id}" data-sort-id="${f.id}">
      ${dragHandle()}
      <input class="fact-k inline-edit" data-f="label" value="${escapeAttr(f.label)}" placeholder="Label">
      <textarea class="fact-v inline-edit" data-f="value" rows="1" placeholder="Value">${escapeHtml(f.value || '')}</textarea>
      ${kebabButton('Fact actions')}
    </div>`
}

function openRow(o) {
  return `<div class="open-item sortable" data-id="${o.id}" data-sort-id="${o.id}">
      ${dragHandle()}
      <select class="open-owner t-${ownerClass(o.owner)}" data-f="owner">${OWNER_KEYS.map((k) => `<option value="${k}" ${o.owner === k ? 'selected' : ''}>${OWNERS[k]}</option>`).join('')}</select>
      <input class="open-title inline-edit" data-f="title" value="${escapeAttr(o.title)}" placeholder="Title">
      <input class="open-detail inline-edit" data-f="detail" value="${escapeAttr(o.detail)}" placeholder="Detail">
      ${kebabButton('Item actions')}
    </div>`
}

export function renderFacts() {
  const el = document.getElementById('tab-facts')
  if (!el) return
  el.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div class="ch-text">
          <h2>The plan, locked</h2>
          <p class="hint">These are settled. Tap any value to change it.</p>
        </div>
        <div class="ch-actions"><button class="btn ghost sm" id="addFact">+ Add fact</button></div>
      </div>
      <div class="facts">${facts().map(factRow).join('') || emptyState({ title: 'Nothing locked yet', sub: 'Add the decisions you have already made.', cta: '+ Add fact', ctaId: 'addFactEmpty' })}</div>
    </div>
    <div class="card">
      <div class="card-head">
        <div class="ch-text">
          <h2>Still open</h2>
          <p class="hint">Loose threads. Do not lose them.</p>
        </div>
        <div class="ch-actions"><button class="btn ghost sm" id="addOpen">+ Add item</button></div>
      </div>
      <div class="open-list">${opens().map(openRow).join('') || emptyState({ title: 'Nothing open', sub: 'Park a loose thread here so it is not forgotten.', cta: '+ Add item', ctaId: 'addOpenEmpty' })}</div>
    </div>`
  wire(el)
}

async function addFact(el) {
  try {
    const r = await api.fact({ label: '', value: '', sort: facts().length + 1 })
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
}

async function addOpen(el) {
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
}

async function deleteFact(id) {
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
}

async function deleteOpen(id) {
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
}

const moveFact = (id, dir) =>
  reorderBySort(facts(), id, dir, (f) =>
    api.fact(f).then(bumpRev).catch(() => {}),
  ) && renderFacts()

const moveOpen = (id, dir) =>
  reorderBySort(opens(), id, dir, (o) =>
    api.openItem(o).then(bumpRev).catch(() => {}),
  ) && renderFacts()

// Apply a drag-reordered id list (new top-to-bottom order) to sort + persist.
function reorderList(list, ids, save) {
  list.sort((a, b) => ids.indexOf(String(a.id)) - ids.indexOf(String(b.id)))
  list.forEach((x, idx) => {
    const s = idx + 1
    if (x.sort !== s) {
      x.sort = s
      save(x).then(bumpRev).catch(() => {})
    }
  })
  renderFacts()
}

function wire(el) {
  el.querySelector('#addFact')?.addEventListener('click', () => addFact(el))
  el.querySelector('#addFactEmpty')?.addEventListener('click', () => addFact(el))
  el.querySelector('#addOpen')?.addEventListener('click', () => addOpen(el))
  el.querySelector('#addOpenEmpty')?.addEventListener('click', () => addOpen(el))

  el.querySelectorAll('.fact .fact-v').forEach(autoGrow)

  el.querySelectorAll('.fact input, .fact textarea').forEach((inp) =>
    inp.addEventListener('input', (e) => {
      const f = facts().find(
        (x) => String(x.id) === e.target.closest('.fact').dataset.id,
      )
      if (!f) return
      if (e.target.tagName === 'TEXTAREA') autoGrow(e.target)
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

  el.querySelectorAll('.fact [data-kebab]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = Number(b.closest('.fact').dataset.id)
      openKebabMenu(b, [
        { label: 'Move up', onClick: () => moveFact(id, -1) },
        { label: 'Move down', onClick: () => moveFact(id, 1) },
        {
          label: 'Delete fact',
          destructive: true,
          separatorBefore: true,
          onClick: () => deleteFact(id),
        },
      ])
    }),
  )

  el.querySelectorAll('.open-item [data-kebab]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = Number(b.closest('.open-item').dataset.id)
      openKebabMenu(b, [
        { label: 'Move up', onClick: () => moveOpen(id, -1) },
        { label: 'Move down', onClick: () => moveOpen(id, 1) },
        {
          label: 'Delete item',
          destructive: true,
          separatorBefore: true,
          onClick: () => deleteOpen(id),
        },
      ])
    }),
  )

  // Drag-to-reorder both lists.
  makeSortable(el.querySelector('.facts'), (ids) =>
    reorderList(facts(), ids, (f) => api.fact(f)),
  )
  makeSortable(el.querySelector('.open-list'), (ids) =>
    reorderList(opens(), ids, (o) => api.openItem(o)),
  )
}

// Textareas sized while the panel was hidden report 0; regrow once visible.
window.addEventListener('tab:shown', (e) => {
  if (e.detail !== 'facts') return
  document.querySelectorAll('#tab-facts .fact-v').forEach(autoGrow)
})
