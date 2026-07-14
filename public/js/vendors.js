import { api } from './api.js'
import { STATUS } from './content.js'
import { renderDash } from './dashboard.js'
import { moneyTotals } from './stats.js'
import { openDrawer } from './drawer.js'
import { bumpRev, meId, store } from './store.js'
import {
  confirmDelete,
  kebabButton,
  openKebabMenu,
  toast,
  undoToast,
} from './ui.js'
import { byTag, debounce, escapeAttr, escapeHtml, fmt } from './util.js'

const vendors = () => store.data.vendors || (store.data.vendors = [])
const find = (id) => vendors().find((v) => String(v.id) === String(id))

const NUMERIC = new Set(['quote', 'deposit'])

// Short pill labels for the status select; the full STATUS label is the option title.
const STATUS_SHORT = {
  todo: 'To do',
  contacted: 'Contacted',
  quoted: 'Quoted',
  booked: 'Booked',
  paid: 'Paid',
}
const CATEGORIES = [
  'Planner',
  'Venue',
  'Photo + video',
  'HMUA (hair & makeup)',
  'Henna artist',
  'Décor / flowers / kosha',
  'Catering / menu',
  'Cake',
  'Entertainment (DJ / ardha)',
  'Wedding car / transport',
  'Invitations',
  'Your attire (thobe/bisht)',
  'Honeymoon',
]

// Short display labels so the category column never truncates. The stored VALUE
// stays the full string (compatible with the booking-handoff category mapping);
// only the option text shown in the closed select is shortened.
const CAT_SHORT = {
  'Planner': 'Planner',
  'Venue': 'Venue',
  'Photo + video': 'Photo',
  'HMUA (hair & makeup)': 'HMUA',
  'Henna artist': 'Henna',
  'Décor / flowers / kosha': 'Décor',
  'Catering / menu': 'Catering',
  'Cake': 'Cake',
  'Entertainment (DJ / ardha)': 'DJ / ardha',
  'Wedding car / transport': 'Car',
  'Invitations': 'Invites',
  'Your attire (thobe/bisht)': 'Attire',
  'Honeymoon': 'Honeymoon',
}
const catShort = (c) => CAT_SHORT[c] || c

function catOptions(cur) {
  const list = !cur || CATEGORIES.includes(cur) ? CATEGORIES : [cur, ...CATEGORIES]
  return (
    `<option value="" ${!cur ? 'selected' : ''}>Category…</option>` +
    list
      .map(
        (c) =>
          `<option value="${escapeAttr(c)}" ${c === cur ? 'selected' : ''}>${escapeHtml(catShort(c))}</option>`,
      )
      .join('')
  )
}

// Money still owed on a row, derived from quote and paid (never negative).
// Empty when there is no quote yet, so un-started rows stay quiet.
function owedCell(v) {
  const q = Number(v.quote)
  if (!v.quote || Number.isNaN(q)) return '<span class="bal muted">—</span>'
  const owed = Math.max(0, q - (Number(v.deposit) || 0))
  return `<span class="bal${owed === 0 ? ' muted' : ''}">${fmt(owed)}</span>`
}

// A row with no vendor name and no money yet is "not started" — rendered muted
// so the rows that carry real data lead the eye.
const isBlankRow = (v) =>
  !(v.name || '').trim() && !v.quote && !v.deposit && !v.balance_due

// A free-text contact is dialable when it is +-prefixed or mostly digits; an
// @handle, name, or email is not. Phone -> tel: mirrors drawer.js locally.
const looksLikePhone = (contact) => {
  const s = String(contact || '').replace(/\s+/g, '')
  if (!s || /[a-zA-Z@]/.test(s)) return false
  return s[0] === '+' || s.replace(/\D/g, '').length >= 6
}

const telHref = (contact) => String(contact || '').replace(/\s+/g, '')

function contactCell(v) {
  const input = `<input value="${escapeAttr(v.contact)}" data-f="contact" placeholder="Phone / handle">`
  if (!looksLikePhone(v.contact)) return input
  return `<div class="vendor-contact">${input}<a class="vendor-call" href="tel:${escapeAttr(telHref(v.contact))}" title="Call ${escapeAttr(v.contact)}" aria-label="Call ${escapeAttr(v.contact)}">📞</a></div>`
}

const pushVendor = debounce(async (id) => {
  const v = find(id)
  if (!v) return
  try {
    bumpRev(await api.vendor(v))
  } catch (_) {
    /* next poll reconciles */
  }
}, 500)

export function renderMoney() {
  const m = moneyTotals()
  const el = document.getElementById('moneyRow')
  if (!el) return
  el.innerHTML = `
    <div class="money"><div class="l">Booked</div><div class="v pos">${m.booked}<small>/${vendors().length}</small></div></div>
    <div class="money"><div class="l">Committed</div><div class="v">BD ${fmt(m.quote)}</div></div>
    <div class="money"><div class="l">Paid</div><div class="v pos">BD ${fmt(m.deposit)}</div></div>
    <div class="money"><div class="l">Outstanding</div><div class="v warn">BD ${fmt(m.balance)}</div></div>`
}

