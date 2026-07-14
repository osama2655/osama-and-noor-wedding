// Thin wrapper over the vendored qrcode-generator (loaded as a classic script, global `qrcode`).
// Renders a branded, theme-coloured QR with an "O&N" monogram badge in the centre. Uses high
// error correction so the centre logo never breaks scanning.

function themeColor(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim()
    return v || fallback
  } catch (_) {
    return fallback
  }
}

// Darken a #rrggbb toward black so a theme accent stays high-contrast (scannable) on white.
function darken(hex, f = 0.42) {
  const h = String(hex).replace('#', '')
  if (h.length < 6) return '#3a2a18'
  const ch = (i) =>
    Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * f)))
  return `rgb(${ch(0)},${ch(2)},${ch(4)})`
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// ---------------------------------------------------------------------------
// Khatm AlWaw: the wedding's art-directed QR mark. Rounded-run data modules,
// geometry-drawn finder eyes, and a calligraphic waw seal in the centre.
// Scannability law: EC level H, 4-module quiet zone, dark-on-light only.
// ---------------------------------------------------------------------------

// Degradation ladder. If a door-scan test ever fails, drop a rung here; no code
// surgery. art -> soft (corner rounding only) -> plain (pure squares).
export const QR_ART = {
  style: 'art',
  medallionModules: 15,
  quiet: 4,
}

// ISO/IEC 18004 alignment-pattern centre positions, keyed by version (index+1).
// Needed so alignment patterns stay crisp squares whatever version the payload lands on.
const ALIGN_POS = [
  [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54],
  [6, 32, 58], [6, 34, 62], [6, 26, 46, 66],
]

function roundRectPath4(ctx, x, y, w, h, r) {
  const [tl, tr, br, bl] = r
  ctx.moveTo(x + tl, y)
  ctx.lineTo(x + w - tr, y)
  ctx.arcTo(x + w, y, x + w, y + tr, tr)
  ctx.lineTo(x + w, y + h - br)
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br)
  ctx.lineTo(x + bl, y + h)
  ctx.arcTo(x, y + h, x, y + h - bl, bl)
  ctx.lineTo(x, y + tl)
  ctx.arcTo(x, y, x + tl, y, tl)
  ctx.closePath()
}

function ringPath(ctx, x, y, size, outerR, innerR, inset) {
  ctx.beginPath()
  roundRectPath4(ctx, x, y, size, size, [outerR, outerR, outerR, outerR])
  const i = inset
  roundRectPath4(ctx, x + i, y + i, size - 2 * i, size - 2 * i, [innerR, innerR, innerR, innerR])
}

