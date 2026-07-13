import { api } from './api.js'
import { qrCanvas } from './qr.js'
import { startScanner } from './scanner.js'
import { bumpRev, store } from './store.js'
import { confirmDelete, confirmDialog, toast, undoToast } from './ui.js'
import { escapeAttr, escapeHtml } from './util.js'

const CAP = 200
const passes = () => store.data.passes || (store.data.passes = [])
const cap = () => store.data.passCap || CAP
const find = (id) => passes().find((p) => String(p.id) === String(id))
const link = (token) => `${location.origin}/pass.html?token=${token}`

// While the door scanner is live we must not let the 5s sync poll re-render this
// panel out from under the running camera.
let scanning = false

const isRedeemed = (p) => p.status === 'redeemed'

function counts() {
  const list = passes()
  const used = list.filter(isRedeemed).length
  return {
    issued: list.length,
    used,
    unused: list.length - used,
    room: cap() - list.length,
  }
}

function passCard(p) {
  const l = link(p.token)
  const used = isRedeemed(p)
  const badge = used
    ? `<span class="pass-badge used">Checked in</span>`
    : `<span class="pass-badge ok">Valid</span>`
  const when =
    used && p.redeemedAt
      ? `<span class="pass-when">at ${escapeHtml(new Date(`${p.redeemedAt.replace(' ', 'T')}Z`).toLocaleString())}${p.redeemedBy ? ` &middot; ${escapeHtml(p.redeemedBy)}` : ''}</span>`
      : ''
  return `<div class="pass ${used ? 'is-used' : ''}" data-id="${p.id}">
      <div class="pass-head">
        <input class="pass-label" data-f="label" value="${escapeAttr(p.label)}" placeholder="Guest name (optional)">
        <button class="del" data-del="${p.id}" title="Delete">&times;</button>
      </div>
      <div class="pass-qr" data-token="${escapeAttr(p.token)}"></div>
      <div class="pass-status">${badge}${when}</div>
      <div class="pass-actions">
        <button class="btn ghost sm" data-copy="${escapeAttr(l)}">Copy link</button>
        <button class="btn ghost sm" data-dl="${p.id}">Download QR</button>
        ${used ? `<button class="btn ghost sm" data-unredeem="${p.id}">Undo check-in</button>` : ''}
      </div>
    </div>`
}

export function renderPasses() {
  const el = document.getElementById('tab-passes')
  if (!el) return
  // Do not tear down an active camera; refresh happens when the operator stops.
  if (scanning) return
  const c = counts()
  el.innerHTML = `
    <div class="card">
      <h2>Entrance passes</h2>
      <p class="hint">Up to ${cap()} single-use passes. Share the link or QR with each guest. At the door, scan to check them in. A pass works once, so a shared or screenshotted code cannot get two people in.</p>
      <div class="money-row">
        <div class="money"><div class="l">Issued</div><div class="v">${c.issued}<span class="pass-cap">/${cap()}</span></div></div>
        <div class="money"><div class="l">Checked in</div><div class="v" style="color:var(--emerald)">${c.used}</div></div>
        <div class="money"><div class="l">Not yet arrived</div><div class="v">${c.unused}</div></div>
      </div>
      <div class="toolbar" style="margin-top:14px;flex-wrap:wrap;gap:8px">
        <input id="passCount" type="number" min="1" max="${cap()}" value="${c.room > 0 ? c.room : 0}" style="width:84px" ${c.room <= 0 ? 'disabled' : ''}>
        <button class="btn sm" id="genPasses" ${c.room <= 0 ? 'disabled' : ''}>Generate passes</button>
        <button class="btn ghost sm" id="doorScan">Door check-in</button>
        <button class="btn ghost sm" id="printPasses" ${c.issued === 0 ? 'disabled' : ''}>Print all</button>
      </div>
      <div class="pass-add-one">
        <input id="passLabel" class="field" type="text" placeholder="Guest name (optional)" ${c.room <= 0 ? 'disabled' : ''}>
        <button class="btn ghost sm" id="addPass" ${c.room <= 0 ? 'disabled' : ''}>Add pass</button>
      </div>
      ${c.room <= 0 ? `<p class="hint" style="margin-top:8px">You have issued all ${cap()} passes. Delete one to free a slot.</p>` : ''}
      <div id="pass-scanner"></div>
      <div class="pass-grid">${passes().map(passCard).join('') || '<div class="empty">No passes yet. Generate your first batch.</div>'}</div>
    </div>`

  el.querySelectorAll('.pass-qr').forEach((m) => {
    const canvas = qrCanvas(link(m.dataset.token))
    canvas.className = 'qr-canvas'
    m.appendChild(canvas)
  })
  wire(el)
}

