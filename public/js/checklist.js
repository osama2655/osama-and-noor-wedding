import { api } from './api.js'
import { CHECKLIST, OWNERS } from './content.js'
import { renderDash, renderOverall } from './dashboard.js'
import { weekStats } from './stats.js'
import { bumpRev, meId, store } from './store.js'
import { confirmDelete, undoToast } from './ui.js'
import { byTag, debounce, escapeAttr, escapeHtml } from './util.js'

const OWNER_KEYS = ['you', 'men', 'her', 'hall']
const ownerLabel = (o) => OWNERS[o] || ''
const ownerClass = (o) =>
  o === 'you' ? 'you' : o === 'her' ? 'her' : o === 'men' ? 'men' : 'hall'
const hidden = (key) => !!store.data.hiddenChecks?.[key]
const customFor = (pid) =>
  (store.data.checkItems || []).filter((c) => c.phase === pid)

const pushItem = debounce(async (id) => {
  const it = (store.data.checkItems || []).find((c) => c.id === id)
  if (!it) return
  try {
    bumpRev(await api.checkItem(it))
  } catch (_) {
    /* next poll reconciles */
  }
}, 500)

const overrideText = (key, original) => {
  const ov = store.data.checkOverrides?.[key]
  return ov != null ? ov : original
}

// Per-key debounced save of an edited built-in row.
const overTimers = {}
function saveOverride(key, text) {
  store.data.checkOverrides = store.data.checkOverrides || {}
  store.data.checkOverrides[key] = text
  clearTimeout(overTimers[key])
  overTimers[key] = setTimeout(async () => {
    try {
      bumpRev(await api.checkOverride(key, text))
    } catch (_) {
      /* next poll reconciles */
    }
  }, 500)
}

const autoGrow = (ta) => {
  ta.style.height = 'auto'
  ta.style.height = `${ta.scrollHeight}px`
}

function staticRow(w, i) {
  const key = `${w.id}-${i}`
  const it = w.items[i]
  const e = store.data.checks?.[key]
  const on = !!e?.done
  const owner = it[1]
  const ownerTag = owner
    ? `<span class="owner-tag t-${ownerClass(owner)}">${ownerLabel(owner)}</span>`
    : ''
  const who = on ? byTag(e, meId()) : ''
  const text = overrideText(key, it[0])
  return `<li class="${on ? 'done' : ''}">
      <input type="checkbox" class="cbx ${w.gate ? 'gold' : ''}" data-key="${key}" ${on ? 'checked' : ''}>
      <span class="txt"><textarea class="co-text" data-okey="${key}" rows="1">${escapeHtml(text)}</textarea>${ownerTag}${who}</span>
      <button class="row-x" data-hide="${key}" title="Remove this row">&times;</button></li>`
}

function customRow(w, c) {
  const key = `ci-${c.id}`
  const e = store.data.checks?.[key]
  const on = !!e?.done
  const who = on ? byTag(e, meId()) : ''
  return `<li class="ci ${on ? 'done' : ''}" data-ci="${c.id}">
      <input type="checkbox" class="cbx ${w.gate ? 'gold' : ''}" data-key="${key}" ${on ? 'checked' : ''}>
      <span class="txt">
        <input class="ci-text" data-f="text" value="${escapeAttr(c.text)}" placeholder="Add your own task">
        <select class="ci-owner" data-f="owner">${OWNER_KEYS.map((o) => `<option value="${o}" ${c.owner === o ? 'selected' : ''}>${OWNERS[o]}</option>`).join('')}</select>
        ${who}
      </span>
      <button class="row-x" data-delci="${c.id}" title="Delete this row">&times;</button></li>`
}

export function renderChecklist() {
  const el = document.getElementById('tab-checklist')
  if (!el) return
  el.innerHTML = CHECKLIST.map((w) => {
    const s = weekStats(w)
    const p = s.total ? Math.round((s.done / s.total) * 100) : 0
    const hiddenCount = w.items.filter((_, i) => hidden(`${w.id}-${i}`)).length
    const rows =
      w.items
        .map((_, i) => (hidden(`${w.id}-${i}`) ? '' : staticRow(w, i)))
        .join('') +
      customFor(w.id)
        .map((c) => customRow(w, c))
        .join('')
    return `<div class="card ${w.gate ? 'gate' : ''}">
        <div class="week-head"><h2>${w.title}</h2><span class="badge">${w.sub}</span></div>
        <div class="mini-progress"><div class="bar ${w.gate ? 'gold' : ''}"><span style="width:${p}%"></span></div><div class="lab">${s.done}/${s.total}</div></div>
        <ul class="checks">${rows || '<li class="empty-li">No items here. Add one below.</li>'}</ul>
        <div class="check-tools">
          <button class="btn ghost sm" data-add="${w.id}">+ Add item</button>
          ${hiddenCount ? `<button class="btn ghost sm" data-restore="${w.id}">Restore ${hiddenCount} removed</button>` : ''}
        </div>
      </div>`
  }).join('')
  wire(el)
}

