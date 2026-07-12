// Standalone page a guest lands on when they scan their entrance pass. Read-only:
// it shows the pass and whether it is still valid, but never redeems it. Redemption
// only happens at the door via the authenticated check-in scanner.
const token = new URLSearchParams(location.search).get('token') || ''

function call(action) {
  return fetch(
    `api/index.php?action=${action}&token=${encodeURIComponent(token)}`,
  ).then((r) => r.json())
}

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m],
  )

async function init() {
  const root = document.getElementById('pass-root')
  if (!token) {
    root.innerHTML =
      '<div class="rsvp-card"><h1>Invalid pass</h1><p>This pass link is missing its code.</p></div>'
    return
  }
  let info
  try {
    info = await call('pass_info')
  } catch (_) {
    /* handled below */
  }
  if (!info || info.error) {
    root.innerHTML =
      '<div class="rsvp-card"><h1>Pass not found</h1><p>This code is not a valid entrance pass.</p></div>'
    return
  }
  const wed = new Date(`${info.wedDate}T00:00:00`).toLocaleDateString(
    undefined,
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  )
  const used = info.status === 'redeemed'
  const state = used
    ? `<div class="pass-state used"><div class="pass-state-t">Already checked in</div><div class="pass-state-s">This pass has been used at the entrance.</div></div>`
    : `<div class="pass-state ok"><div class="pass-state-t">Valid pass</div><div class="pass-state-s">Show this screen at the entrance. It works once.</div></div>`
  root.innerHTML = `<div class="rsvp-card">
      <div class="eyebrow">Your entrance pass</div>
      <h1>Osama <span class="amp">and</span> Noor</h1>
      <p class="rsvp-date">${esc(wed)}</p>
      ${info.label ? `<p class="pass-for">For ${esc(info.label)}</p>` : ''}
      <div class="pass-qr-big" id="passQr"></div>
      ${state}
    </div>`

  if (window.qrcode) {
    document.getElementById('passQr').appendChild(buildQr(location.href))
  }
}

// Minimal inline QR (this page does not load the app bundle).
function buildQr(text, size = 220) {
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
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, dim, dim)
  ctx.fillStyle = '#141414'
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c))
        ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell)
    }
  }
  return canvas
}

init()
