// Draws the invitation as a 1080x1350 PNG (4:5: WhatsApp shows it uncropped in
// the chat preview) and shares it. Hand-built canvas compositor; html2canvas
// mangles Arabic shaping. Curved/letter-spaced text is Latin+digits only.
import {
  COUPLE,
  DEFAULT_INVITE,
  INVITE_THEMES,
  STARS,
  STR,
  gregorianLabel,
  hijriLabel,
} from './invite-card.js'
import { qrArtCanvas } from './qr.js'

const W = 1080
const H = 1350
const CX = W / 2

// Every family/size pair drawn below, probed with the real glyphs. iOS Safari
// silently falls back to system Arabic if a face is not loaded at fillText time.
const fontProbes = (t) => [
  [`${t.nameWeight} 112px ${t.face}`, 'أسـامة نـور'],
  [`400 44px ${t.face}`, 'الجمـل القـروص'],
  [`400 38px ${t.face}`, 'ربيع الأول هـ'],
  [`400 48px ${t.face}`, 'ضيف'],
  ['300 56px Lateef', 'و'],
  ['600 30px Cairo', 'بطاقة دخول'],
  ['400 36px Cairo', '9:30'],
  ['500 44px Cairo', '2026'],
]

const artCache = new Map()

export async function prewarm(theme) {
  const t = INVITE_THEMES[theme] || INVITE_THEMES.sage
  const jobs = fontProbes(t).map(([f, probe]) =>
    document.fonts?.load ? document.fonts.load(f, probe).catch(() => {}) : null,
  )
  if (t.art && !artCache.has(t.art)) {
    const img = new Image()
    img.src = t.art
    artCache.set(
      t.art,
      img
        .decode()
        .then(() => img)
        .catch(() => null),
    )
  }
  await Promise.all(jobs)
  if (document.fonts?.ready) await document.fonts.ready.catch?.(() => {})
  if (t.art) await artCache.get(t.art)
}

const foil = (ctx, x0, x1, y) => {
  const g = ctx.createLinearGradient(x0, y - 40, x1, y + 40)
  g.addColorStop(0, '#8a6d1f')
  g.addColorStop(0.3, '#f4e39b')
  g.addColorStop(0.5, '#d4af37')
  g.addColorStop(0.6, '#fff6cf')
  g.addColorStop(0.72, '#d4af37')
  g.addColorStop(1, '#8a6d1f')
  return g
}

function drawBackground(ctx, theme, t) {
  ctx.fillStyle = t.ground
  ctx.fillRect(0, 0, W, H)

  if (theme === 'badr') {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#0b1019')
    g.addColorStop(0.55, '#101827')
    g.addColorStop(1, '#0c1320')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)

    // khatam lattice bands, top and bottom margins only
    const tile = document.createElement('canvas')
    tile.width = tile.height = 110
    const tc = tile.getContext('2d')
    tc.strokeStyle = '#c9a24b'
    tc.lineWidth = 2
    tc.strokeRect(27, 27, 56, 56)
    tc.save()
    tc.translate(55, 55)
    tc.rotate(Math.PI / 4)
    tc.strokeRect(-28, -28, 56, 56)
    tc.restore()
    const pat = ctx.createPattern(tile, 'repeat')
    ctx.save()
    ctx.globalAlpha = 0.1
    ctx.fillStyle = pat
    ctx.fillRect(0, 0, W, 110)
    ctx.fillRect(0, H - 110, W, 110)
    ctx.restore()

    // moon halo behind the names
    const moon = ctx.createRadialGradient(CX, 284, 0, CX, 284, 640)
    moon.addColorStop(0, 'rgba(242,234,216,.16)')
    moon.addColorStop(0.55, 'rgba(242,234,216,.05)')
    moon.addColorStop(0.72, 'rgba(242,234,216,0)')
    ctx.fillStyle = moon
    ctx.fillRect(0, 0, W, H)

    // deterministic star field
    for (const [x, y, r, o] of STARS) {
      ctx.globalAlpha = o
      ctx.fillStyle = '#e8ddc2'
      ctx.beginPath()
      ctx.arc((x / 100) * W, (y / 100) * H, r * 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // double gold frame
    ctx.strokeStyle = 'rgba(201,162,75,.55)'
    ctx.lineWidth = 2
    ctx.strokeRect(41, 41, W - 82, H - 82)
    ctx.strokeStyle = 'rgba(201,162,75,.25)'
    ctx.strokeRect(49, 49, W - 98, H - 98)

    // mihrab ogee arch over the monogram-and-names zone
    ctx.strokeStyle = 'rgba(201,162,75,.6)'
    ctx.lineWidth = 3
    ctx.beginPath()
    const s = 620 / 240
    const ax = CX - 310
    const ay = 58
    ctx.moveTo(ax + 10 * s, ay + 178 * s * 0.72)
    ctx.lineTo(ax + 10 * s, ay + 118 * s * 0.72)
    ctx.bezierCurveTo(ax + 10 * s, ay + 64 * s * 0.72, ax + 62 * s, ay + 52 * s * 0.72, ax + 120 * s, ay + 8 * s * 0.72)
    ctx.bezierCurveTo(ax + 178 * s, ay + 52 * s * 0.72, ax + 230 * s, ay + 64 * s * 0.72, ax + 230 * s, ay + 118 * s * 0.72)
    ctx.lineTo(ax + 230 * s, ay + 178 * s * 0.72)
    ctx.stroke()
  }

  if (theme === 'dana') {
    const paint = (x, y, rx, ry, color) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(rx / 100, ry / 100)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 100)
      g.addColorStop(0, color)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, 100, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    paint(W * 0.18, H * 0.1, 620, 500, 'rgba(214,177,168,.12)')
    paint(W * 0.84, H * 0.28, 570, 440, 'rgba(178,204,195,.11)')
    paint(W * 0.5, H * 0.96, 680, 520, 'rgba(196,188,214,.10)')
  }
}

