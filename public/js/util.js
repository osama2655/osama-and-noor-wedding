export const fmt = (n) => {
  n = Number(n) || 0
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export const escapeHtml = (s) =>
  String(s ?? '').replace(
    /[&<>]/g,
    (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m],
  )

export const escapeAttr = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (m) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        m
      ],
  )

export const debounce = (fn, ms = 500) => {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

export function timeAgo(iso) {
  if (!iso) return ''
  const then = new Date(
    iso.replace(' ', 'T') + (iso.includes('T') || iso.includes('Z') ? '' : 'Z'),
  )
  const secs = Math.floor((Date.now() - then.getTime()) / 1000)
  if (isNaN(secs)) return ''
  if (secs < 45) return 'just now'
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`
  if (secs < 86400) return `${Math.round(secs / 3600)}h ago`
  return `${Math.round(secs / 86400)}d ago`
}

// "by You / Noor" attribution pill. `entry` carries {byId, by, at}; `meId` is the current user id.
export function byTag(entry, meId) {
  if (!entry || entry.byId == null) return ''
  const mine = entry.byId === meId
  const who = mine ? 'You' : String(entry.by || '').split(' ')[0]
  const when = entry.at
    ? ` · <span class="by-when">${timeAgo(entry.at)}</span>`
    : ''
  return `<span class="by ${mine ? 'me' : 'them'}"><span class="dot"></span>${escapeHtml(who)}${when}</span>`
}
