import { api } from './api.js'
import { renderDash } from './dashboard.js'
import { googleMap, instagramCard } from './embeds.js'
import { isSaved, toggleSave } from './saves.js'
import { bumpRev, meId, store } from './store.js'
import { renderMoney, renderVendors } from './vendors.js'
import {
  closeSheet,
  confirmDelete,
  isSheetOpen,
  kebabButton,
  openKebabMenu,
  openSheet,
  toast,
  undoToast,
} from './ui.js'
import { debounce, escapeAttr, escapeHtml } from './util.js'

let sheet = null
let currentId = null

const tel = (p) => p.replace(/\s+/g, '')
const initials = (name) =>
  (name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase() || '?'

const STATUS_STEPS = [
  { key: 'todo', label: 'Not contacted' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'booked', label: 'Booked' },
  { key: 'paid', label: 'Paid' },
]

// Map a catalog category to the closest Payments-tracker category label.
const PAY_CATEGORY = {
  venue: 'Venue',
  photo: 'Photo + video',
  hmua: 'HMUA (hair & makeup)',
  henna: 'Henna artist',
  cake: 'Cake',
  caterer: 'Catering / menu',
  transport: 'Wedding car / transport',
  car: 'Wedding car / transport',
  other: '',
}

const linkedVendor = (id) =>
  (store.data.vendors || []).find((v) => Number(v.catalogId) === Number(id))

const liveRow = (id) => (store.data.catalog || []).find((c) => c.id === id)
const nameOf = (item) => (liveRow(item.id) || item).name || 'Untitled listing'

const fmtBytes = (n) => {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
const fmtWhen = (at) => {
  if (!at) return ''
  const d = new Date(`${String(at).replace(' ', 'T')}Z`)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString()
}

function chips(item) {
  const c = []
  if (item.area) c.push(`<span class="chip">${escapeHtml(item.area)}</span>`)
  if (item.capacity) c.push(`<span class="chip">${item.capacity} guests</span>`)
  if (item.category === 'venue' && item.segregated)
    c.push('<span class="chip ok">Segregated layout</span>')
  if (item.category === 'photo')
    c.push(
      item.femaleCrew
        ? '<span class="chip ok">Female crew confirmed</span>'
        : '<span class="chip warn">Female crew to confirm</span>',
    )
  return c.length ? `<div class="cd-chips">${c.join('')}</div>` : ''
}

const field = (label, f, value, ph = '', wide = false) =>
  `<label class="ff ${wide ? 'ff-wide' : ''}"><span>${label}</span><input class="field" data-f="${f}" value="${escapeAttr(value ?? '')}" placeholder="${ph}"></label>`

function detailsForm(row) {
  const isVenue = row.category === 'venue'
  const toggle = (f, label) =>
    `<button class="seg ${row[f] ? 'on' : ''}" type="button" data-toggle="${f}">${label}</button>`
  return `<div class="cd-sec">
      <div class="cd-h">Details</div>
      <div class="form-grid">
        ${field('Name', 'name', row.name, 'e.g. Studio Classic')}
        ${field('Instagram', 'instagram', row.instagram, '@handle')}
        ${field('Phone', 'phone', row.phone, '+973 ...')}
        ${field('Area', 'area', row.area, 'e.g. Dumistan')}
        ${isVenue ? field('Capacity', 'capacity', row.capacity, 'guests') : ''}
        ${isVenue ? field('Maps query', 'mapsQuery', row.mapsQuery, 'name or address') : ''}
        <label class="ff ff-wide"><span>Note</span><textarea class="field" data-f="note" rows="2" placeholder="Short description">${escapeHtml(row.note || '')}</textarea></label>
        <label class="ff ff-wide"><span>Still to confirm</span><input class="field" data-f="verify" value="${escapeAttr(row.verify ?? '')}" placeholder="What still needs confirming"></label>
      </div>
      <div class="segmented soft" style="margin-top:12px">
        ${toggle('featured', 'Start here')}
        ${isVenue ? toggle('segregated', 'Segregated layout') : ''}
      </div>
    </div>`
}

function statusSec(row) {
  const active = row.status || 'todo'
  return `<div class="cd-sec">
      <div class="cd-h">Where we are</div>
      <div class="segmented">${STATUS_STEPS.map((s) => `<button class="seg ${s.key === active ? 'on' : ''}" type="button" data-status="${s.key}">${s.label}</button>`).join('')}</div>
      ${bookingBar(row)}
    </div>`
}

// The bridge to the Payments tracker: create a linked payment row, or jump to it.
function bookingBar(row) {
  const v = linkedVendor(row.id)
  if (v) {
    const bits = []
    if (v.quote) bits.push(`Quote BD ${v.quote}`)
    if (v.deposit) bits.push(`Deposit BD ${v.deposit}`)
    if (v.balance) bits.push(`Balance BD ${v.balance}`)
    return `<div class="cd-book linked">
        <div class="cd-book-txt"><strong>Tracked in Payments</strong><span>${bits.length ? bits.join(' &middot; ') : 'No amounts entered yet'}</span></div>
        <button class="btn ghost sm" type="button" data-viewpay>Open</button>
      </div>`
  }
  const booked = row.status === 'booked' || row.status === 'paid'
  return `<div class="cd-book">
      <div class="cd-book-txt"><strong>${booked ? 'Booked &mdash; track the money' : 'Add to Payments'}</strong><span>Create a Payments row for the deposit and balance.</span></div>
      <button class="btn sm" type="button" data-addpay>Add to Payments</button>
    </div>`
}

function remarkHTML(r) {
  const meta = [r.by, fmtWhen(r.at)].filter(Boolean).join(' &middot; ')
  return `<div class="cd-remark" data-remark="${r.id}">
      <div class="cd-remark-body">${escapeHtml(r.body)}</div>
      <div class="cd-remark-foot"><span class="cd-remark-meta">${meta}</span>${kebabButton('Remark actions')}</div>
    </div>`
}

function remarksSec(row) {
  const list = row.remarks || []
  const items = list.length
    ? list.map(remarkHTML).join('')
    : '<div class="cd-empty">No remarks yet.</div>'
  return `<div class="cd-sec">
      <div class="cd-h">Call log</div>
      <div class="cd-remarks">${items}</div>
      <div class="cd-add">
        <textarea class="field" id="cd-remark-input" rows="2" placeholder="Add a remark, e.g. Called, quoted BD 1100, holds our date"></textarea>
        <button class="btn sm" id="cd-remark-save">Add remark</button>
      </div>
    </div>`
}

function fileHTML(f) {
  return `<div class="cd-file" data-file="${f.id}">
      <a class="cd-file-link" href="${escapeAttr(api.catalogFileUrl(f.id))}" target="_blank" rel="noopener">
        <span class="cd-file-name">${escapeHtml(f.name)}</span>
        <span class="cd-file-size">${fmtBytes(f.size)}</span>
      </a>
      ${kebabButton('File actions')}
    </div>`
}

function filesSec(row) {
  const list = row.files || []
  const items = list.length
    ? list.map(fileHTML).join('')
    : '<div class="cd-empty">No files yet.</div>'
  return `<div class="cd-sec">
      <div class="cd-h">Quotes and files</div>
      <div class="cd-files">${items}</div>
      <label class="btn ghost sm cd-upload">
        <span id="cd-upload-label">Upload a file</span>
        <input type="file" id="cd-file-input" hidden>
      </label>
      <div class="cd-hint">PDF, PowerPoint, Word, images. Up to 20 MB each.</div>
    </div>`
}

function bodyHTML(item) {
  const row = liveRow(item.id) || item
  const showMap = row.category === 'venue' && row.mapsQuery
  return `
    <div class="cd-top">
      <div class="cd-mono">${initials(row.name)}</div>
      ${chips(row)}
    </div>
    <div class="cd-actions">
      ${row.phone ? `<a class="btn" href="tel:${tel(row.phone)}">Call</a>` : ''}
      ${showMap ? `<a class="btn ghost" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(row.mapsQuery)}" target="_blank" rel="noopener">Directions</a>` : ''}
      ${row.category === 'photo' ? `<button class="btn ${row.femaleCrew ? 'ghost' : ''}" type="button" data-female>${row.femaleCrew ? 'Female crew confirmed' : 'Confirm female crew'}</button>` : ''}
    </div>
    <div id="cd-ig" class="cd-ig"></div>
    ${statusSec(row)}
    ${detailsForm(row)}
    ${showMap ? `<details class="cd-map-d"><summary>Show location map</summary><div id="cd-map" class="cd-map"></div></details>` : ''}
    ${remarksSec(row)}
    ${filesSec(row)}`
}

// Keep the historical export name so catalog.js/favorites.js call sites do not change.
export function openDrawer(item, onChange) {
  currentId = item.id
  sheet = openSheet({
    title: nameOf(item),
    size: 'md',
    headActions: `<button class="sheet-star" type="button" data-star aria-label="Save">${isSaved(item) ? '★' : '☆'}</button>${kebabButton('Listing actions')}`,
    content: bodyHTML(item),
    onClose: () => {
      currentId = null
      sheet = null
    },
  })
  if (!sheet) return

  const paint = () => {
    if (!sheet) return
    sheet.body.innerHTML = bodyHTML(item)
    const t = sheet.panel.querySelector('.sheet-title')
    if (t) t.textContent = nameOf(item)
    updateStar(item)
    wireBody(item, onChange, paint)
    mountEmbeds(item)
  }

  wireHead(item, onChange, paint)
  wireBody(item, onChange, paint)
  mountEmbeds(item)
}

function updateStar(item) {
  const b = sheet?.panel.querySelector('[data-star]')
  if (!b) return
  const saved = isSaved(item)
  b.textContent = saved ? '★' : '☆'
  b.classList.toggle('on', saved)
}

function mountEmbeds(item) {
  if (!sheet) return
  instagramCard(sheet.body.querySelector('#cd-ig'), item.instagram)
  const d = sheet.body.querySelector('.cd-map-d')
  if (d)
    d.addEventListener(
      'toggle',
      () => {
        if (d.open)
          googleMap(sheet.body.querySelector('#cd-map'), item.mapsQuery)
      },
      { once: true },
    )
}

function pushName(item) {
  const row = liveRow(item.id)
  if (row) {
    row.by = 'You'
    row.byId = meId()
  }
  pushCatalog(item.id)
}

const pushCatalog = debounce(async (id) => {
  const row = liveRow(id)
  if (!row) return
  try {
    bumpRev(await api.catalog({ ...row }))
  } catch (_) {
    /* next poll reconciles */
  }
}, 500)

function wireHead(item, onChange, paint) {
  sheet.panel.querySelector('[data-star]')?.addEventListener('click', async () => {
    await toggleSave(item)
    updateStar(item)
    onChange?.()
  })
  sheet.panel.querySelector('[data-kebab]')?.addEventListener('click', (e) => {
    e.stopPropagation()
    openKebabMenu(e.currentTarget, [
      {
        label: 'Delete listing',
        destructive: true,
        onClick: () => deleteListing(item, onChange),
      },
    ])
  })
}

function wireBody(item, onChange, paint) {
  const root = sheet.body

  root.querySelectorAll('[data-f]').forEach((inp) =>
    inp.addEventListener('input', (e) => {
      const f = e.target.dataset.f
      const val = e.target.value
      const row = liveRow(item.id)
      if (row) row[f] = val
      item[f] = val
      pushName(item)
      if (f === 'name') {
        const t = sheet.panel.querySelector('.sheet-title')
        if (t) t.textContent = val || 'Untitled listing'
        onChange?.()
      }
    }),
  )

  root.querySelectorAll('[data-toggle]').forEach((b) =>
    b.addEventListener('click', async () => {
      const f = b.dataset.toggle
      const next = !item[f]
      const row = liveRow(item.id)
      if (row) row[f] = next
      item[f] = next
      paint()
      onChange?.()
      try {
        bumpRev(await api.catalog({ ...item, [f]: next }))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )

  root.querySelector('[data-female]')?.addEventListener('click', () =>
    markFemaleConfirmed(item, onChange, paint),
  )

  root.querySelectorAll('[data-status]').forEach((b) =>
    b.addEventListener('click', async () => {
      const status = b.dataset.status
      const row = liveRow(item.id)
      if (row) {
        row.status = status
        row.by = 'You'
        row.byId = meId()
      }
      item.status = status
      paint()
      onChange?.()
      try {
        bumpRev(await api.catalog({ ...item, status }))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )

  root
    .querySelector('[data-addpay]')
    ?.addEventListener('click', () => addToPayments(item, paint))
  root.querySelector('[data-viewpay]')?.addEventListener('click', () => {
    closeSheet()
    goToPayments()
  })

  wireRemarks(item, onChange, paint)
  wireFiles(item, onChange, paint)
}

function wireRemarks(item, onChange, paint) {
  const root = sheet.body
  const input = root.querySelector('#cd-remark-input')
  root.querySelector('#cd-remark-save')?.addEventListener('click', async () => {
    const body = (input?.value || '').trim()
    if (!body) return
    try {
      const r = await api.catalogRemark(item.id, body)
      bumpRev(r)
      const row = liveRow(item.id)
      if (row) {
        row.remarks = row.remarks || []
        row.remarks.unshift({
          id: r.id,
          body,
          by: 'You',
          byId: meId(),
          at: new Date().toISOString(),
        })
      }
      paint()
      onChange?.()
    } catch (_) {
      /* ignore */
    }
  })

  root.querySelectorAll('.cd-remark [data-kebab]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = Number(b.closest('.cd-remark').dataset.remark)
      openKebabMenu(b, [
        { label: 'Edit', onClick: () => editRemark(item, id, onChange, paint) },
        {
          label: 'Delete',
          destructive: true,
          separatorBefore: true,
          onClick: () => deleteRemark(item, id, onChange, paint),
        },
      ])
    }),
  )
}

function editRemark(item, id, onChange, paint) {
  const box = sheet.body.querySelector(`.cd-remark[data-remark="${id}"]`)
  const remark = (liveRow(item.id)?.remarks || []).find((x) => x.id === id)
  if (!box || !remark) return
  box.innerHTML = `<textarea class="field" rows="3">${escapeHtml(remark.body)}</textarea>
    <div class="cd-remark-foot" style="justify-content:flex-end;margin-top:8px">
      <button class="btn ghost sm" type="button" data-c>Cancel</button>
      <button class="btn sm" type="button" data-s>Save</button>
    </div>`
  const ta = box.querySelector('textarea')
  ta.focus()
  box.querySelector('[data-c]').addEventListener('click', paint)
  box.querySelector('[data-s]').addEventListener('click', async () => {
    const body = ta.value.trim()
    if (!body) {
      toast({
        type: 'err',
        message: 'A remark cannot be empty. Delete it instead.',
      })
      return
    }
    const target = (liveRow(item.id)?.remarks || []).find((x) => x.id === id)
    if (target) target.body = body
    paint()
    onChange?.()
    try {
      bumpRev(await api.catalogRemarkUpdate(id, body))
    } catch (_) {
      /* next poll reconciles */
    }
  })
}

async function deleteRemark(item, id, onChange, paint) {
  const row = liveRow(item.id)
  if (row) row.remarks = (row.remarks || []).filter((x) => x.id !== id)
  paint()
  onChange?.()
  try {
    bumpRev(await api.catalogRemarkDelete(id))
  } catch (_) {
    /* next poll reconciles */
  }
}

function wireFiles(item, onChange, paint) {
  const root = sheet.body
  const fileInput = root.querySelector('#cd-file-input')
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0]
    if (!file) return
    const label = root.querySelector('#cd-upload-label')
    if (label) label.textContent = 'Uploading...'
    try {
      const r = await api.catalogFileUpload(item.id, file)
      bumpRev(r)
      const row = liveRow(item.id)
      if (row) {
        row.files = row.files || []
        row.files.unshift({
          id: r.id,
          name: file.name,
          size: file.size,
          by: 'You',
          at: new Date().toISOString(),
        })
      }
      paint()
      onChange?.()
    } catch (err) {
      if (label) label.textContent = err.message || 'Upload failed'
    }
  })

  root.querySelectorAll('.cd-file [data-kebab]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = Number(b.closest('.cd-file').dataset.file)
      openKebabMenu(b, [
        {
          label: 'Delete file',
          destructive: true,
          onClick: async () => {
            const row = liveRow(item.id)
            if (row) row.files = (row.files || []).filter((x) => x.id !== id)
            paint()
            onChange?.()
            try {
              bumpRev(await api.catalogFileDelete(id))
            } catch (_) {
              /* next poll reconciles */
            }
          },
        },
      ])
    }),
  )
}

async function deleteListing(item, onChange) {
  if (!(await confirmDelete('this listing'))) return
  const snap = { ...(liveRow(item.id) || item) }
  store.data.catalog = (store.data.catalog || []).filter((c) => c.id !== item.id)
  closeSheet()
  onChange?.()
  undoToast('Listing deleted', async () => {
    const { id, remarks, files, by, byId, at, ...fields } = snap
    const r = await api.catalog(fields)
    bumpRev(r)
    ;(store.data.catalog || (store.data.catalog = [])).push({
      ...fields,
      id: r.id,
      remarks: [],
      files: [],
    })
    onChange?.()
  })
  try {
    bumpRev(await api.catalogDelete(item.id))
  } catch (_) {
    /* next poll reconciles */
  }
}

async function markFemaleConfirmed(item, onChange, paint) {
  const row = liveRow(item.id)
  if (row) {
    row.femaleCrew = true
    row.by = 'You'
    row.byId = meId()
    row.at = new Date().toISOString()
  }
  item.femaleCrew = true
  paint()
  onChange?.()
  try {
    bumpRev(await api.catalog({ ...item, femaleCrew: true }))
  } catch (_) {
    /* next poll reconciles */
  }
}

// Create a Payments row pre-filled from this listing and link the two together.
async function addToPayments(item, paint) {
  const row = liveRow(item.id) || item
  const data = {
    category: PAY_CATEGORY[row.category] || '',
    name: row.name || 'Untitled listing',
    contact: row.phone || row.instagram || '',
    status: 'booked',
    quote: '',
    deposit: '',
    balance: '',
    balance_due: '',
    catalog_id: item.id,
  }
  try {
    const r = await api.vendor(data)
    bumpRev(r)
    ;(store.data.vendors || (store.data.vendors = [])).push({
      id: r.id,
      category: data.category,
      name: data.name,
      contact: data.contact,
      status: 'booked',
      quote: '',
      deposit: '',
      balance: '',
      balance_due: '',
      catalogId: item.id,
      by: 'You',
      byId: meId(),
      at: new Date().toISOString(),
    })
    toast({ type: 'ok', message: 'Added to Payments tracker' })
    paint()
    renderVendors()
    renderMoney()
    renderDash()
  } catch (_) {
    toast({ type: 'err', message: 'Could not add to Payments' })
  }
}

// Jump to the Payments tab (money group). Simulates the two-level nav clicks so
// no new nav export / import cycle is needed.
function goToPayments() {
  document.querySelector('#navGroups button[data-group="money"]')?.click()
  document.querySelector('#tabs button[data-tab="vendors"]')?.click()
  window.scrollTo(0, 0)
}

export function closeDrawer() {
  if (currentId != null) closeSheet()
}
export const isDrawerOpen = () => isSheetOpen()
