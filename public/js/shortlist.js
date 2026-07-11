import { api } from './api.js'
import { SHORTLIST } from './content.js'
import { bumpRev, meId, store } from './store.js'
import { byTag } from './util.js'

let picksOnly = false

export function renderShortlist() {
  const host = document.getElementById('shortlist')
  if (!host) return
  const picks = store.data.picks || (store.data.picks = {})
  const total = Object.keys(picks).length

  const cats = SHORTLIST.map((c, ci) => {
    const chips = c.v
      .map((v, vi) => {
        const key = `${ci}:${vi}`
        const p = picks[key]
        const picked = !!p
        if (picksOnly && !picked) return ''
        const label =
          v.n + (v.h ? ` · ${v.h}` : '') + (v.extra ? ` · ${v.extra}` : '')
        const inner = v.u
          ? `<a href="${v.u}" target="_blank" rel="noopener">${label}</a>`
          : `<span>${label}</span>`
        const who = picked ? byTag(p, meId()) : ''
        return `<span class="chip pick ${picked ? 'picked' : ''}"><button class="star" data-pick="${key}" title="${picked ? 'Remove from shortlist' : 'Add to shortlist'}">${picked ? '★' : '☆'}</button>${inner}${who}</span>`
      })
      .join('')
    if (picksOnly && !chips) return ''
    return `<div class="vcat">
      <div class="vh">${c.cat}</div>
      ${!picksOnly && c.note ? `<div class="hint" style="margin:0 0 8px">${c.note}</div>` : ''}
      <div class="chips">${chips}</div>
    </div>`
  }).join('')

  host.innerHTML = `
    <div class="sl-toolbar">
      <div class="sl-count">${total ? `★ ${total} vendor${total > 1 ? 's' : ''} shortlisted` : 'Tap ☆ on any vendor to add it to your shortlist'}</div>
      <div style="display:flex;gap:8px">
        ${total ? `<button class="btn ghost sm" id="picksOnlyBtn">${picksOnly ? 'Show all' : 'Show my picks'}</button>` : ''}
        ${total ? '<button class="btn ghost sm" id="clearPicksBtn">Clear</button>' : ''}
      </div>
    </div>
    ${cats || '<div class="empty">Nothing shortlisted yet — tap "Show all".</div>'}`

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

  const po = document.getElementById('picksOnlyBtn')
  if (po)
    po.addEventListener('click', () => {
      picksOnly = !picksOnly
      renderShortlist()
    })

  const cp = document.getElementById('clearPicksBtn')
  if (cp)
    cp.addEventListener('click', async () => {
      if (!confirm('Clear all shortlisted vendors?')) return
      const keys = Object.keys(store.data.picks)
      store.data.picks = {}
      picksOnly = false
      renderShortlist()
      for (const k of keys) {
        try {
          bumpRev(await api.pick(k, false))
        } catch (_) {
          /* ignore */
        }
      }
    })
}
