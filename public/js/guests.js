import { api } from './api.js'
import { COUPLE, INVITE_THEMES, resolveInvite } from './invite-card.js'
import { qrArtCanvas } from './qr.js'
import { guestStats } from './stats.js'
import { bumpRev, meId, store } from './store.js'
import {
  confirmDialog,
  confirmDelete,
  kebabButton,
  openKebabMenu,
  openSheet,
  toast,
  undoToast,
} from './ui.js'
import { byTag, debounce, escapeAttr, escapeHtml } from './util.js'

const guests = () => store.data.guests || (store.data.guests = [])
const find = (id) => guests().find((g) => String(g.id) === String(id))

const pushGuest = debounce(async (id) => {
  const g = find(id)
  if (!g) return
  try {
    bumpRev(await api.guest(g))
  } catch (_) {
    /* next poll reconciles */
  }
}, 500)

// Per-guest single-use entrance QR. The pass token comes from state (g.pass); the door
// scanner redeems the same pass.html?token= link exactly once.
const guestPassLink = (token) => `${location.origin}/pass.html?token=${token}`

// Per-guest RSVP link. Keyed by the guest's own token; the reply writes back to
// this party's row (rsvp / confirmed count / message).
const guestRsvpLink = (token) => `${location.origin}/rsvp.html?token=${token}`

const wedDateLabel = () => {
  const d = store.data.wedDate
  const dt = d ? new Date(`${d}T00:00:00`) : null
  return dt && !isNaN(dt.getTime())
    ? dt.toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'our wedding'
}

const waMessage = (g) =>
  `Hi ${g.name || 'there'}! Here is your personal entry pass for Osama & Noor's wedding, ${wedDateLabel()}. Show this QR at the door, it works once: ${guestPassLink(g.pass.token)}`

const inviteSettings = () => store.data.inviteCard || {}
const inviteTheme = () => {
  const t = inviteSettings().inviteTheme
  return INVITE_THEMES[t] ? t : 'sage'
}

const inviteMessage = (g) =>
  `Hi ${g.name || 'there'}! You're invited to Osama & Noor's wedding, ${wedDateLabel()}. Please let us know if you can make it: ${guestRsvpLink(g.token)}`

function passCell(g) {
  if (!g.pass) return '<span class="gp-none">saving…</span>'
  const used = g.pass.status === 'redeemed'
  return `<button class="gp-btn ${used ? 'used' : ''}" data-pass="${g.id}" title="Show entry QR and share">${used ? '✓ in' : 'QR'}</button>`
}

