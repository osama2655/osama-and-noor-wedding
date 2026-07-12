import { CHECKLIST } from './content.js'
import { checkStats, moneyTotals, overallPercent, weekStats } from './stats.js'
import { store } from './store.js'

export function renderOverall() {
  const p = overallPercent()
  const bar = document.getElementById('overallBar')
  if (bar) bar.style.width = `${p}%`
  const pct = document.getElementById('overallPct')
  if (pct) pct.textContent = `${p}%`
  const c = checkStats()
  const sub = document.getElementById('overallSub')
  if (sub)
    sub.textContent = `${c.done} of ${c.total} tasks done, the Day 10 gate ahead`
}

export function renderDash() {
  const el = document.getElementById('tab-dash')
  if (!el) return
  const c = checkStats()
  const gate = CHECKLIST.find((w) => w.id === 'gate')
  const gs = weekStats(gate)
  const money = moneyTotals()
  const vendorCount = (store.data?.vendors || []).length

  el.innerHTML = `
    <div class="dash-hero">
      <div class="eyebrow">Bahrain Wedding · The Battle Plan</div>
      <h1 class="title">Osama <span class="amp">&amp;</span> Noor</h1>
      <div class="subtitle">Everything locked and paid by the Day 10 gate. The final stretch is calm.</div>
      <div class="countdown" id="countdown"></div>
      <div class="datechip">Wedding day: <span id="wedDateLabel"></span> <button id="editDate">edit</button></div>
    </div>
    <div class="overall">
      <div class="row">
        <div><strong style="font-size:15px">Overall progress</strong>
          <div style="color:var(--muted);font-size:12.5px" id="overallSub"></div></div>
        <div class="pct" id="overallPct">0%</div>
      </div>
      <div class="bar"><span id="overallBar"></span></div>
    </div>
    <div class="card">
      <h2>Where things stand</h2>
      <div class="money-row">
        <div class="money"><div class="l">Tasks done</div><div class="v">${c.done}<small>/${c.total}</small></div></div>
        <div class="money"><div class="l">Vendors booked</div><div class="v">${money.booked}<small>/${vendorCount}</small></div></div>
        <div class="money"><div class="l">Day 10 gate</div><div class="v" style="color:${gs.done === gs.total ? 'var(--emerald)' : 'var(--amber)'}">${gs.done}<small>/${gs.total}</small></div></div>
      </div>
    </div>
    <div class="card">
      <h2>Progress by phase</h2>
      <div id="dashBars" style="margin-top:12px"></div>
    </div>`

  const bars = document.getElementById('dashBars')
  bars.innerHTML = CHECKLIST.map((w) => {
    const s = weekStats(w)
    return { lab: w.title, done: s.done, total: s.total, gold: w.id === 'gate' }
  })
    .map((r) => {
      const p = r.total ? Math.round((r.done / r.total) * 100) : 0
      return `<div class="mini-progress">
      <div>${r.lab}</div>
      <div class="bar ${r.gold ? 'gold' : ''}"><span style="width:${p}%"></span></div>
      <div class="lab">${r.done}/${r.total}</div></div>`
    })
    .join('')
}
