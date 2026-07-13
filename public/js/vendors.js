import { api } from './api.js'
import { STATUS } from './content.js'
import { renderDash } from './dashboard.js'
import { moneyTotals } from './stats.js'
import { bumpRev, meId, store } from './store.js'
import { confirmDelete, undoToast } from './ui.js'
import { byTag, debounce, escapeAttr, escapeHtml, fmt } from './util.js'

const vendors = () => store.data.vendors || (store.data.vendors = [])
const find = (id) => vendors().find((v) => String(v.id) === String(id))

const NUMERIC = new Set(['quote', 'deposit', 'balance'])

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

function catOptions(cur) {
  const list = !cur || CATEGORIES.includes(cur) ? CATEGORIES : [cur, ...CATEGORIES]
  return (
    `<option value="" ${!cur ? 'selected' : ''}>Category…</option>` +
    list
      .map((c) => `<option ${c === cur ? 'selected' : ''}>${escapeHtml(c)}</option>`)
      .join('')
  )
}

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
  return `<div class="vendor-contact" style="display:flex;align-items:center;gap:6px;flex:1">${input}<a class="vendor-call" href="tel:${escapeAttr(telHref(v.contact))}" title="Call ${escapeAttr(v.contact)}" aria-label="Call ${escapeAttr(v.contact)}" style="flex:none;text-decoration:none;font-size:15px;line-height:1">📞</a></div>`
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
    <div class="money"><div class="l">Vendors booked</div><div class="v" style="color:var(--emerald)">${m.booked}<small>/${vendors().length}</small></div></div>
    <div class="money"><div class="l">Total quoted</div><div class="v">BD ${fmt(m.quote)}</div></div>
    <div class="money"><div class="l">Deposits paid</div><div class="v" style="color:var(--emerald)">BD ${fmt(m.deposit)}</div></div>
    <div class="money"><div class="l">Balance due</div><div class="v" style="color:var(--amber)">BD ${fmt(m.balance)}</div></div>`
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
      <tr data-id="${v.id}">
        <td data-label="Category"><select data-f="category" class="cat-select">${catOptions(v.category)}</select></td>
        <td data-label="Vendor"><input value="${escapeAttr(v.name)}" data-f="name" placeholder="Name / IG"></td>
        <td data-label="Contact">${contactCell(v)}</td>
        <td data-label="Status"><select data-f="status" class="stat s-${v.status}">${Object.keys(STATUS_SHORT)
          .map(
            (k) =>
              `<option value="${k}" ${v.status === k ? 'selected' : ''} title="${escapeAttr(STATUS[k])}">${STATUS_SHORT[k]}</option>`,
          )
          .join('')}</select></td>
        <td data-label="Quote"><input value="${escapeAttr(v.quote)}" data-f="quote" inputmode="decimal" placeholder="0"></td>
        <td data-label="Deposit"><input value="${escapeAttr(v.deposit)}" data-f="deposit" inputmode="decimal" placeholder="0"></td>
        <td data-label="Balance"><input value="${escapeAttr(v.balance)}" data-f="balance" inputmode="decimal" placeholder="0"></td>
        <td data-label="Balance due"><input value="${escapeAttr(v.balance_due)}" data-f="balance_due" type="text" placeholder="date" onfocus="(this.type='date')" onblur="if(!this.value)this.type='text'"></td>
        <td data-label="Updated" class="upd">${byTag(v, meId())}</td>
        <td class="del-cell"><button class="del" title="Delete" data-del="${v.id}">✕</button></td>
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
      v[f] = NUMERIC.has(f) ? e.target.value : e.target.value
      v.by = 'You'
      v.byId = meId()
      v.at = new Date().toISOString()
      tr.querySelector('.upd').innerHTML = byTag(v, meId())
      if (f === 'status') e.target.className = `stat s-${e.target.value}`
      if (f === 'status' || NUMERIC.has(f)) {
        renderMoney()
        renderDash()
      }
      pushVendor(v.id)
    })
  })

  body.querySelectorAll('.del').forEach((b) =>
    b.addEventListener('click', async (e) => {
      const id = e.target.dataset.del
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
    }),
  )

  renderMoney()
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