function openGuestPass(g) {
  if (!g.pass) return
  const linkUrl = guestPassLink(g.pass.token)
  const used = g.pass.status === 'redeemed'
  const sheet = openSheet({
    title: g.name || 'Guest',
    size: 'sm',
    content: `
      <div class="gpass-sub">Single-use entry pass${used ? ' &middot; already checked in' : ''}</div>
      <div class="gpass-qr"></div>
      <div class="gpass-actions">
        <button class="btn" data-inv>Share invitation card</button>
        <button class="btn ghost" data-wa>WhatsApp link</button>
        <button class="btn ghost" data-copy>Copy link</button>
        <button class="btn ghost" data-dl>Download QR</button>
        ${used ? '<button class="btn ghost" data-undo>Undo check-in</button>' : ''}
      </div>`,
  })
  if (!sheet) return
  const th = INVITE_THEMES[inviteTheme()]
  const rv = resolveInvite(inviteSettings())
  const canvas = qrArtCanvas(linkUrl, {
    size: 240,
    ...th.qr,
    medallion: used ? 'check' : 'waw',
    medallionGlyph: rv.sealGlyph,
    medallionFont: rv.sealFont,
  })
  sheet.body.querySelector('.gpass-qr').appendChild(canvas)
  import('./invite-export.js').then((m) => m.prewarm(inviteTheme(), inviteSettings())).catch(() => {})

  sheet.body.querySelector('[data-inv]').addEventListener('click', async (e) => {
    const b = e.currentTarget
    b.disabled = true
    try {
      const mod = await import('./invite-export.js')
      await mod.shareInviteCard({
        theme: inviteTheme(),
        settings: inviteSettings(),
        wedDate: store.data.wedDate || '2026-08-21',
        guestName: g.name || '',
        tokenUrl: linkUrl,
      })
    } catch (_) {
      toast({ type: 'err', message: 'Could not build the invitation image' })
    } finally {
      b.disabled = false
    }
  })
  sheet.body.querySelector('[data-wa]').addEventListener('click', () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(waMessage(g))}`, '_blank')
  })
  sheet.body.querySelector('[data-copy]').addEventListener('click', () => {
    navigator.clipboard?.writeText(linkUrl)
    toast({ type: 'ok', message: 'Pass link copied' })
  })
  sheet.body.querySelector('[data-dl]').addEventListener('click', () => {
    const c = qrArtCanvas(linkUrl, {
      size: 640,
      dpr: 1,
      ...th.qr,
      panel: th.qr.panel || th.ground,
      panelRadius: 28,
      medallionGlyph: rv.sealGlyph,
      medallionFont: rv.sealFont,
      ring: { top: COUPLE.latin, bottom: COUPLE.dateLatin, color: th.qr.ink },
    })
    const a = document.createElement('a')
    a.href = c.toDataURL('image/png')
    a.download = `pass-${(g.name || g.pass.token).slice(0, 20).replace(/\s+/g, '-')}.png`
    a.click()
  })
  sheet.body.querySelector('[data-undo]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Undo check-in?',
      message: 'This pass will work again for a single entry.',
      confirm: 'Undo check-in',
    })
    if (!ok) return
    g.pass.status = 'unused'
    sheet.close()
    renderGuests()
    try {
      bumpRev(await api.passUnredeem(g.pass.id))
    } catch (_) {
      /* next poll reconciles */
    }
  })
}

// Share a guest party's personal RSVP link (copy / WhatsApp / QR).
function openGuestInvite(g) {
  if (!g.token) return
  const linkUrl = guestRsvpLink(g.token)
  const replied = !!g.repliedAt
  const answer =
    g.rsvp === 'yes' ? 'Coming' : g.rsvp === 'no' ? 'Declined' : 'Pending'
  const statusLine = replied
    ? `Replied &middot; ${answer}`
    : 'Not replied yet'
  const sheet = openSheet({
    title: g.name || 'Guest',
    size: 'sm',
    content: `
      <div class="gpass-sub">Personal RSVP link &middot; ${statusLine}</div>
      ${replied && g.message ? `<div class="gpass-msg">&ldquo;${escapeHtml(g.message)}&rdquo;</div>` : ''}
      <div class="gpass-qr"></div>
      <div class="gpass-actions">
        <button class="btn" data-wa>Send on WhatsApp</button>
        <button class="btn ghost" data-copy>Copy link</button>
      </div>`,
  })
  if (!sheet) return
  const rvi = resolveInvite(inviteSettings())
  const canvas = qrArtCanvas(linkUrl, { size: 200, ...INVITE_THEMES[inviteTheme()].qr, medallionGlyph: rvi.sealGlyph, medallionFont: rvi.sealFont })
  sheet.body.querySelector('.gpass-qr').appendChild(canvas)
  sheet.body.querySelector('[data-wa]').addEventListener('click', () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(inviteMessage(g))}`,
      '_blank',
    )
  })
  sheet.body.querySelector('[data-copy]').addEventListener('click', () => {
    navigator.clipboard?.writeText(linkUrl)
    toast({ type: 'ok', message: 'RSVP link copied' })
  })
}

export function renderGuestStats() {
  const s = guestStats()
  const el = document.getElementById('guestStats')
  if (!el) return
  el.innerHTML = `
    <div class="money"><div class="l">Total invited (seats)</div><div class="v">${s.seats}</div></div>
    <div class="money"><div class="l">Confirmed coming</div><div class="v pos">${s.coming}</div></div>
    <div class="money"><div class="l">Awaiting reply</div><div class="v warn">${s.pending}</div></div>
    <div class="money"><div class="l">Your side / Noor's</div><div class="v">${s.you}<small> / ${s.her}</small></div></div>`
}

