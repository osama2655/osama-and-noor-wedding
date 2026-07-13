import { api } from './api.js'
import { bumpRev, meId, store } from './store.js'
import { confirmDelete, undoToast } from './ui.js'
import { byTag, debounce, escapeAttr, fmt } from './util.js'

const bundles = () => store.data.bundles || (store.data.bundles = [])
const findB = (id) => bundles().find((b) => String(b.id) === String(id))
const findI = (b, id) =>
  (b.items || []).find((i) => String(i.id) === String(id))
const budget = () => ({
  min: store.data.budgetMin ?? 1000,
  max: store.data.budgetMax ?? 1200,
})
const forecast = (b) =>
  (b.items || []).reduce((s, i) => s + (Number(i.cost) || 0), 0)

const hintText = () => {
  const { min, max } = budget()
  return `Build a plan, add what each piece costs, and see it against your budget of BD ${min} to ${max}. Make a Plan A and a Plan B and compare.`
}

const budgetField = (key, label, value) =>
  `<label class="budget-field" style="display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted)">${label}
      <input class="field" id="${key}" type="number" min="0" value="${escapeAttr(value)}" style="max-width:120px">
    </label>`

const budgetSaver = (key) =>
  debounce(async () => {
    try {
      bumpRev(await api.setting(key, store.data[key]))
    } catch (_) {
      /* next poll reconciles */
    }
  }, 500)

const budgetSavers = {
  budgetMin: budgetSaver('budgetMin'),
  budgetMax: budgetSaver('budgetMax'),
}

const pushBundle = debounce(async (id) => {
  const b = findB(id)
  if (!b) return
  try {
    bumpRev(await api.bundle(b))
  } catch (_) {
    /* next poll reconciles */
  }
}, 500)

const pushItem = debounce(async (bid, iid) => {
  const b = findB(bid)
  const it = b && findI(b, iid)
  if (!it) return
  try {
    bumpRev(await api.bundleItem({ ...it, bundleId: Number(bid) }))
  } catch (_) {
    /* next poll reconciles */
  }
}, 500)

function statusOf(total) {
  const { min, max } = budget()
  if (total > max) return { cls: 'over', label: `BD ${fmt(total - max)} over` }
  if (total < min)
    return { cls: 'room', label: `BD ${fmt(min - total)} to reach ${min}` }
  return { cls: 'ok', label: 'On budget' }
}

function barHTML(total) {
  const { max } = budget()
  const pct = Math.min(100, max ? (total / max) * 100 : 0)
  const s = statusOf(total)
  return `<div class="bd-bar ${s.cls}"><span style="width:${pct}%"></span></div>
    <div class="bd-line"><span class="bd-total">BD ${fmt(total)}</span><span class="bd-status ${s.cls}">${s.label}</span></div>`
}

// Repaint the hint and every forecast bar in place after a budget edit, so the
// bars track the new band without re-rendering the inputs the user is typing in.
function refreshForecast(el) {
  const hint = el.querySelector('#budgetHint')
  if (hint) hint.textContent = hintText()
  el.querySelectorAll('.bundle').forEach((node) => {
    const b = findB(node.dataset.id)
    const fc = node.querySelector('.bd-forecast')
    if (b && fc) fc.innerHTML = barHTML(forecast(b))
  })
}

function itemRow(it) {
  return `<div class="bi-row" data-id="${it.id}">
      <input class="bi-label" data-f="label" value="${escapeAttr(it.label)}" placeholder="Item, e.g. Venue">
      <input class="bi-cost" data-f="cost" inputmode="decimal" value="${escapeAttr(it.cost)}" placeholder="0">
      <button class="del" data-del="${it.id}" title="Remove">&times;</button>
    </div>`
}

function bundleCard(b) {
  return `<div class="bundle" data-id="${b.id}">
      <div class="bundle-head">
        <input class="bundle-name" data-f="name" value="${escapeAttr(b.name)}" placeholder="Plan name, e.g. Plan A">
        <button class="del" data-delb="${b.id}" title="Delete plan">&times;</button>
      </div>
      <div class="bi-list">${(b.items || []).map(itemRow).join('')}</div>
      <button class="btn ghost sm add-item" data-add="${b.id}">+ Add item</button>
      <div class="bd-forecast">${barHTML(forecast(b))}</div>
      <div class="bundle-foot">${byTag(b, meId())}</div>
    </div>`
}

export function renderBoards() {
  const el = document.getElementById('tab-boards')
  if (!el) return
  const { min, max } = budget()
  el.innerHTML = `
    <div class="card">
      <h2>Bundles</h2>
      <p class="hint" id="budgetHint">${hintText()}</p>
      <div class="toolbar">
        ${budgetField('budgetMin', 'Budget min', min)}
        ${budgetField('budgetMax', 'Budget max', max)}
      </div>
      <div class="toolbar"><button class="btn sm" id="addBundle">+ New plan</button></div>
      <div class="bundles">${bundles().map(bundleCard).join('') || '<div class="empty">No plans yet. Start Plan A.</div>'}</div>
    </div>`
  wire(el)
}

