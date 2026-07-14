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
import { debounce, escapeAttr, reorderBySort } from './util.js'

const TAG_KEYS = ['you', 'men', 'her', 'hall']
const lanes = () => store.data.lanes || (store.data.lanes = [])
const findL = (id) => lanes().find((l) => String(l.id) === String(id))
const findI = (l, id) =>
  (l.items || []).find((i) => String(i.id) === String(id))
const cls = (t) => (TAG_KEYS.includes(t) ? t : 'hall')

const pushLane = debounce(async (id) => {
  const l = findL(id)
  if (!l) return
  try {
    bumpRev(await api.lane(l))
  } catch (_) {
    /* next poll reconciles */
  }
}, 500)

const pushItem = debounce(async (lid, iid) => {
  const l = findL(lid)
  const it = l && findI(l, iid)
  if (!it) return
  try {
    bumpRev(await api.laneItem({ ...it, laneId: Number(lid) }))
  } catch (_) {
    /* next poll reconciles */
  }
}, 500)

function itemRow(it) {
  return `<li class="li-row ${it.done ? 'done' : ''}" data-id="${it.id}">
      <input type="checkbox" class="cbx" data-done ${it.done ? 'checked' : ''}>
      <input class="li-label inline-edit" data-f="label" value="${escapeAttr(it.label)}" placeholder="Add a task">
      ${kebabButton('Task actions')}
    </li>`
}

function laneCard(l) {
  const opts = TAG_KEYS.map(
    (t) =>
      `<option value="${t}" ${l.tag === t ? 'selected' : ''}>${OWNERS[t]}</option>`,
  ).join('')
  return `<div class="card lane" data-id="${l.id}">
      <div class="card-head">
        <div class="ch-text lane-head">
          <input class="lane-title inline-edit" data-f="title" value="${escapeAttr(l.title)}" placeholder="Lane title, e.g. YOU, fully">
          <select class="lane-tag owner-tag t-${cls(l.tag)}" data-f="tag">${opts}</select>
        </div>
        <div class="ch-actions">
          <button class="btn ghost sm" data-addi="${l.id}">+ Add</button>
          ${kebabButton('Lane actions')}
        </div>
      </div>
      <input class="lane-note inline-edit" data-f="note" value="${escapeAttr(l.note)}" placeholder="A short note about this lane (optional)">
      <ul class="checks">${(l.items || []).map(itemRow).join('') || '<li class="empty-li">No tasks yet. Add the first.</li>'}</ul>
    </div>`
}

export function renderLanes() {
  const el = document.getElementById('tab-lanes')
  if (!el) return
  el.innerHTML = `
    <div class="card-head page-head">
      <div class="ch-text">
        <h2>Who owns what</h2>
        <p class="hint">Split the work into lanes. Tag each lane's owner, tick items as they land.</p>
      </div>
      <div class="ch-actions"><button class="btn sm" id="addLane">+ New lane</button></div>
    </div>
    ${lanes().map(laneCard).join('') || `<div class="card">${emptyState({ title: 'No lanes yet', sub: 'Split the wedding work into owned lanes.', cta: '+ New lane', ctaId: 'addLaneEmpty' })}</div>`}`
  wire(el)
}

async function addLane() {
  try {
    const r = await api.lane({
      title: '',
      note: '',
      tag: 'you',
      sort: lanes().length + 1,
    })
    bumpRev(r)
    lanes().push({
      id: r.id,
      title: '',
      note: '',
      tag: 'you',
      items: [],
      by: 'You',
      byId: meId(),
      at: new Date().toISOString(),
    })
    renderLanes()
    document
      .querySelector(`#tab-lanes .lane[data-id="${r.id}"] .lane-title`)
      ?.focus()
  } catch (_) {
    /* ignore */
  }
}

async function deleteLane(id) {
  const snap = findL(id)
  if (!snap || !(await confirmDelete('this lane'))) return
  const data = {
    title: snap.title,
    note: snap.note,
    tag: snap.tag,
    items: (snap.items || []).map((i) => ({ ...i })),
  }
  store.data.lanes = lanes().filter((l) => String(l.id) !== String(id))
  renderLanes()
  undoToast('Lane deleted', async () => {
    const r = await api.lane({
      title: data.title,
      note: data.note,
      tag: data.tag,
      sort: lanes().length + 1,
    })
    bumpRev(r)
    const nl = {
      id: r.id,
      title: data.title,
      note: data.note,
      tag: data.tag,
      items: [],
      by: 'You',
      byId: meId(),
      at: new Date().toISOString(),
    }
    for (const it of data.items) {
      const ir = await api.laneItem({
        laneId: r.id,
        label: it.label,
        done: it.done,
      })
      bumpRev(ir)
      nl.items.push({ id: ir.id, label: it.label, done: it.done })
    }
    lanes().push(nl)
    renderLanes()
  })
  try {
    bumpRev(await api.laneDelete(id))
  } catch (_) {
    /* next poll reconciles */
  }
}