export function renderVendors() {
  const body = document.getElementById('vendorBody')
  if (!body) return
  const rows = vendors()
  if (!rows.length) {
    body.innerHTML =
      '<tr><td colspan="10" class="empty">No vendors yet. Add a row to start tracking.</td></tr>'
  } else {
    body.innerHTML = rows
      .map(
        (v) => `
      <tr data-id="${v.id}" class="${isBlankRow(v) ? 'row-muted' : ''}">
        <td data-label="Category"><select data-f="category" class="cat-select">${catOptions(v.category)}</select></td>
        <td data-label="Vendor"><input value="${escapeAttr(v.name)}" data-f="name" placeholder="Name / IG"></td>
        <td data-label="Contact">${contactCell(v)}</td>
        <td data-label="Status"><div class="stat-wrap"><select data-f="status" class="stat s-${v.status}">${Object.keys(STATUS_SHORT)
          .map(
            (k) =>
              `<option value="${k}" ${v.status === k ? 'selected' : ''} title="${escapeAttr(STATUS[k])}">${STATUS_SHORT[k]}</option>`,
          )
          .join('')}</select></div></td>
        <td data-label="Quote" class="num"><input value="${escapeAttr(v.quote)}" data-f="quote" inputmode="decimal" placeholder="—"></td>
        <td data-label="Paid" class="num"><input value="${escapeAttr(v.deposit)}" data-f="deposit" inputmode="decimal" placeholder="—"></td>
        <td data-label="Owed" class="num owed">${owedCell(v)}</td>
        <td data-label="Due"><input value="${escapeAttr(v.balance_due)}" data-f="balance_due" type="text" placeholder="—" onfocus="(this.type='date')" onblur="if(!this.value)this.type='text'"></td>
        <td data-label="Updated" class="upd">${byTag(v, meId())}</td>
        <td class="kebab-cell">${kebabButton('Row actions')}</td>
      </tr>`,
      )
      .join('')
  }

  body.querySelectorAll('input,select').forEach((inp) => {
    inp.addEventListener('input', (e) => {
      const tr = e.target.closest('tr')
      const v = find(tr.dataset.id)
      if (!v) return
      const f = e.target.dataset.f
      v[f] = e.target.value
      v.by = 'You'
      v.byId = meId()
      v.at = new Date().toISOString()
      tr.querySelector('.upd').innerHTML = byTag(v, meId())
      if (f === 'status') e.target.className = `stat s-${e.target.value}`
      // Owed is derived: recompute its cell live as quote / paid change.
      if (f === 'quote' || f === 'deposit') {
        const cell = tr.querySelector('.owed')
        if (cell) cell.innerHTML = owedCell(v)
      }
      if (f === 'status' || NUMERIC.has(f)) {
        renderMoney()
        renderDash()
      }
      pushVendor(v.id)
    })
  })

  body.querySelectorAll('.kebab-cell [data-kebab]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = b.closest('tr').dataset.id
      const v = find(id)
      const items = []
      if (v?.catalogId) {
        items.push({
          label: 'View listing',
          onClick: () => openListing(v.catalogId),
        })
      }
      items.push({
        label: 'Delete row',
        destructive: true,
        separatorBefore: items.length > 0,
        onClick: () => deleteVendor(id),
      })
      openKebabMenu(b, items)
    }),
  )

  renderMoney()
}

// Open the Shortlist listing a Payments row was booked from (the reverse of the
// drawer's "Add to Payments").
function openListing(catalogId) {
  const c = (store.data.catalog || []).find((x) => x.id === Number(catalogId))
  if (!c) {
    toast({ type: 'err', message: 'That listing was removed.' })
    return
  }
  document
    .querySelector('#navGroups button[data-group="vendors"]')
    ?.click()
  document.querySelector('#tabs button[data-tab="shortlist"]')?.click()
  window.scrollTo(0, 0)
  openDrawer(c, renderVendors)
}

async function deleteVendor(id) {
  const snap = find(id)
  if (!snap || !(await confirmDelete('this row'))) return
  const data = { ...snap }
  store.data.vendors = vendors().filter((v) => String(v.id) !== String(id))
  renderVendors()
  renderMoney()
  renderDash()
  undoToast('Row deleted', async () => {
    const r = await api.vendor(data)
    bumpRev(r)
    vendors().push({ ...data, id: r.id })
    renderVendors()
    renderMoney()
    renderDash()
  })
  try {
    bumpRev(await api.vendorDelete(id))
  } catch (_) {
    /* next poll reconciles */
  }
}

export function initVendorControls() {
  const add = document.getElementById('addVendor')
  if (add)
    add.addEventListener('click', async () => {
      try {
        const res = await api.vendor({
          category: '',
          name: '',
          contact: '',
          status: 'todo',
          quote: '',
          deposit: '',
          balance: '',
          balance_due: '',
        })
        bumpRev(res)
        vendors().push({
          id: res.id,
          category: '',
          name: '',
          contact: '',
          status: 'todo',
          quote: '',
          deposit: '',
          balance: '',
          balance_due: '',
          by: 'You',
          byId: meId(),
          at: new Date().toISOString(),
        })
        renderVendors()
        renderDash()
      } catch (_) {
        /* ignore */
      }
    })
}
