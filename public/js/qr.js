// Thin wrapper over the vendored qrcode-generator (loaded as a classic script, global `qrcode`).
export function qrCanvas(text, size = 220, fg = '#141414', bg = '#ffffff') {
  const canvas = document.createElement('canvas')
  if (!window.qrcode) return canvas
  const qr = window.qrcode(0, 'M')
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
  ctx.fillStyle = fg
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c))
        ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell)
    }
  }
  return canvas
}