async function removeItem(lid, iid) {
  const l = findL(lid)
  const snap = l && findI(l, iid)
  if (!snap) return
  const data = { label: snap.label, done: snap.done }
  l.items = (l.items || []).filter((i) => String(i.id) !== String(iid))
  renderLanes()
  undoToast('Item removed', async () => {
    const r = await api.laneItem({
      laneId: Number(lid),
      label: data.label,
      done: data.done,
    })
    bumpRev(r)
    ;(findL(lid).items || (findL(lid).items = [])).push({
      id: r.id,
      label: data.label,
      done: data.done,
    })
    renderLanes()
  })
  try {
    bumpRev(await api.laneItemDelete(iid))
  } catch (_) {
    /* next poll reconciles */
  }
}

function moveItem(lid, iid, dir) {
  const l = findL(lid)
  if (!l) return
  const ok = reorderBySort(l.items || (l.items = []), iid, dir, (it) =>
    api
      .laneItem({ ...it, laneId: Number(lid) })
      .then(bumpRev)
      .catch(() => {}),
  )
  if (ok) renderLanes()
}

function wire(el) {
  el.querySelector('#addLane')?.addEventListener('click', addLane)
  el.querySelector('#addLaneEmpty')?.addEventListener('click', addLane)

  el.querySelectorAll('.lane-title, .lane-note, .lane-tag').forEach((inp) =>
    inp.addEventListener('input', (e) => {
      const l = findL(e.target.closest('.lane').dataset.id)
      if (!l) return
      l[e.target.dataset.f] = e.target.value
      l.by = 'You'
      l.byId = meId()
      if (e.target.dataset.f === 'tag') {
        e.target.className = `lane-tag owner-tag t-${cls(e.target.value)}`
      }
      pushLane(l.id)
    }),
  )

  el.querySelectorAll('[data-addi]').forEach((btn) =>
    btn.addEventListener('click', async (e) => {
      const lid = e.currentTarget.dataset.addi
      const l = findL(lid)
      if (!l) return
      try {
        const r = await api.laneItem({
          laneId: Number(lid),
          label: '',
          done: false,
          sort: (l.items?.length || 0) + 1,
        })
        bumpRev(r)
        ;(l.items || (l.items = [])).push({ id: r.id, label: '', done: false })
        renderLanes()
        document
          .querySelector(
            `#tab-lanes .lane[data-id="${lid}"] .li-row[data-id="${r.id}"] .li-label`,
          )
          ?.focus()
      } catch (_) {
        /* ignore */
      }
    }),
  )

  el.querySelectorAll('.li-label').forEach((inp) =>
    inp.addEventListener('input', (e) => {
      const lid = e.target.closest('.lane').dataset.id
      const l = findL(lid)
      const it = l && findI(l, e.target.closest('.li-row').dataset.id)
      if (!it) return
      it.label = e.target.value
      pushItem(lid, it.id)
    }),
  )

  el.querySelectorAll('[data-done]').forEach((cb) =>
    cb.addEventListener('change', (e) => {
      const lid = e.target.closest('.lane').dataset.id
      const l = findL(lid)
      const it = l && findI(l, e.target.closest('.li-row').dataset.id)
      if (!it) return
      it.done = e.target.checked
      e.target.closest('.li-row').classList.toggle('done', it.done)
      pushItem(lid, it.id)
    }),
  )

  el.querySelectorAll('.li-row [data-kebab]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation()
      const lid = b.closest('.lane').dataset.id
      const iid = b.closest('.li-row').dataset.id
      openKebabMenu(b, [
        { label: 'Move up', onClick: () => moveItem(lid, iid, -1) },
        { label: 'Move down', onClick: () => moveItem(lid, iid, 1) },
        {
          label: 'Remove task',
          destructive: true,
          separatorBefore: true,
          onClick: () => removeItem(lid, iid),
        },
      ])
    }),
  )

  el.querySelectorAll('.ch-actions [data-kebab]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation()
      const lid = b.closest('.lane').dataset.id
      openKebabMenu(b, [
        {
          label: 'Delete lane',
          destructive: true,
          onClick: () => deleteLane(lid),
        },
      ])
    }),
  )
}