export function qrArtCanvas(text, opts = {}) {
  const {
    size = 240,
    ink = '#33372a',
    pupil = '#454936',
    gold = '#d6cfa2',
    panel = null,
    panelRadius = 16,
    medallion = 'waw',
    medallionGlyph = 'و',
    medallionFont = "'Lateef'",
    ring = null,
    dpr = Math.min(3, window.devicePixelRatio || 1),
    style = QR_ART.style,
    medallionModules = QR_ART.medallionModules,
  } = opts

  const canvas = document.createElement('canvas')
  if (!window.qrcode) return canvas
  const qr = window.qrcode(0, 'H')
  qr.addData(text)
  qr.make()
  const n = qr.getModuleCount()
  const quiet = QR_ART.quiet
  const px = Math.round(size * dpr)
  const cell = Math.max(2, Math.floor(px / (n + quiet * 2)))
  const dim = cell * (n + quiet * 2)
  const band = ring ? Math.round(dim * 0.17) : 0
  const total = dim + band * 2
  canvas.width = total
  canvas.height = total
  canvas.style.width = `${Math.round(total / dpr)}px`
  canvas.style.height = `${Math.round(total / dpr)}px`
  const ctx = canvas.getContext('2d')

  if (panel) {
    ctx.fillStyle = panel
    ctx.beginPath()
    const pr = panelRadius * dpr
    roundRectPath4(ctx, 0, 0, total, total, [pr, pr, pr, pr])
    ctx.fill()
  }

  const version = (n - 17) / 4
  const centres = ALIGN_POS[version - 1] || []
  const isFinder = (r, c) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)
  const isAlign = (r, c) => {
    for (const cr of centres) {
      for (const cc of centres) {
        if (
          (cr <= 7 && cc <= 7) ||
          (cr <= 7 && cc >= n - 8) ||
          (cr >= n - 8 && cc <= 7)
        )
          continue
        if (Math.abs(r - cr) <= 2 && Math.abs(c - cc) <= 2) return true
      }
    }
    return false
  }
  const mid = n / 2
  const knockR = medallion && medallionModules > 0 ? medallionModules / 2 : 0
  const knocked = (r, c) =>
    knockR > 0 && Math.hypot(r + 0.5 - mid, c + 0.5 - mid) < knockR
  const dark = (r, c) => {
    if (r < 0 || c < 0 || r >= n || c >= n) return false
    if (knocked(r, c)) return false
    return qr.isDark(r, c)
  }

  const ox = band + quiet * cell
  const oy = band + quiet * cell
  const rad = style === 'art' ? 0.42 * cell : style === 'soft' ? 0.24 * cell : 0

  ctx.fillStyle = ink
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (isFinder(r, c) || !dark(r, c)) continue
      const x = ox + c * cell
      const y = oy + r * cell
      const square = rad === 0 || r === 6 || c === 6 || isAlign(r, c)
      if (square) {
        ctx.fillRect(x, y, cell, cell)
        continue
      }
      // A corner rounds only when both of its orthogonal neighbours are light,
      // so runs of modules fuse into capsules and isolates become squircles.
      const up = dark(r - 1, c)
      const down = dark(r + 1, c)
      const left = dark(r, c - 1)
      const right = dark(r, c + 1)
      const tl = !up && !left ? rad : 0
      const tr = !up && !right ? rad : 0
      const br = !down && !right ? rad : 0
      const bl = !down && !left ? rad : 0
      ctx.beginPath()
      roundRectPath4(ctx, x, y, cell, cell, [tl, tr, br, bl])
      ctx.fill()
    }
  }

  // The three finder eyes, identical, drawn as geometry: a 1-module rounded ring
  // (radii 2.2 / 1.2 modules) with a 3x3 rounded pupil in the theme's deep accent.
  const eye = (er, ec) => {
    const x = ox + ec * cell
    const y = oy + er * cell
    ctx.fillStyle = ink
    ringPath(ctx, x, y, 7 * cell, 2.2 * cell, 1.2 * cell, cell)
    ctx.fill('evenodd')
    ctx.fillStyle = pupil
    ctx.beginPath()
    const p = 1.0 * cell
    roundRectPath4(ctx, x + 2 * cell, y + 2 * cell, 3 * cell, 3 * cell, [p, p, p, p])
    ctx.fill()
  }
  eye(0, 0)
  eye(0, n - 7)
  eye(n - 7, 0)

  // The waw seal. Knock a clean disc out of whatever poked in, then an ink disc,
  // a hairline gold ring, and the letter waw ("and") in gold.
  if (medallion && medallionModules > 0) {
    const cx = ox + mid * cell
    const cy = oy + mid * cell
    const drawSeal = () => {
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(cx, cy, knockR * cell, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      if (panel) {
        ctx.fillStyle = panel
        ctx.beginPath()
        ctx.arc(cx, cy, knockR * cell, 0, Math.PI * 2)
        ctx.fill()
      }
      const discR = knockR * 0.85 * cell
      ctx.fillStyle = ink
      ctx.beginPath()
      ctx.arc(cx, cy, discR, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = gold
      ctx.lineWidth = Math.max(1, 0.25 * cell)
      ctx.beginPath()
      ctx.arc(cx, cy, discR - cell, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = gold
      if (medallion === 'check') {
        ctx.strokeStyle = gold
        ctx.lineWidth = Math.max(2, 0.6 * cell)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(cx - discR * 0.42, cy + discR * 0.02)
        ctx.lineTo(cx - discR * 0.1, cy + discR * 0.36)
        ctx.lineTo(cx + discR * 0.46, cy - discR * 0.3)
        ctx.stroke()
      } else {
        // Shrink-to-fit inside the ink disc: the glyph may be swapped for any
        // short mark, but the disc geometry (and so scannability) never moves.
        const glyph = String(medallionGlyph || 'و').slice(0, 4)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        let fs = Math.round(medallionModules * 0.62 * cell)
        const maxW = (discR - cell) * 1.5
        ctx.font = `300 ${fs}px ${medallionFont}, Georgia, serif`
        while (fs > 8 && ctx.measureText(glyph).width > maxW) {
          fs = Math.floor(fs * 0.9)
          ctx.font = `300 ${fs}px ${medallionFont}, Georgia, serif`
        }
        ctx.fillText(glyph, cx, cy - discR * 0.15)
      }
    }
    drawSeal()
    if (medallion === 'waw' && document.fonts?.load) {
      document.fonts
        .load(`300 ${Math.round(medallionModules * 0.62 * cell)}px ${medallionFont}`, String(medallionGlyph || 'و'))
        .then(drawSeal)
        .catch(() => {})
    }
  }

  // Engraved coin ring, Latin and digits only (curved Arabic breaks joining).
  // Lives entirely outside the quiet zone, so it costs zero scannability.
  if (ring) {
    const cx = total / 2
    const cy = total / 2
    const radius = dim / 2 + band * 0.52
    const fs = Math.round(band * 0.34)
    ctx.fillStyle = ring.color || ink
    ctx.globalAlpha = 0.7
    ctx.font = `600 ${fs}px Cairo, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const arcText = (str, centreAngle, flip) => {
      const spread = (str.length * fs * 0.72) / radius
      let a = centreAngle - (flip ? -1 : 1) * spread / 2
      for (const chch of str) {
        ctx.save()
        ctx.translate(cx + radius * Math.cos(a), cy + radius * Math.sin(a))
        ctx.rotate(a + (flip ? -Math.PI / 2 : Math.PI / 2))
        ctx.fillText(chch, 0, 0)
        ctx.restore()
        a += ((flip ? -1 : 1) * (fs * 0.72)) / radius
      }
    }
    arcText(ring.top || 'OSAMA & NOOR', -Math.PI / 2, false)
    arcText(ring.bottom || '21 . 08 . 2026', Math.PI / 2, true)
    ctx.globalAlpha = 1
  }

  return canvas
}

export function qrCanvas(text, size = 220, fg, bg = '#ffffff') {
  const canvas = document.createElement('canvas')
  if (!window.qrcode) return canvas
  const gold = themeColor('--gold', '#d8b072')
  const ink = fg || darken(gold, 0.42)
  const qr = window.qrcode(0, 'H')
  qr.addData(text)
  qr.make()
  const n = qr.getModuleCount()
  const quiet = 2
  const cell = Math.max(2, Math.floor(size / (n + quiet * 2)))
  const dim = cell * (n + quiet * 2)
  canvas.width = dim
  canvas.height = dim
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, dim, dim)
  ctx.fillStyle = ink
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c))
        ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell)
    }
  }
  // Centre logo: a clear white pad, a dark rounded badge, a gold "O&N" monogram.
  const pad = Math.round(dim * 0.3)
  const px = Math.round((dim - pad) / 2)
  ctx.fillStyle = bg
  roundRectPath(ctx, px, px, pad, pad, Math.round(pad * 0.16))
  ctx.fill()
  const badge = Math.round(pad * 0.8)
  const bx = Math.round((dim - badge) / 2)
  ctx.fillStyle = ink
  roundRectPath(ctx, bx, bx, badge, badge, Math.round(badge * 0.22))
  ctx.fill()
  ctx.fillStyle = gold
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `italic 700 ${Math.round(badge * 0.4)}px Georgia, "Times New Roman", serif`
  ctx.fillText('O&N', dim / 2, dim / 2 + badge * 0.03)
  return canvas
}
