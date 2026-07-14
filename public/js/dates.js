import { api } from './api.js'
import { WED_DEFAULT } from './content.js'
import { bumpRev, meId, store } from './store.js'
import {
  confirmDelete,
  emptyState,
  kebabButton,
  openKebabMenu,
  undoToast,
} from './ui.js'
import { makeSortable } from './drag-sort.js'
import { byTag, debounce, dragHandle, escapeAttr, reorderBySort } from './util.js'

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
  if (d === -1) return 'Yesterday'
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
  return `<div class="dt-row sortable ${d.date && daysUntil(d.date) < 0 ? 'past' : ''}" data-id="${d.id}" data-sort-id="${d.id}">
      ${dragHandle()}
      <div class="dt-main">
        <input class="dt-label inline-edit" data-f="label" value="${escapeAttr(d.label)}" placeholder="Label, e.g. Milcha">
        <input class="dt-date inline-edit" data-f="date" type="date" value="${escapeAttr(d.date)}">
        <input class="dt-note inline-edit" data-f="note" value="${escapeAttr(d.note)}" placeholder="Note">
      </div>
      <div class="dt-side">
        ${cd ? `<span class="dt-count">${cd}</span>` : ''}
        <span class="lmeta">${byTag(d, meId())}</span>
        ${kebabButton('Date actions')}
      </div>
    </div>`
}

export function renderDates() {
  const el = document.getElementById('tab-dates')
  if (!el) return
  const wed = store.data.wedDate || WED_DEFAULT
  el.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div class="ch-text">
          <h2>The timeline</h2>
          <p class="hint">Milcha, the henna night, the reception, deposit deadlines.</p>
        </div>
        <div class="ch-actions"><button class="btn sm" id="addDate">+ Add a date</button></div>
      </div>
      <div class="dt-wed">
        <div>
          <div class="dt-wed-l">Wedding day</div>
          <div class="dt-wed-v">${longDate(wed)}</div>
        </div>
        <div class="dt-wed-c">${countdownLabel(wed)}</div>
      </div>
      <div class="dt-list">${dates().map(dateRow).join('') || emptyState({ title: 'No dates yet', sub: 'Add the first milestone as you lock it.', cta: '+ Add a date', ctaId: 'addDateEmpty' })}</div>
    </div>`

  const addDate = async () => {
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
      document
        .querySelector(`#tab-dates .dt-row[data-id="${r.id}"] .dt-label`)
        ?.focus()
    } catch (_) {
      /* ignore */
    }
  }
  el.querySelector('#addDate')?.addEventListener('click', addDate)
  el.querySelector('#addDateEmpty')?.addEventListener('click', addDate)

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

  const deleteDate = async (id) => {
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
  }

  const moveDate = (id, dir) =>
    reorderBySort(dates(), id, dir, (d) =>
      api.importantDate(d).then(bumpRev).catch(() => {}),
    ) && renderDates()

  const reorderDates = (ids) => {
    const list = dates()
    list.sort((a, b) => ids.indexOf(String(a.id)) - ids.indexOf(String(b.id)))
    list.forEach((d, idx) => {
      const s = idx + 1
      if (d.sort !== s) {
        d.sort = s
        api.importantDate(d).then(bumpRev).catch(() => {})
      }
    })
    renderDates()
  }
  makeSortable(el.querySelector('.dt-list'), reorderDates)

  el.querySelectorAll('.dt-row [data-kebab]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = b.closest('.dt-row').dataset.id
      openKebabMenu(b, [
        { label: 'Move up', onClick: () => moveDate(id, -1) },
        { label: 'Move down', onClick: () => moveDate(id, 1) },
        {
          label: 'Delete date',
          destructive: true,
          separatorBefore: true,
          onClick: () => deleteDate(id),
        },
      ])
    }),
  )
}
