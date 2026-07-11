import { api } from './api.js'
import { bumpRev, meId, store } from './store.js'
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
      <p class="hint">Build a plan, add what each piece costs, and see it against your budget of BD ${min} to ${max}. Make a Plan A and a Plan B and compare.</p>
      <div class="toolbar"><button class="btn sm" id="addBundle">+ New plan</button></div>
      <div class="bundles">${bundles().map(bundleCard).join('') || '<div class="empty">No plans yet. Start Plan A.</div>'}</div>
    </div>`
  wire(el)
}

function wire(el) {
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
      store.data.bundles = bundles().filter((b) => String(b.id) !== String(id))
      renderBoards()
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
      const b = findB(e.target.closest('.bundle').dataset.id)
      if (b)
        b.items = (b.items || []).filter((i) => String(i.id) !== String(iid))
      renderBoards()
      try {
        bumpRev(await api.bundleItemDelete(iid))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )
}
