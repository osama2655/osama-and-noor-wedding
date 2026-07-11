import { CHECKLIST, DECISIONS } from './content.js'
import {
  checkStats,
  decisionsDone,
  moneyTotals,
  overallPercent,
  weekStats,
} from './stats.js'
import { store } from './store.js'
import { fmt } from './util.js'

export function renderOverall() {
  const p = overallPercent()
  const bar = document.getElementById('overallBar')
  if (bar) bar.style.width = `${p}%`
  const pct = document.getElementById('overallPct')
  if (pct) pct.textContent = `${p}%`
  const c = checkStats()
  const sub = document.getElementById('overallSub')
  if (sub)
    sub.textContent = `${c.done + decisionsDone()} of ${c.total + DECISIONS.length} items · Day −10 hard gate ahead`
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
    <div class="card">
      <h2>Where things stand</h2>
      <div class="money-row">
        <div class="money"><div class="l">Tasks done</div><div class="v">${c.done}<small>/${c.total}</small></div></div>
        <div class="money"><div class="l">8 Decisions</div><div class="v">${decisionsDone()}<small>/8</small></div></div>
        <div class="money"><div class="l">Vendors booked</div><div class="v">${money.booked}<small>/${vendorCount}</small></div></div>
        <div class="money"><div class="l">Day −10 gate</div><div class="v" style="color:${gs.done === gs.total ? 'var(--emerald)' : 'var(--amber)'}">${gs.done}<small>/${gs.total}</small></div></div>
      </div>
    </div>
    <div class="card">
      <h2>Progress by phase</h2>
      <div id="dashBars" style="margin-top:12px"></div>
    </div>
    <div class="card">
      <h2>Money at a glance</h2>
      <div class="money-row">
        <div class="money"><div class="l">Total quoted</div><div class="v">BD ${fmt(money.quote)}</div></div>
        <div class="money"><div class="l">Deposits paid</div><div class="v" style="color:var(--emerald)">BD ${fmt(money.deposit)}</div></div>
        <div class="money"><div class="l">Balance outstanding</div><div class="v" style="color:var(--amber)">BD ${fmt(money.balance)}</div></div>
      </div>
      <p class="hint" style="margin:12px 0 0">Fill the tracker in the <b>Vendors &amp; £</b> tab and these update live.</p>
    </div>`

  const bars = document.getElementById('dashBars')
  bars.innerHTML = [
    { lab: '8 Decisions', done: decisionsDone(), total: 8, gold: true },
    ...CHECKLIST.map((w) => {
      const s = weekStats(w)
      return {
        lab:
          w.title.replace('🚩 ', '').replace(/ —.*/, '') +
          (w.id === 'gate' ? ' gate' : ''),
        done: s.done,
        total: s.total,
        gold: w.id === 'gate',
      }
    }),
  ]
    .map((r) => {
      const p = r.total ? Math.round((r.done / r.total) * 100) : 0
      return `<div class="mini-progress">
      <div>${r.lab}</div>
      <div class="bar ${r.gold ? 'gold' : ''}"><span style="width:${p}%"></span></div>
      <div class="lab">${r.done}/${r.total}</div></div>`
    })
    .join('')
}
