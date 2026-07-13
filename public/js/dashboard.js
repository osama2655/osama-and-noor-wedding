import { CHECKLIST } from './content.js'
import { checkStats, moneyTotals, overallPercent, weekStats } from './stats.js'
import { store } from './store.js'
import { escapeHtml, fmt } from './util.js'

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

const budgetBand = () => ({
  min: store.data.budgetMin ?? 1000,
  max: store.data.budgetMax ?? 1200,
})

// Mirrors dates.js daysUntil (not exported there); keep both counting the same way.
const daysUntil = (iso) => {
  if (!iso) return null
  return Math.ceil((new Date(`${iso}T00:00:00`) - new Date()) / 86400000)
}

const awayLabel = (n) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `${n} days`)

const shortDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

function upcomingDue() {
  const out = []
  for (const v of store.data.vendors || []) {
    const days = daysUntil(v.balance_due)
    if (days !== null && days >= 0)
      out.push({
        label: `${v.name || v.category || 'Vendor'} balance`,
        date: v.balance_due,
        days,
      })
  }
  for (const d of store.data.dates || []) {
    const days = daysUntil(d.date)
    if (days !== null && days >= 0)
      out.push({ label: d.label || 'Date', date: d.date, days })
  }
  return out.sort((a, b) => a.days - b.days).slice(0, 3)
}

function onTrackCard() {
  const { quote: committed, deposit } = moneyTotals()
  const { min, max } = budgetBand()
  const cls = committed > max ? 'over' : committed < min ? 'room' : 'ok'
  const pct = Math.min(100, max ? (committed / max) * 100 : 0)
  const status =
    committed > max
      ? `BD ${fmt(committed - max)} over`
      : committed < min
        ? `BD ${fmt(min - committed)} to reach ${fmt(min)}`
        : 'On budget'

  const due = upcomingDue()
  const dueList = due.length
    ? due
        .map(
          (d) =>
            `<div class="ot-due-row">
              <div class="ot-due-main">
                <span class="ot-due-label">${escapeHtml(d.label)}</span>
                <span class="ot-due-date">${shortDate(d.date)}</span>
              </div>
              <span class="ot-due-away${d.days <= 7 ? ' soon' : ''}">${awayLabel(d.days)}</span>
            </div>`,
        )
        .join('')
    : '<div class="ot-due-empty">Nothing scheduled yet. Add balance-due dates or milestones.</div>'

  return `
    <div class="card ontrack">
      <h2>On track</h2>
      <div class="ot-grid">
        <div class="ot-budget">
          <div class="ot-eyebrow">Committed</div>
          <div class="ot-figure">BD ${fmt(committed)}</div>
          <div class="ot-sub">of BD ${fmt(min)} to ${fmt(max)} budget</div>
          <div class="bd-bar ${cls}"><span style="width:${pct}%"></span></div>
          <div class="ot-status ${cls}">${status}</div>
          <div class="ot-paid">BD ${fmt(deposit)} paid so far</div>
        </div>
        <div class="ot-due">
          <div class="ot-due-h">Next due</div>
          <div class="ot-due-list">${dueList}</div>
        </div>
      </div>
    </div>`
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
    ${onTrackCard()}
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
