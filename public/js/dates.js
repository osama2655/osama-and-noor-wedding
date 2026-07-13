import { api } from './api.js'
import { WED_DEFAULT } from './content.js'
import { bumpRev, meId, store } from './store.js'
import { confirmDelete, undoToast } from './ui.js'
import {
  byTag,
  debounce,
  escapeAttr,
  reorderBtns,
  reorderBySort,
} from './util.js'

const dates = () => store.data.dates || (store.data.dates = [])
const find = (id) => dates().find((d) => String(d.id) === String(id))

const push = debounce(async (id) => {
  const d = find(id)
  if (!d) return
  try {
    bumpRev(await api.importantDate(d))
  } catch (_) {
    /* next poll reconciles */
  }
}, 500)

function daysUntil(iso) {
  if (!iso) return null
  const diff = new Date(`${iso}T00:00:00`) - new Date()
  return Math.ceil(diff / 86400000)
}

function countdownLabel(iso) {
  const d = daysUntil(iso)
  if (d === null) return ''
  if (d > 1) return `${d} days`
  if (d === 1) return 'Tomorrow'
  if (d === 0) return 'Today'
  return `${-d} days ago`
}

function longDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function dateRow(d) {
  const cd = countdownLabel(d.date)
  return `<div class="dt-row ${d.date && daysUntil(d.date) < 0 ? 'past' : ''}" data-id="${d.id}">
      <div class="dt-main">
        <input class="dt-label" data-f="label" value="${escapeAttr(d.label)}" placeholder="Label, e.g. Milcha">
        <input class="dt-date" data-f="date" type="date" value="${escapeAttr(d.date)}">
        <input class="dt-note" data-f="note" value="${escapeAttr(d.note)}" placeholder="Note">
      </div>
      <div class="dt-side">
        ${cd ? `<span class="dt-count">${cd}</span>` : ''}
        ${byTag(d, meId())}
        ${reorderBtns(d.id)}
        <button class="del" data-del="${d.id}" title="Delete">&times;</button>
      </div>
    </div>`
}

export function renderDates() {
  const el = document.getElementById('tab-dates')
  if (!el) return
  const wed = store.data.wedDate || WED_DEFAULT
  el.innerHTML = `
    <div class="card">
      <h2>The timeline</h2>
      <p class="hint">Milcha, the henna night, the reception, deposit deadlines. Add each date as you lock it.</p>
      <div class="dt-wed">
        <div>
          <div class="dt-wed-l">Wedding day</div>
          <div class="dt-wed-v">${longDate(wed)}</div>
        </div>
        <div class="dt-wed-c">${countdownLabel(wed)}</div>
      </div>
      <div class="toolbar" style="margin-top:16px"><button class="btn sm" id="addDate">+ Add a date</button></div>
      <div class="dt-list">${dates().map(dateRow).join('') || '<div class="empty">No dates yet. Add the first milestone.</div>'}</div>
    </div>`

  el.querySelector('#addDate')?.addEventListener('click', async () => {
    try {
      const r = await api.importantDate({
        label: '',
        date: '',
        note: '',
        sort: dates().length + 1,
      })
      bumpRev(r)
      dates().push({
        id: r.id,
        label: '',
        date: '',
        note: '',
        by: 'You',
        byId: meId(),
        at: new Date().toISOString(),
      })
      renderDates()
    } catch (_) {
      /* ignore */
    }
  })

  el.querySelectorAll('.dt-row input').forEach((inp) => {
    inp.addEventListener('input', (e) => {
      const d = find(e.target.closest('.dt-row').dataset.id)
      if (!d) return
      d[e.target.dataset.f] = e.target.value
      d.by = 'You'
      d.byId = meId()
      d.at = new Date().toISOString()
      push(d.id)
    })
    // Re-render on date change so the countdown updates.
    if (inp.dataset.f === 'date') inp.addEventListener('change', renderDates)
  })

  el.querySelectorAll('[data-del]').forEach((b) =>
    b.addEventListener('click', async (e) => {
      const id = e.target.dataset.del
      const snap = find(id)
      if (!snap || !(await confirmDelete('this date'))) return
      const data = { ...snap }
      store.data.dates = dates().filter((d) => String(d.id) !== String(id))
      renderDates()
      undoToast('Date deleted', async () => {
        const r = await api.importantDate(data)
        bumpRev(r)
        dates().push({ ...data, id: r.id })
        renderDates()
      })
      try {
        bumpRev(await api.importantDateDelete(id))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )

  el.querySelectorAll('.dt-row .reord').forEach((b) =>
    b.addEventListener('click', () => {
      const dir = b.dataset.up != null ? -1 : 1
      const id = b.dataset.up != null ? b.dataset.up : b.dataset.down
      const ok = reorderBySort(dates(), id, dir, (d) =>
        api
          .importantDate(d)
          .then(bumpRev)
          .catch(() => {}),
      )
      if (ok) renderDates()
    }),
  )
}
