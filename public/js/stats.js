import { CHECKLIST, DECISIONS } from './content.js'
import { store } from './store.js'

const data = () => store.data || {}

export function allCheckItems() {
  const arr = []
  CHECKLIST.forEach((w) => w.items.forEach((_, i) => arr.push(`${w.id}-${i}`)))
  return arr
}

export const isChecked = (key) => !!data().checks?.[key]?.done

export function checkStats() {
  const all = allCheckItems()
  const done = all.filter((k) => isChecked(k)).length
  return { done, total: all.length }
}

export function weekStats(w) {
  const total = w.items.length
  const done = w.items.filter((_, i) => isChecked(`${w.id}-${i}`)).length
  return { done, total }
}

export const decisionAnswer = (i) => data().decisions?.[i]?.answer || ''
export const decisionsDone = () =>
  DECISIONS.filter((_, i) => decisionAnswer(i).trim()).length

export function overallPercent() {
  const c = checkStats()
  const total = c.total + DECISIONS.length
  const done = c.done + decisionsDone()
  return total ? Math.round((done / total) * 100) : 0
}

export function moneyTotals() {
  let quote = 0,
    deposit = 0,
    balance = 0,
    booked = 0
  ;(data().vendors || []).forEach((r) => {
    quote += Number(r.quote) || 0
    deposit += Number(r.deposit) || 0
    balance += Number(r.balance) || 0
    if (r.status === 'booked' || r.status === 'paid') booked += 1
  })
  return { quote, deposit, balance, booked }
}

export function guestStats() {
  let seats = 0,
    coming = 0,
    pending = 0,
    you = 0,
    her = 0
  ;(data().guests || []).forEach((g) => {
    const s = Number(g.seats) || 0
    seats += s
    if (g.rsvp === 'yes') coming += s
    else if (g.rsvp === 'pending') pending += s
    if (g.side === 'you') you += s
    else if (g.side === 'her') her += s
  })
  return { seats, coming, pending, you, her }
}
