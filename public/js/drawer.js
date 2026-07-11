import { api } from './api.js'
import { googleMap, instagramCard } from './embeds.js'
import { isSaved, toggleSave } from './saves.js'
import { bumpRev, meId, store } from './store.js'
import { escapeHtml } from './util.js'

let current = null

const tel = (p) => p.replace(/\s+/g, '')
const initials = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()

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

function drawerHTML(item) {
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
  const row = (store.data.catalog || []).find((c) => c.id === item.id)
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
