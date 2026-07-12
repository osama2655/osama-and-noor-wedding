import { api } from './api.js'
import { googleMap, instagramCard } from './embeds.js'
import { isSaved, toggleSave } from './saves.js'
import { bumpRev, meId, store } from './store.js'
import { escapeAttr, escapeHtml } from './util.js'

let current = null

const tel = (p) => p.replace(/\s+/g, '')
const initials = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()

// The contact pipeline surfaced on the drawer. Values match VENDOR_STATUSES server-side.
const STATUS_STEPS = [
  { key: 'todo', label: 'Not contacted' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'booked', label: 'Booked' },
  { key: 'paid', label: 'Paid' },
]

// The live catalog row (with remarks + files), not the possibly-stale opener snapshot.
const liveRow = (id) => (store.data.catalog || []).find((c) => c.id === id)

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
  if (item.area) c.push(`<span class="dw-chip">${escapeHtml(item.area)}</span>`)
  if (item.capacity)
    c.push(`<span class="dw-chip">${item.capacity} guests</span>`)
  if (item.category === 'venue' && item.segregated)
    c.push('<span class="dw-chip ok">Segregated layout</span>')
  if (item.category === 'photo') {
    c.push(
      item.femaleCrew
        ? '<span class="dw-chip ok">Female crew confirmed</span>'
        : '<span class="dw-chip warn">Female crew to confirm</span>',
    )
  }
  return c.join('')
}

function statusHTML(row) {
  const active = row.status || 'todo'
  const btns = STATUS_STEPS.map(
    (s) =>
      `<button class="dw-status ${s.key === active ? 'on' : ''}" data-status="${s.key}">${s.label}</button>`,
  ).join('')
  return `<div class="dw-section">
      <div class="dw-section-h">Where we are</div>
      <div class="dw-statusrow">${btns}</div>
    </div>`
}

function remarkHTML(r) {
  const meta = [r.by, fmtWhen(r.at)].filter(Boolean).join(' &middot; ')
  return `<div class="dw-remark" data-remark="${r.id}">
      <div class="dw-remark-body">${escapeHtml(r.body)}</div>
      <div class="dw-remark-foot"><span class="dw-remark-meta">${meta}</span><button class="dw-mini-x" data-remark-del="${r.id}" title="Delete">&times;</button></div>
    </div>`
}

function remarksHTML(row) {
  const list = row.remarks || []
  const items = list.length
    ? list.map(remarkHTML).join('')
    : '<div class="dw-empty">No remarks yet.</div>'
  return `<div class="dw-section">
      <div class="dw-section-h">Remarks</div>
      <div class="dw-remarks">${items}</div>
      <div class="dw-remark-add">
        <textarea id="dw-remark-input" rows="2" placeholder="Add a remark, e.g. Called, quoted BD 1100, holds our date"></textarea>
        <button class="dw-btn sm" id="dw-remark-save">Add remark</button>
      </div>
    </div>`
}

function fileHTML(f) {
  return `<div class="dw-file" data-file="${f.id}">
      <a class="dw-file-link" href="${escapeAttr(api.catalogFileUrl(f.id))}" target="_blank" rel="noopener">
        <span class="dw-file-name">${escapeHtml(f.name)}</span>
        <span class="dw-file-size">${fmtBytes(f.size)}</span>
      </a>
      <button class="dw-mini-x" data-file-del="${f.id}" title="Delete">&times;</button>
    </div>`
}

function filesHTML(row) {
  const list = row.files || []
  const items = list.length
    ? list.map(fileHTML).join('')
    : '<div class="dw-empty">No files yet.</div>'
  return `<div class="dw-section">
      <div class="dw-section-h">Files</div>
      <div class="dw-files">${items}</div>
      <label class="dw-btn ghost sm dw-upload">
        <span id="dw-upload-label">Upload a file</span>
        <input type="file" id="dw-file-input" hidden>
      </label>
      <div class="dw-hint-sm">PDF, PowerPoint, Word, images. Up to 20 MB each.</div>
    </div>`
}