function wire(el) {
  ;['budgetMin', 'budgetMax'].forEach((key) => {
    el.querySelector(`#${key}`)?.addEventListener('input', (e) => {
      store.data[key] = Number(e.target.value) || 0
      refreshForecast(el)
      budgetSavers[key]()
    })
  })

  el.querySelector('#addBundle')?.addEventListener('click', async () => {
    try {
      const r = await api.bundle({ name: '', sort: bundles().length + 1 })
      bumpRev(r)
      bundles().push({
        id: r.id,
        name: '',
        items: [],
        forecast: '0',
        by: 'You',
        byId: meId(),
        at: new Date().toISOString(),
      })
      renderBoards()
    } catch (_) {
      /* ignore */
    }
  })

  el.querySelectorAll('.bundle-name').forEach((inp) =>
    inp.addEventListener('input', (e) => {
      const b = findB(e.target.closest('.bundle').dataset.id)
      if (!b) return
      b.name = e.target.value
      b.by = 'You'
      b.byId = meId()
      b.at = new Date().toISOString()
      pushBundle(b.id)
    }),
  )

  el.querySelectorAll('[data-delb]').forEach((btn) =>
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.delb
      const snap = findB(id)
      if (!snap || !(await confirmDelete('this plan'))) return
      const data = {
        name: snap.name,
        items: (snap.items || []).map((i) => ({ ...i })),
      }
      store.data.bundles = bundles().filter((b) => String(b.id) !== String(id))
      renderBoards()
      undoToast('Plan deleted', async () => {
        const r = await api.bundle({
          name: data.name,
          sort: bundles().length + 1,
        })
        bumpRev(r)
        const nb = {
          id: r.id,
          name: data.name,
          items: [],
          by: 'You',
          byId: meId(),
          at: new Date().toISOString(),
        }
        for (const it of data.items) {
          const ir = await api.bundleItem({
            bundleId: r.id,
            label: it.label,
            cost: it.cost,
          })
          bumpRev(ir)
          nb.items.push({
            id: ir.id,
            label: it.label,
            cost: it.cost,
            by: 'You',
            byId: meId(),
            at: new Date().toISOString(),
          })
        }
        bundles().push(nb)
        renderBoards()
      })
      try {
        bumpRev(await api.bundleDelete(id))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )

  el.querySelectorAll('[data-add]').forEach((btn) =>
    btn.addEventListener('click', async (e) => {
      const bid = e.target.dataset.add
      const b = findB(bid)
      if (!b) return
      try {
        const r = await api.bundleItem({
          bundleId: Number(bid),
          label: '',
          cost: '',
          sort: (b.items?.length || 0) + 1,
        })
        bumpRev(r)
        ;(b.items || (b.items = [])).push({
          id: r.id,
          label: '',
          cost: '',
          by: 'You',
          byId: meId(),
          at: new Date().toISOString(),
        })
        renderBoards()
      } catch (_) {
        /* ignore */
      }
    }),
  )

  el.querySelectorAll('.bi-row input').forEach((inp) =>
    inp.addEventListener('input', (e) => {
      const bid = e.target.closest('.bundle').dataset.id
      const b = findB(bid)
      const it = b && findI(b, e.target.closest('.bi-row').dataset.id)
      if (!it) return
      it[e.target.dataset.f] = e.target.value
      it.by = 'You'
      it.byId = meId()
      it.at = new Date().toISOString()
      if (e.target.dataset.f === 'cost') {
        const fc = e.target.closest('.bundle').querySelector('.bd-forecast')
        if (fc) fc.innerHTML = barHTML(forecast(b))
      }
      pushItem(bid, it.id)
    }),
  )

  el.querySelectorAll('.bi-row [data-del]').forEach((btn) =>
    btn.addEventListener('click', async (e) => {
      const iid = e.target.dataset.del
      const bid = e.target.closest('.bundle').dataset.id
      const b = findB(bid)
      const snap = b && findI(b, iid)
      if (!snap) return
      const data = { label: snap.label, cost: snap.cost }
      b.items = (b.items || []).filter((i) => String(i.id) !== String(iid))
      renderBoards()
      undoToast('Item removed', async () => {
        const r = await api.bundleItem({
          bundleId: Number(bid),
          label: data.label,
          cost: data.cost,
        })
        bumpRev(r)
        ;(findB(bid).items || (findB(bid).items = [])).push({
          id: r.id,
          label: data.label,
          cost: data.cost,
          by: 'You',
          byId: meId(),
          at: new Date().toISOString(),
        })
        renderBoards()
      })
      try {
        bumpRev(await api.bundleItemDelete(iid))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )
}
