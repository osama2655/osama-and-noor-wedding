import { api } from './api.js'
import { ASK_EVERY_HALL, PHOTOVIDEO, VENUE_BACKUPS, VENUES } from './content.js'
import { bumpRev, meId, store } from './store.js'
import { byTag } from './util.js'

const tel = (phone) => phone.replace(/\s+/g, '')

export function renderShortlist() {
  const host = document.getElementById('shortlist')
  if (!host) return
  const picks = store.data.picks || (store.data.picks = {})

  const venueCard = (v, i) => {
    const key = `venue:${i}`
    const p = picks[key]
    const picked = !!p
    const who = picked ? byTag(p, meId()) : ''
    return `<div class="hall ${picked ? 'picked' : ''} ${v.startHere ? 'start' : ''}">
      <button class="star" data-pick="${key}" title="${picked ? 'Remove from saved' : 'Save this hall'}">${picked ? '★' : '☆'}</button>
      <div class="hall-body">
        <div class="hall-top">
          <span class="hall-name">${v.n}</span>
          ${v.startHere ? '<span class="hall-badge">Start here</span>' : ''}
        </div>
        <div class="hall-area">${v.area}</div>
        <div class="hall-note">${v.note}</div>
        ${who}
      </div>
      <a class="hall-call" href="tel:${tel(v.phone)}">Call ${v.phone}</a>
    </div>`
  }

  host.innerHTML = `
    <div class="halls">${VENUES.map(venueCard).join('')}</div>
    <div class="backups">
      <span class="backups-label">Backups</span>
      ${VENUE_BACKUPS.map((b) => `<a class="chip" href="tel:${tel(b.phone)}">${b.n} · ${b.phone}</a>`).join('')}
    </div>
    <div class="pv">
      <div class="vh">Photo and video</div>
      <div class="pv-req">${PHOTOVIDEO.requirement}</div>
      <div class="chips">${PHOTOVIDEO.days.map((d) => `<span class="chip">${d}</span>`).join('')}</div>
      <div class="hint" style="margin-top:8px">Sourced via ${PHOTOVIDEO.sourcedVia}.</div>
    </div>
    <div class="ask">
      <div class="vh">Ask every hall</div>
      <ol class="ask-list">${ASK_EVERY_HALL.map((q) => `<li>${q}</li>`).join('')}</ol>
    </div>`

  host.querySelectorAll('.star').forEach((b) =>
    b.addEventListener('click', async (e) => {
      const key = e.currentTarget.dataset.pick
      const picked = !store.data.picks[key]
      if (picked)
        store.data.picks[key] = {
          by: 'You',
          byId: meId(),
          at: new Date().toISOString(),
        }
      else delete store.data.picks[key]
      renderShortlist()
      try {
        bumpRev(await api.pick(key, picked))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )
}