function drawerHTML(item) {
  const row = liveRow(item.id) || item
  const saved = isSaved(item)
  const showMap = item.category === 'venue' && item.mapsQuery
  return `
    <div class="dw-backdrop" data-close></div>
    <aside class="dw-panel" role="dialog" aria-label="${escapeHtml(item.name)}">
      <div class="dw-hero">
        <button class="dw-x" data-close aria-label="Close">&times;</button>
        <div class="dw-monogram">${initials(item.name)}</div>
        <button class="dw-star ${saved ? 'on' : ''}" data-star aria-label="Save">${saved ? '★' : '☆'}</button>
      </div>
      <div class="dw-body">
        <div class="dw-titlerow">
          <h2>${escapeHtml(item.name)}</h2>
          ${item.featured ? '<span class="dw-badge">Start here</span>' : ''}
        </div>
        <div class="dw-chips">${chips(item)}</div>
        ${item.note ? `<p class="dw-note">${escapeHtml(item.note)}</p>` : ''}
        ${item.verify ? `<div class="dw-verify"><b>Verify</b> ${escapeHtml(item.verify)}</div>` : ''}
        <div id="dw-ig" class="dw-ig"></div>
        ${showMap ? '<div id="dw-map" class="dw-map"></div>' : ''}
        <div class="dw-actions">
          ${item.phone ? `<a class="dw-btn" href="tel:${tel(item.phone)}">Call ${escapeHtml(item.phone)}</a>` : ''}
          ${showMap ? `<a class="dw-btn ghost" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.mapsQuery)}" target="_blank" rel="noopener">Directions</a>` : ''}
          ${item.category === 'photo' ? `<button class="dw-btn ${item.femaleCrew ? 'ghost' : ''}" data-female>${item.femaleCrew ? 'Female crew confirmed' : 'Mark female crew confirmed'}</button>` : ''}
        </div>
        ${statusHTML(row)}
        ${remarksHTML(row)}
        ${filesHTML(row)}
      </div>
    </aside>`
}

export function openDrawer(item, onChange) {
  current = item
  const root = document.getElementById('drawer-root')
  if (!root) return
  root.innerHTML = drawerHTML(item)
  root.classList.add('open')
  document.body.style.overflow = 'hidden'

  instagramCard(root.querySelector('#dw-ig'), item.instagram)
  googleMap(root.querySelector('#dw-map'), item.mapsQuery)

  root
    .querySelectorAll('[data-close]')
    .forEach((el) => el.addEventListener('click', closeDrawer))
  root.querySelector('[data-star]')?.addEventListener('click', async (e) => {
    const picked = await toggleSave(item)
    e.currentTarget.classList.toggle('on', picked)
    e.currentTarget.textContent = picked ? '★' : '☆'
    onChange?.()
  })
  root.querySelector('[data-female]')?.addEventListener('click', () => {
    markFemaleConfirmed(item, onChange)
  })

  wireStatus(root, item, onChange)
  wireRemarks(root, item, onChange)
  wireFiles(root, item, onChange)
}

function wireStatus(root, item, onChange) {
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
      openDrawer(item, onChange)
      onChange?.()
      try {
        bumpRev(await api.catalog({ ...item, status }))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )
}

function wireRemarks(root, item, onChange) {
  const input = root.querySelector('#dw-remark-input')
  root.querySelector('#dw-remark-save')?.addEventListener('click', async () => {
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
      openDrawer(item, onChange)
      onChange?.()
    } catch (_) {
      /* ignore */
    }
  })

  root.querySelectorAll('[data-remark-del]').forEach((b) =>
    b.addEventListener('click', async () => {
      const id = Number(b.dataset.remarkDel)
      const row = liveRow(item.id)
      if (row) row.remarks = (row.remarks || []).filter((x) => x.id !== id)
      openDrawer(item, onChange)
      onChange?.()
      try {
        bumpRev(await api.catalogRemarkDelete(id))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )
}

function wireFiles(root, item, onChange) {
  const fileInput = root.querySelector('#dw-file-input')
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0]
    if (!file) return
    const label = root.querySelector('#dw-upload-label')
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
      openDrawer(item, onChange)
      onChange?.()
    } catch (err) {
      const label2 = root.querySelector('#dw-upload-label')
      if (label2) label2.textContent = err.message || 'Upload failed'
    }
  })

  root.querySelectorAll('[data-file-del]').forEach((b) =>
    b.addEventListener('click', async () => {
      const id = Number(b.dataset.fileDel)
      const row = liveRow(item.id)
      if (row) row.files = (row.files || []).filter((x) => x.id !== id)
      openDrawer(item, onChange)
      onChange?.()
      try {
        bumpRev(await api.catalogFileDelete(id))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )
}

export function closeDrawer() {
  current = null
  const root = document.getElementById('drawer-root')
  if (!root) return
  root.classList.remove('open')
  root.innerHTML = ''
  document.body.style.overflow = ''
}

export const isDrawerOpen = () => !!current

// Confirming a female crew is a real catalog edit.
async function markFemaleConfirmed(item, onChange) {
  const row = liveRow(item.id)
  if (row) {
    row.femaleCrew = true
    row.by = 'You'
    row.byId = meId()
    row.at = new Date().toISOString()
  }
  item.femaleCrew = true
  openDrawer(item, onChange)
  onChange?.()
  try {
    bumpRev(await api.catalog({ ...item, femaleCrew: true }))
  } catch (_) {
    /* next poll reconciles */
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && current) closeDrawer()
})