export function renderGuests() {
  const body = document.getElementById('guestBody')
  if (!body) return
  const rows = guests()
  if (!rows.length) {
    body.innerHTML =
      '<tr><td colspan="8" class="empty">No guests yet. Add your first party.</td></tr>'
  } else {
    body.innerHTML = rows
      .map(
        (g) => `
      <tr data-id="${g.id}" class="${!(g.name || '').trim() ? 'row-muted' : ''}">
        <td data-label="Name"><input value="${escapeAttr(g.name)}" data-f="name" placeholder="Name / family"></td>
        <td data-label="Side"><select data-f="side">
          <option value="you" ${g.side === 'you' ? 'selected' : ''}>Your side</option>
          <option value="her" ${g.side === 'her' ? 'selected' : ''}>Noor's side</option>
          <option value="both" ${g.side === 'both' ? 'selected' : ''}>Both</option></select></td>
        <td data-label="Seats"><input value="${escapeAttr(g.seats)}" data-f="seats" inputmode="numeric" placeholder="1"></td>
        <td data-label="RSVP"><div class="stat-wrap"><select data-f="rsvp" class="stat rs-${g.rsvp}">
          <option value="pending" ${g.rsvp === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="yes" ${g.rsvp === 'yes' ? 'selected' : ''}>Coming</option>
          <option value="no" ${g.rsvp === 'no' ? 'selected' : ''}>Declined</option></select></div></td>
        <td data-label="Notes"><input value="${escapeAttr(g.notes)}" data-f="notes" placeholder="notes"></td>
        <td data-label="Entry pass" class="g-pass-cell">${passCell(g)}</td>
        <td data-label="Updated" class="upd">${byTag(g, meId())}</td>
        <td class="kebab-cell">${kebabButton('Guest actions')}</td>
      </tr>`,
      )
      .join('')
  }

  body.querySelectorAll('input,select').forEach((inp) => {
    inp.addEventListener('input', (e) => {
      const tr = e.target.closest('tr')
      const g = find(tr.dataset.id)
      if (!g) return
      g[e.target.dataset.f] = e.target.value
      if (e.target.dataset.f === 'rsvp') e.target.className = `stat rs-${e.target.value}`
      g.by = 'You'
      g.byId = meId()
      g.at = new Date().toISOString()
      tr.querySelector('.upd').innerHTML = byTag(g, meId())
      renderGuestStats()
      pushGuest(g.id)
    })
  })

  body.querySelectorAll('.kebab-cell [data-kebab]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = b.closest('tr').dataset.id
      const g = find(id)
      openKebabMenu(b, [
        {
          label: 'RSVP link',
          disabled: !g?.token,
          onClick: () => g && openGuestInvite(g),
        },
        {
          label: 'Entry pass',
          disabled: !g?.pass,
          onClick: () => g && openGuestPass(g),
        },
        {
          label: 'Delete guest',
          destructive: true,
          separatorBefore: true,
          onClick: () => deleteGuest(id),
        },
      ])
    }),
  )

  body.querySelectorAll('[data-pass]').forEach((b) =>
    b.addEventListener('click', () => {
      const g = find(b.dataset.pass)
      if (g) openGuestPass(g)
    }),
  )

  renderGuestStats()
}

async function deleteGuest(id) {
  const snap = find(id)
  if (!snap || !(await confirmDelete('this guest'))) return
  const data = { ...snap }
  store.data.guests = guests().filter((g) => String(g.id) !== String(id))
  renderGuests()
  renderGuestStats()
  undoToast('Guest deleted', async () => {
    const r = await api.guest(data)
    bumpRev(r)
    guests().push({ ...data, id: r.id })
    renderGuests()
    renderGuestStats()
  })
  try {
    bumpRev(await api.guestDelete(id))
  } catch (_) {
    /* next poll reconciles */
  }
}

export function initGuestControls() {
  const add = document.getElementById('addGuest')
  if (add)
    add.addEventListener('click', async () => {
      try {
        const res = await api.guest({
          name: '',
          side: 'you',
          seats: '1',
          rsvp: 'pending',
          notes: '',
        })
        bumpRev(res)
        guests().push({
          id: res.id,
          name: '',
          side: 'you',
          seats: '1',
          rsvp: 'pending',
          notes: '',
          by: 'You',
          byId: meId(),
          at: new Date().toISOString(),
        })
        renderGuests()
      } catch (_) {
        /* ignore */
      }
    })
}
