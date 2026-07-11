import { api } from './api.js'
import { CHECKLIST } from './content.js'
import { renderDash, renderOverall } from './dashboard.js'
import { weekStats } from './stats.js'
import { bumpRev, meId, store } from './store.js'
import { byTag } from './util.js'

const ownerLabel = (o) => (o === 'you' ? 'You' : o === 'her' ? 'Noor' : 'Both')
const ownerClass = (o) => (o === 'you' ? 'you' : o === 'her' ? 'her' : 'shared')

export function renderChecklist() {
  const el = document.getElementById('tab-checklist')
  if (!el) return
  el.innerHTML = CHECKLIST.map((w) => {
    const s = weekStats(w)
    const p = s.total ? Math.round((s.done / s.total) * 100) : 0
    return `<div class="card ${w.gate ? 'gate' : ''}">
      <div class="week-head"><h2>${w.title}</h2><span class="badge">${w.sub}</span></div>
      <div class="mini-progress"><div class="bar ${w.gate ? 'gold' : ''}"><span style="width:${p}%"></span></div><div class="lab">${s.done}/${s.total}</div></div>
      <ul class="checks">${w.items
        .map((it, i) => {
          const key = `${w.id}-${i}`
          const e = store.data.checks?.[key]
          const on = !!e?.done
          const owner = it[1]
          const ownerTag = owner
            ? `<span class="owner-tag t-${ownerClass(owner)}">${ownerLabel(owner)}</span>`
            : ''
          const who = on ? byTag(e, meId()) : ''
          return `<li class="${on ? 'done' : ''}">
          <input type="checkbox" class="cbx ${w.gate ? 'gold' : ''}" data-key="${key}" ${on ? 'checked' : ''}>
          <span class="txt">${it[0]}${ownerTag}${who}</span></li>`
        })
        .join('')}</ul></div>`
  }).join('')

  el.querySelectorAll('.cbx').forEach((cb) =>
    cb.addEventListener('change', async (e) => {
      const key = e.target.dataset.key
      const done = e.target.checked
      store.data.checks[key] = {
        done,
        by: 'You',
        byId: meId(),
        at: new Date().toISOString(),
      }
      renderChecklist()
      renderDash()
      renderOverall()
      try {
        bumpRev(await api.check(key, done))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )
}
