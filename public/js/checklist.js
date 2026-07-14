import { api } from './api.js'
import { CHECKLIST, OWNERS } from './content.js'
import { renderDash, renderOverall } from './dashboard.js'
import { weekStats } from './stats.js'
import { bumpRev, meId, store } from './store.js'
import {
  confirmDelete,
  kebabButton,
  openKebabMenu,
  undoToast,
} from './ui.js'
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

const hasOverride = (key) => store.data.checkOverrides?.[key] != null

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

// Hidden panels report scrollHeight 0; skip until laid out (regrown on tab:shown).
const autoGrow = (ta) => {
  ta.style.height = 'auto'
  const h = ta.scrollHeight
  if (h) ta.style.height = `${h}px`
}

function metaCluster(owner, who) {
  const tag = owner
    ? `<span class="owner-tag t-${ownerClass(owner)}">${ownerLabel(owner)}</span>`
    : ''
  if (!tag && !who) return ''
  return `<span class="lmeta">${tag}${who}</span>`
}

function staticRow(w, i) {
  const key = `${w.id}-${i}`
  const it = w.items[i]
  const e = store.data.checks?.[key]
  const on = !!e?.done
  const who = on ? byTag(e, meId()) : ''
  const text = overrideText(key, it[0])
  return `<li class="${on ? 'done' : ''}" data-key="${key}">
      <input type="checkbox" class="cbx ${w.gate ? 'gold' : ''}" data-key="${key}" ${on ? 'checked' : ''}>
      <span class="txt"><textarea class="co-text inline-edit" data-okey="${key}" rows="1">${escapeHtml(text)}</textarea></span>
      ${metaCluster(it[1], who)}
      ${kebabButton('Task actions')}
    </li>`
}

function customRow(w, c) {
  const key = `ci-${c.id}`
  const e = store.data.checks?.[key]
  const on = !!e?.done
  const who = on ? byTag(e, meId()) : ''
  return `<li class="ci ${on ? 'done' : ''}" data-ci="${c.id}">
      <input type="checkbox" class="cbx ${w.gate ? 'gold' : ''}" data-key="${key}" ${on ? 'checked' : ''}>
      <span class="txt">
        <input class="ci-text inline-edit" data-f="text" value="${escapeAttr(c.text)}" placeholder="Add your own task">
      </span>
      <span class="lmeta">
        <select class="ci-owner" data-f="owner">${OWNER_KEYS.map((o) => `<option value="${o}" ${c.owner === o ? 'selected' : ''}>${OWNERS[o]}</option>`).join('')}</select>
        ${who}
      </span>
      ${kebabButton('Task actions')}
    </li>`
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
    return `<div class="card ${w.gate ? 'gate' : ''}" data-phase="${w.id}">
        <div class="card-head">
          <div class="ch-text">
            <div class="week-head"><h2>${w.title}</h2><span class="badge">${w.sub}</span></div>
          </div>
          <div class="ch-actions">
            <button class="btn ghost sm" data-add="${w.id}">+ Add</button>
            ${hiddenCount ? kebabButton('Phase actions') : ''}
          </div>
        </div>
        <div class="mini-progress"><div class="bar ${w.gate ? 'gold' : ''}"><span style="width:${p}%"></span></div><div class="lab">${s.done}/${s.total}</div></div>
        <ul class="checks">${rows || '<li class="empty-li">No items here. Add one above.</li>'}</ul>
      </div>`
  }).join('')
  wire(el)
}

function refresh() {
  renderChecklist()
  renderDash()
  renderOverall()
}

async function hideRow(key) {
  store.data.hiddenChecks = store.data.hiddenChecks || {}
  store.data.hiddenChecks[key] = true
  refresh()
  try {
    bumpRev(await api.hideCheck(key, true))
  } catch (_) {
    /* next poll reconciles */
  }
}

async function resetRow(key) {
  // Cancel any in-flight debounced save of the edit we are discarding, or it
  // would re-create the override on the server right after we delete it.
  clearTimeout(overTimers[key])
  if (store.data.checkOverrides) delete store.data.checkOverrides[key]
  refresh()
  try {
    bumpRev(await api.checkOverrideDelete(key))
  } catch (_) {
    /* next poll reconciles */
  }
}

async function restorePhase(pid) {
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
}

async function deleteCustom(id) {
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
}

// Reorder a custom item within its phase; built-in rows keep the plan's order.
function moveCustom(id, dir) {
  const items = store.data.checkItems || []
  const it = items.find((c) => c.id === id)
  if (!it) return
  const sibs = items.filter((c) => c.phase === it.phase)
  const pos = sibs.findIndex((c) => c.id === id)
  const j = pos + dir
  if (j < 0 || j >= sibs.length) return
  sibs.splice(pos, 1)
  sibs.splice(j, 0, it)
  sibs.forEach((c, idx) => {
    const s = idx + 1
    if (c.sort !== s) {
      c.sort = s
      api
        .checkItem(c)
        .then(bumpRev)
        .catch(() => {})
    }
  })
  items.sort(
    (a, cc) =>
      String(a.phase).localeCompare(String(cc.phase)) ||
      (a.sort || 0) - (cc.sort || 0),
  )
  refresh()
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
        document
          .querySelector(`#tab-checklist li[data-ci="${r.id}"] .ci-text`)
          ?.focus()
      } catch (_) {
        /* ignore */
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

  // Built-in row kebab: reset wording (when overridden) + remove.
  el.querySelectorAll('li[data-key] [data-kebab]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation()
      const key = b.closest('li').dataset.key
      const items = []
      if (hasOverride(key))
        items.push({
          label: 'Reset to original wording',
          onClick: () => resetRow(key),
        })
      items.push({
        label: 'Remove from checklist',
        destructive: true,
        separatorBefore: items.length > 0,
        onClick: () => hideRow(key),
      })
      openKebabMenu(b, items)
    }),
  )

  // Custom row kebab: move + delete.
  el.querySelectorAll('li[data-ci] [data-kebab]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = Number(b.closest('li').dataset.ci)
      openKebabMenu(b, [
        { label: 'Move up', onClick: () => moveCustom(id, -1) },
        { label: 'Move down', onClick: () => moveCustom(id, 1) },
        {
          label: 'Delete item',
          destructive: true,
          separatorBefore: true,
          onClick: () => deleteCustom(id),
        },
      ])
    }),
  )

  // Phase-header kebab: restore removed rows.
  el.querySelectorAll('.ch-actions [data-kebab]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation()
      const pid = b.closest('.card').dataset.phase
      const w = CHECKLIST.find((x) => x.id === pid)
      const n = w.items.filter((_, i) => hidden(`${pid}-${i}`)).length
      openKebabMenu(b, [
        {
          label: `Restore ${n} removed item${n === 1 ? '' : 's'}`,
          onClick: () => restorePhase(pid),
        },
      ])
    }),
  )
}

// Built-in rows use auto-growing textareas sized from scrollHeight, which reads 0
// while the Checklist panel is hidden. Re-grow every row once the panel shows.
window.addEventListener('tab:shown', (e) => {
  if (e.detail !== 'checklist') return
  document
    .querySelectorAll('#tab-checklist .co-text')
    .forEach((ta) => autoGrow(ta))
})