function wire(el) {
  el.querySelector('#genPasses')?.addEventListener('click', async () => {
    const n = Math.max(1, Number(el.querySelector('#passCount')?.value) || 1)
    const btn = el.querySelector('#genPasses')
    btn.disabled = true
    try {
      const r = await api.passesGenerate(n)
      bumpRev(r)
      if (r.created < n) {
        undoToast(`Generated ${r.created} (hit the ${r.cap} cap)`, () => {})
      }
      // Pull fresh state so the new tokens show immediately.
      const data = await api.state()
      if (data && data.me) {
        store.data = data
        renderPasses()
      }
    } catch (_) {
      btn.disabled = false
    }
  })

  el.querySelector('#addPass')?.addEventListener('click', async () => {
    const input = el.querySelector('#passLabel')
    const label = (input?.value || '').trim()
    const btn = el.querySelector('#addPass')
    btn.disabled = true
    try {
      const r = await api.passAdd(label)
      bumpRev(r)
      passes().push({ id: r.id, token: r.token, label, status: 'unused' })
      renderPasses()
    } catch (err) {
      btn.disabled = false
      toast({ type: 'err', message: err.message || 'Could not add the pass.' })
    }
  })

  el.querySelector('#doorScan')?.addEventListener('click', () => startDoor())

  el.querySelector('#printPasses')?.addEventListener('click', printAll)

  el.querySelectorAll('.pass-label').forEach((inp) =>
    inp.addEventListener('change', async (e) => {
      const p = find(e.target.closest('.pass').dataset.id)
      if (!p) return
      p.label = e.target.value
      try {
        bumpRev(await api.pass({ id: p.id, label: p.label }))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )

  el.querySelectorAll('[data-del]').forEach((b) =>
    b.addEventListener('click', async (e) => {
      const id = e.target.dataset.del
      const snap = find(id)
      if (!snap || !(await confirmDelete('this pass'))) return
      store.data.passes = passes().filter((p) => String(p.id) !== String(id))
      renderPasses()
      try {
        bumpRev(await api.passDelete(id))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )

  el.querySelectorAll('[data-unredeem]').forEach((b) =>
    b.addEventListener('click', async () => {
      const p = find(b.dataset.unredeem)
      if (!p) return
      const ok = await confirmDialog({
        title: 'Undo check-in?',
        message: 'This pass will work again for a single entry.',
        confirm: 'Undo check-in',
      })
      if (!ok) return
      p.status = 'unused'
      delete p.redeemedAt
      delete p.redeemedBy
      renderPasses()
      try {
        bumpRev(await api.passUnredeem(p.id))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )

  el.querySelectorAll('[data-copy]').forEach((b) =>
    b.addEventListener('click', () => {
      navigator.clipboard?.writeText(b.dataset.copy)
      const t = b.textContent
      b.textContent = 'Copied'
      setTimeout(() => {
        b.textContent = t
      }, 1200)
    }),
  )

  el.querySelectorAll('[data-dl]').forEach((b) =>
    b.addEventListener('click', () => {
      const p = find(b.dataset.dl)
      if (!p) return
      const canvas = qrCanvas(link(p.token), 600)
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `pass-${(p.label || p.token).slice(0, 20).replace(/\s+/g, '-')}.png`
      a.click()
    }),
  )
}

// The door. Camera stays live between guests; each scan is redeemed once, with a
// short cooldown so the same code held in frame is not hammered.
function startDoor() {
  const mount = document.getElementById('pass-scanner')
  if (!mount) return
  scanning = true
  let busy = false
  let lastToken = ''
  let lastAt = 0

  const show = (cls, title, sub) => {
    const box = document.getElementById('scanResult')
    if (!box) return
    box.className = `scan-result ${cls}`
    box.innerHTML = `<div class="scan-title">${escapeHtml(title)}</div>${sub ? `<div class="scan-sub">${escapeHtml(sub)}</div>` : ''}`
  }

  const onDecode = async (decoded) => {
    const now = Date.now()
    if (busy) return
    if (decoded === lastToken && now - lastAt < 3500) return
    lastToken = decoded
    lastAt = now
    busy = true
    show('pending', 'Checking...', '')
    try {
      const r = await api.passRedeem(decoded)
      bumpRev(r)
      if (r.result === 'ok') {
        show('ok', 'Welcome', r.label ? r.label : 'Valid pass, first entry')
        const p = passes().find((x) => decoded.includes(x.token))
        if (p) {
          p.status = 'redeemed'
          p.redeemedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
        }
      } else if (r.result === 'used') {
        const at = r.redeemedAt
          ? new Date(`${r.redeemedAt.replace(' ', 'T')}Z`).toLocaleTimeString()
          : ''
        show(
          'used',
          'Already used',
          `${r.label ? `${r.label} - ` : ''}checked in${at ? ` at ${at}` : ''}${r.redeemedBy ? ` by ${r.redeemedBy}` : ''}`,
        )
      } else {
        show(
          'bad',
          'Not a valid pass',
          'This code is not one of your entrance passes.',
        )
      }
    } catch (_) {
      show('bad', 'Could not check', 'Try again.')
    } finally {
      setTimeout(() => {
        busy = false
      }, 1200)
    }
  }

  // startScanner injects the camera + a Stop button; we own the result box.
  startScanner(mount, onDecode)
  const stopBtn = document.getElementById('stopScan')
  if (stopBtn) {
    const orig = stopBtn.onclick
    stopBtn.onclick = () => {
      scanning = false
      if (orig) orig()
      renderPasses()
    }
  }
}

// A print-friendly sheet of every pass: label + QR, ready to cut out.
function printAll() {
  const w = window.open('', '_blank')
  if (!w) return
  const cells = passes()
    .map((p) => {
      const c = qrCanvas(link(p.token), 300)
      return `<div class="cell"><img src="${c.toDataURL('image/png')}" width="150" height="150"><div class="cap">${escapeHtml(p.label || 'Guest')}</div></div>`
    })
    .join('')
  w.document.write(`<!doctype html><html><head><title>Entrance passes</title>
    <style>
      body{font-family:system-ui,sans-serif;margin:16px}
      h1{font-size:16px;margin:0 0 12px}
      .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
      .cell{border:1px solid #ddd;border-radius:8px;padding:8px;text-align:center;break-inside:avoid}
      .cap{margin-top:6px;font-size:12px}
      @media print{.cell{border-color:#bbb}}
    </style></head><body>
    <h1>Osama &amp; Noor - entrance passes (${passes().length})</h1>
    <div class="grid">${cells}</div>
    <script>window.onload=function(){window.print()}</script>
    </body></html>`)
  w.document.close()
}
