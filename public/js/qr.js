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