function refresh() {
  renderChecklist()
  renderDash()
  renderOverall()
}

function wire(el) {
  el.querySelectorAll('.cbx').forEach((cb) =>
    cb.addEventListener('change', async (e) => {
      const key = e.target.dataset.key
      const done = e.target.checked
      store.data.checks[key] = {
        done,
        by: 'You',
        byId: meId(),
        at: new Date().toISOString(),
      }
      refresh()
      try {
        bumpRev(await api.check(key, done))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )

  el.querySelectorAll('[data-hide]').forEach((b) =>
    b.addEventListener('click', async (e) => {
      const key = e.currentTarget.dataset.hide
      store.data.hiddenChecks = store.data.hiddenChecks || {}
      store.data.hiddenChecks[key] = true
      refresh()
      try {
        bumpRev(await api.hideCheck(key, true))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )

  el.querySelectorAll('[data-restore]').forEach((b) =>
    b.addEventListener('click', async (e) => {
      const pid = e.currentTarget.dataset.restore
      const w = CHECKLIST.find((x) => x.id === pid)
      const keys = w.items.map((_, i) => `${pid}-${i}`).filter((k) => hidden(k))
      keys.forEach((k) => delete store.data.hiddenChecks[k])
      refresh()
      for (const k of keys) {
        try {
          bumpRev(await api.hideCheck(k, false))
        } catch (_) {
          /* ignore */
        }
      }
    }),
  )

  el.querySelectorAll('[data-add]').forEach((b) =>
    b.addEventListener('click', async (e) => {
      const phase = e.currentTarget.dataset.add
      try {
        const r = await api.checkItem({
          phase,
          text: '',
          owner: 'you',
          sort: customFor(phase).length + 1,
        })
        bumpRev(r)
        ;(store.data.checkItems || (store.data.checkItems = [])).push({
          id: r.id,
          phase,
          text: '',
          owner: 'you',
          by: 'You',
          byId: meId(),
          at: new Date().toISOString(),
        })
        refresh()
        el.querySelector(`li[data-ci="${r.id}"] .ci-text`)?.focus()
      } catch (_) {
        /* ignore */
      }
    }),
  )

  el.querySelectorAll('[data-delci]').forEach((b) =>
    b.addEventListener('click', async (e) => {
      const id = Number(e.currentTarget.dataset.delci)
      const snap = (store.data.checkItems || []).find((c) => c.id === id)
      if (!snap || !(await confirmDelete('this item'))) return
      const data = { phase: snap.phase, text: snap.text, owner: snap.owner }
      store.data.checkItems = (store.data.checkItems || []).filter(
        (c) => c.id !== id,
      )
      refresh()
      undoToast('Item deleted', async () => {
        const r = await api.checkItem({ ...data, sort: 100 })
        bumpRev(r)
        ;(store.data.checkItems || (store.data.checkItems = [])).push({
          id: r.id,
          ...data,
          by: 'You',
          byId: meId(),
          at: new Date().toISOString(),
        })
        refresh()
      })
      try {
        bumpRev(await api.checkItemDelete(id))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )

  el.querySelectorAll('.co-text').forEach((ta) => {
    autoGrow(ta)
    ta.addEventListener('input', (e) => {
      autoGrow(e.target)
      saveOverride(e.target.dataset.okey, e.target.value)
    })
  })

  el.querySelectorAll('.ci-text, .ci-owner').forEach((inp) =>
    inp.addEventListener('input', (e) => {
      const id = Number(e.target.closest('li').dataset.ci)
      const it = (store.data.checkItems || []).find((c) => c.id === id)
      if (!it) return
      it[e.target.dataset.f] = e.target.value
      it.by = 'You'
      it.byId = meId()
      it.at = new Date().toISOString()
      pushItem(id)
    }),
  )
}
