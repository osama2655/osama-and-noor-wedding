// Standalone page a guest lands on from their WhatsApp link. Renders the full
// بطاقة دخول invitation card with their personal QR. Read-only: it never
// redeems; redemption only happens at the door via the check-in scanner.
import {
  buildInviteCard,
  DEFAULT_INVITE,
  INVITE_THEMES,
  STR,
  resolveInvite,
} from './invite-card.js'
import { qrArtCanvas } from './qr.js'

const token = new URLSearchParams(location.search).get('token') || ''
const root = document.getElementById('pass-root')

const themeHint = () => {
  try {
    const t = localStorage.getItem('on-invite-theme')
    return INVITE_THEMES[t] ? t : 'sage'
  } catch (_) {
    return 'sage'
  }
}
const rememberTheme = (t) => {
  try {
    localStorage.setItem('on-invite-theme', t)
  } catch (_) {
    /* private mode */
  }
}

function show(card, actions) {
  const frag = document.createDocumentFragment()
  frag.appendChild(card)
  if (actions) frag.appendChild(actions)
  root.replaceChildren(frag)
}

function attachQr(card, theme, status, settings) {
  const t = INVITE_THEMES[theme] || INVITE_THEMES.sage
  const rv = resolveInvite(settings || {})
  const qr = qrArtCanvas(location.href, {
    size: 240,
    ...t.qr,
    medallion: status === 'redeemed' ? 'check' : 'waw',
    medallionGlyph: rv.sealGlyph,
    medallionFont: rv.sealFont,
  })
  qr.setAttribute('role', 'img')
  qr.setAttribute('aria-label', 'Entrance QR')
  card.querySelector('.ic-qr')?.replaceChildren(qr)
}

function saveActions(payload) {
  const wrap = document.createElement('div')
  wrap.className = 'ic-page-actions'
  wrap.innerHTML = `<button class="ic-save-btn" type="button">${STR.save}</button>`
  const btn = wrap.querySelector('button')
  btn.addEventListener('click', async () => {
    btn.disabled = true
    try {
      const mod = await import('./invite-export.js')
      await mod.shareInviteCard(payload)
    } catch (_) {
      /* export is best-effort; the live card is the pass */
    } finally {
      btn.disabled = false
    }
  })
  return wrap
}

async function load() {
  if (!token) {
    show(buildInviteCard({ theme: themeHint(), status: 'invalid' }))
    return
  }
  show(buildInviteCard({ theme: themeHint(), status: 'loading' }))

  let info
  try {
    const r = await fetch(
      `api/index.php?action=pass_info&token=${encodeURIComponent(token)}`,
    )
    info = await r.json()
  } catch (_) {
    const card = buildInviteCard({ theme: themeHint(), status: 'offline' })
    card.querySelector('[data-retry]')?.addEventListener('click', load)
    show(card)
    return
  }

  if (!info || info.error) {
    show(buildInviteCard({ theme: themeHint(), status: 'invalid' }))
    return
  }

  const settings = { ...DEFAULT_INVITE, ...(info.invite || {}) }
  const theme = INVITE_THEMES[settings.inviteTheme] ? settings.inviteTheme : 'sage'
  rememberTheme(theme)
  const status = info.status === 'redeemed' ? 'redeemed' : 'valid'
  const card = buildInviteCard({
    theme,
    settings,
    wedDate: info.wedDate || '2026-08-21',
    guestName: info.label || '',
    status,
    redeemedAt: info.redeemedAt,
  })
  attachQr(card, theme, status, settings)
  const payload = {
    theme,
    settings,
    wedDate: info.wedDate || '2026-08-21',
    guestName: info.label || '',
    tokenUrl: location.href,
  }
  show(card, saveActions(payload))

  // Prewarm the export path (module, fonts, artwork) so the save tap itself
  // stays inside iOS Safari's user-gesture window.
  import('./invite-export.js').then((m) => m.prewarm(theme, settings)).catch(() => {})
}

load()