async function drawArt(ctx, t) {
  if (!t.art) return
  const img = await artCache.get(t.art)
  if (!img) return
  // cover, anchored to the bottom, never stretched
  const scale = Math.max(W / img.width, H / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, (W - dw) / 2, H - dh, dw, dh)
}

function drawSeal(ctx, theme, t, y) {
  const r = 40
  ctx.lineWidth = 3
  ctx.strokeStyle = t.accent
  if (theme === 'dana') {
    const g = ctx.createRadialGradient(CX - r * 0.3, y + r * 0.6, 0, CX, y + r, r)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.4, '#f2ece2')
    g.addColorStop(0.75, '#d6ccc0')
    g.addColorStop(1, '#bdb3a7')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(CX, y + r, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.arc(CX, y + r, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '300 56px Lateef, Georgia, serif'
  ctx.fillStyle = theme === 'badr' ? foil(ctx, CX - 30, CX + 30, y + r) : t.names
  ctx.fillText('و', CX, y + r - 10)
  return y + r * 2
}

function drawNames(ctx, theme, t) {
  const size = 112
  ctx.font = `${t.nameWeight} ${size}px ${t.face}, 'Lateef', serif`
  const gw = ctx.measureText(COUPLE.groomFirst).width
  const bw = ctx.measureText(COUPLE.brideFirst).width
  ctx.font = `300 64px ${t.face}, 'Lateef', serif`
  const jw = ctx.measureText(COUPLE.join).width
  const gap = 30
  const total = gw + gap + jw + gap + bw
  // RTL visual order: groom rightmost, bride leftmost
  const xg = CX + total / 2 - gw / 2
  const xj = CX + total / 2 - gw - gap - jw / 2
  const xb = CX - total / 2 + bw / 2
  return { size, gw, bw, xg, xj, xb, jw }
}

function fillNameRun(ctx, theme, t, text, x, y, font) {
  ctx.font = font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  if (theme === 'badr') {
    const w = ctx.measureText(text).width
    ctx.fillStyle = foil(ctx, x - w / 2, x + w / 2, y)
  }
  ctx.fillText(text, x, y)
}

function drawDivider(ctx, theme, t, y) {
  ctx.strokeStyle = t.hairline
  ctx.fillStyle = t.accent
  ctx.lineWidth = 2
  if (theme === 'sage') {
    ctx.beginPath()
    ctx.moveTo(CX - 82, y)
    ctx.lineTo(CX + 82, y)
    ctx.stroke()
    return y + 8
  }
  if (theme === 'badr') {
    ctx.beginPath()
    ctx.moveTo(CX - 150, y)
    ctx.lineTo(CX - 24, y)
    ctx.moveTo(CX + 24, y)
    ctx.lineTo(CX + 150, y)
    ctx.stroke()
    ctx.save()
    ctx.translate(CX, y)
    ctx.globalAlpha = 0.7
    ctx.rotate(Math.PI / 4)
    ctx.fillRect(-6, -6, 12, 12)
    ctx.rotate(Math.PI / 4)
    ctx.fillRect(-6, -6, 12, 12)
    ctx.restore()
    return y + 10
  }
  if (theme === 'dana') {
    ctx.strokeStyle = 'rgba(169,140,82,.4)'
    ctx.beginPath()
    const w = 246
    for (let i = 0; i <= w; i += 2) {
      const yy = y + Math.sin((i / w) * Math.PI * 8) * 5
      if (i === 0) ctx.moveTo(CX - w / 2 + i, yy)
      else ctx.lineTo(CX - w / 2 + i, yy)
    }
    ctx.stroke()
    return y + 12
  }
  // arch: three stroked icon circles (calendar, pin, clock simplified)
  const icons = [-90, 0, 90]
  ctx.strokeStyle = t.accent
  for (const dx of icons) {
    ctx.beginPath()
    ctx.arc(CX + dx, y + 18, 34, 0, Math.PI * 2)
    ctx.stroke()
  }
  const icon = (dx, draw) => {
    ctx.save()
    ctx.translate(CX + dx, y + 18)
    ctx.lineWidth = 2.5
    draw()
    ctx.restore()
  }
  icon(90, () => {
    ctx.strokeRect(-13, -9, 26, 22)
    ctx.beginPath()
    ctx.moveTo(-13, -2)
    ctx.lineTo(13, -2)
    ctx.moveTo(-6, -14)
    ctx.lineTo(-6, -6)
    ctx.moveTo(6, -14)
    ctx.lineTo(6, -6)
    ctx.stroke()
  })
  icon(0, () => {
    ctx.beginPath()
    ctx.arc(0, -3, 7, Math.PI * 0.95, Math.PI * 0.05)
    ctx.lineTo(0, 13)
    ctx.closePath()
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, -3, 2.5, 0, Math.PI * 2)
    ctx.stroke()
  })
  icon(-90, () => {
    ctx.beginPath()
    ctx.arc(0, 0, 14, 0, Math.PI * 2)
    ctx.moveTo(0, -7)
    ctx.lineTo(0, 1)
    ctx.lineTo(6, 5)
    ctx.stroke()
  })
  return y + 60
}

// Renders the full card and returns the canvas. Everything is awaited inside;
// callers wanting iOS share must prewarm() first so this stays near-instant.
export async function drawInviteCanvas({ theme = 'sage', settings = {}, wedDate = '2026-08-21', guestName = '', tokenUrl = '' }) {
  await prewarm(theme)
  const t = INVITE_THEMES[theme] || INVITE_THEMES.sage
  const s = { ...DEFAULT_INVITE, ...settings }
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.direction = 'rtl'

  drawBackground(ctx, theme, t)
  await drawArt(ctx, t)

  const hijri = hijriLabel(wedDate, s.hijriDateAr)
  const greg = gregorianLabel(wedDate)
  const venue = s.venueAr || ''

  // Flow the stack, then start so the whole composition centres vertically.
  const blocks =
    80 + 22 + 66 + 150 + 62 + 44 + (hijri ? 48 : 0) + 52 +
    (venue ? 48 : 0) + 28 + 126 + 342 + 28 + 84 + 24
  let y = Math.max(48, (H - blocks) / 2)

  ctx.textAlign = 'center'
  y = drawSeal(ctx, theme, t, y)
  y += 22

  ctx.font = '600 30px Cairo, sans-serif'
  ctx.fillStyle = t.label
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(STR.eyebrow, CX, y + 30)
  y += 30 + 36

  const n = drawNames(ctx, theme, t)
  const nameBase = y + 100
  fillNameRun(ctx, theme, t, COUPLE.groomFirst, n.xg, nameBase, `${t.nameWeight} 112px ${t.face}, 'Lateef', serif`)
  fillNameRun(ctx, theme, t, COUPLE.brideFirst, n.xb, nameBase, `${t.nameWeight} 112px ${t.face}, 'Lateef', serif`)
  ctx.fillStyle = theme === 'badr' ? foil(ctx, n.xj - 20, n.xj + 20, nameBase) : t.gold
  ctx.font = `300 64px ${t.face}, 'Lateef', serif`
  ctx.fillText(COUPLE.join, n.xj, nameBase - 4)
  y = nameBase + 50

  ctx.font = `400 44px ${t.face}, 'Lateef', serif`
  ctx.fillStyle = t.family
  ctx.fillText(COUPLE.groomFamily, n.xg, y + 18)
  ctx.fillText(COUPLE.brideFamily, n.xb, y + 18)
  y += 44 + 18

  y = drawDivider(ctx, theme, t, y + 10) + 34

  if (hijri) {
    ctx.font = `400 38px ${t.face}, 'Lateef', serif`
    ctx.fillStyle = t.body
    ctx.fillText(hijri, CX, y + 28)
    y += 48
  }
  ctx.save()
  ctx.direction = 'ltr'
  ctx.font = '500 44px Cairo, sans-serif'
  ctx.fillStyle = t.names
  try { ctx.letterSpacing = '6px' } catch (_) { /* Safari */ }
  ctx.fillText(greg, CX, y + 38)
  try { ctx.letterSpacing = '0px' } catch (_) { /* Safari */ }
  ctx.restore()
  y += 52
  if (venue) {
    ctx.font = `400 36px ${t.face}, 'Lateef', serif`
    ctx.fillStyle = t.muted
    ctx.fillText(venue, CX, y + 28)
    y += 48
  }
  y += 28

  // timeline: reception rightmost (RTL), thin rules between columns
  const cols = [
    [STR.reception, s.timeReception, 250],
    [STR.zaffa, s.timeZaffa, 0],
    [STR.dinner, s.timeDinner, -250],
  ]
  for (const [label, val, dx] of cols) {
    ctx.font = '600 30px Cairo, sans-serif'
    ctx.fillStyle = t.label
    ctx.fillText(label, CX + dx, y + 26)
    ctx.font = '400 36px Cairo, sans-serif'
    ctx.fillStyle = t.body
    ctx.fillText(String(val || ''), CX + dx, y + 68)
  }
  ctx.strokeStyle = t.hairline
  ctx.lineWidth = 2
  for (const x of [CX - 125, CX + 125]) {
    ctx.beginPath()
    ctx.moveTo(x, y + 2)
    ctx.lineTo(x, y + 76)
    ctx.stroke()
  }
  y += 88 + 38

  // QR on its panel
  const qrCanvasEl = qrArtCanvas(tokenUrl, {
    size: 356,
    dpr: 1,
    ...t.qr,
    panelRadius: 24,
    medallion: 'waw',
  })
  const qw = qrCanvasEl.width
  const qx = CX - qw / 2
  if (t.qr.panelRing) {
    ctx.strokeStyle = t.qr.panelRing
    ctx.lineWidth = 2
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(qx - 9, y - 9, qw + 18, qw + 18, 30)
    else ctx.rect(qx - 9, y - 9, qw + 18, qw + 18)
    ctx.stroke()
  }
  ctx.drawImage(qrCanvasEl, qx, y)
  y += qw + 28

  // Soft ground-colored halo so the guest line and footer stay readable where
  // the floral artwork climbs behind them (art themes only).
  if (t.art) {
    const [rr, gg, bb] = [1, 3, 5].map((i) => parseInt(t.ground.slice(i, i + 2), 16))
    ctx.save()
    ctx.translate(CX, y + 84)
    ctx.scale(1, 0.42)
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 470)
    halo.addColorStop(0, `rgba(${rr},${gg},${bb},.78)`)
    halo.addColorStop(1, `rgba(${rr},${gg},${bb},0)`)
    ctx.fillStyle = halo
    ctx.fillRect(-540, -470, 1080, 940)
    ctx.restore()
  }

  // المكرمة : guest
  const label = `${s.honoraryLabel} :`
  ctx.font = '600 28px Cairo, sans-serif'
  const lw = ctx.measureText(label).width
  ctx.font = `400 48px ${t.face}, 'Lateef', serif`
  const gw2 = ctx.measureText(guestName || '').width
  const totalG = lw + 18 + gw2
  ctx.font = '600 28px Cairo, sans-serif'
  ctx.fillStyle = t.muted
  ctx.fillText(label, CX + totalG / 2 - lw / 2, y + 30)
  ctx.font = `400 48px ${t.face}, 'Lateef', serif`
  ctx.fillStyle = t.names
  ctx.fillText(guestName || '', CX - totalG / 2 + gw2 / 2, y + 36)
  y += 54 + 30

  ctx.font = '400 26px Cairo, sans-serif'
  ctx.fillStyle = t.muted
  ctx.fillText(STR.footer, CX, Math.min(y + 24, H - 40))

  return canvas
}

function download(blob, name) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 30000)
}

export async function shareInviteCard(payload) {
  const canvas = await drawInviteCanvas(payload)
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) return
  const safe = (payload.guestName || 'guest').slice(0, 24).replace(/[\\/:*?"<>|\s]+/g, '-')
  const name = `invitation-${safe}.png`
  const file = new File([blob], name, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Osama & Noor' })
      return
    } catch (err) {
      if (err && err.name === 'AbortError') return
    }
  }
  download(blob, name)
}
