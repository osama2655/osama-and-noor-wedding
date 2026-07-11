import { api } from './api.js'
import { DECISIONS } from './content.js'
import { renderDash, renderOverall } from './dashboard.js'
import { bumpRev, meId, store } from './store.js'
import { byTag, debounce, escapeHtml } from './util.js'

const entry = (i) => store.data.decisions?.[i] || null

const pushDecision = debounce(async (i, answer) => {
  try {
    bumpRev(await api.decision(i, answer))
  } catch (_) {
    /* next poll reconciles */
  }
}, 500)

export function renderDecisions() {
  const box = document.getElementById('decisionsList')
  if (!box) return
  box.innerHTML = DECISIONS.map((d, i) => {
    const e = entry(i)
    const val = e?.answer || ''
    const tag = val.trim() ? byTag(e, meId()) : ''
    return `<div class="decision ${val.trim() ? 'answered' : ''}" data-i="${i}">
      <div class="num">${val.trim() ? '✓' : i + 1}</div>
      <div class="body">
        <div class="q">${d.q}${tag}</div>
        <div class="d">${d.d}</div>
        <textarea placeholder="Answer / decision…" data-dec="${i}">${escapeHtml(val)}</textarea>
      </div></div>`
  }).join('')

  box.querySelectorAll('textarea').forEach((t) => {
    t.addEventListener('input', (ev) => {
      const i = Number(ev.target.dataset.dec)
      const has = ev.target.value.trim()
      store.data.decisions[i] = {
        answer: ev.target.value,
        by: 'You',
        byId: meId(),
        at: new Date().toISOString(),
      }
      const row = ev.target.closest('.decision')
      row.classList.toggle('answered', !!has)
      row.querySelector('.num').textContent = has ? '✓' : i + 1
      renderDash()
      renderOverall()
      pushDecision(i, ev.target.value)
    })
  })
}
