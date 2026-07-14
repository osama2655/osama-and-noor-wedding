import { CHECKLIST } from './content.js'
import { store } from './store.js'

const data = () => store.data || {}

const isHidden = (key) => !!data().hiddenChecks?.[key]
const customFor = (phaseId) =>
  (data().checkItems || []).filter((c) => c.phase === phaseId)

// The keys that count toward a phase: visible static items plus custom items.
export function phaseKeys(w) {
  const staticKeys = w.items
    .map((_, i) => `${w.id}-${i}`)
    .filter((k) => !isHidden(k))
  const customKeys = customFor(w.id).map((c) => `ci-${c.id}`)
  return [...staticKeys, ...customKeys]
}

export function allCheckItems() {
  return CHECKLIST.flatMap(phaseKeys)
}

export const isChecked = (key) => !!data().checks?.[key]?.done

export function checkStats() {
  const all = allCheckItems()
  const done = all.filter(isChecked).length
  return { done, total: all.length }
}

export function weekStats(w) {
  const keys = phaseKeys(w)
  return { done: keys.filter(isChecked).length, total: keys.length }
}

export function overallPercent() {
  const c = checkStats()
  return c.total ? Math.round((c.done / c.total) * 100) : 0
}

export function moneyTotals() {
  let quote = 0,
    deposit = 0,
    balance = 0,
    booked = 0
  ;(data().vendors || []).forEach((r) => {
    const q = Number(r.quote) || 0
    const p = Number(r.deposit) || 0
    quote += q
    deposit += p
    // Outstanding = what is still owed, derived (quote - paid), never negative.
    balance += Math.max(0, q - p)
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
