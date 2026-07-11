import { api } from './api.js'
import { qrCanvas } from './qr.js'
import { startScanner } from './scanner.js'
import { bumpRev, meId, store } from './store.js'
import { debounce, escapeAttr, escapeHtml } from './util.js'

const invites = () => store.data.invites || (store.data.invites = [])
const find = (id) => invites().find((i) => String(i.id) === String(id))
const link = (token) => `${location.origin}/rsvp.html?token=${token}`

const pushInvite = debounce(async (id) => {
  const i = find(id)
  if (!i) return
  try {
    bumpRev(await api.invite(i))
  } catch (_) {
    /* next poll reconciles */
  }
}, 500)

function summary() {
  let coming = 0
  let replies = 0
  invites().forEach((i) =>
    (i.rsvps || []).forEach((r) => {
      replies += 1
      if (r.attending === 'yes') coming += r.headcount || 0
    }),
  )
  return { coming, replies }
}

function rsvpRow(r) {
  const side =
    r.side === 'you'
      ? "Groom's side"
      : r.side === 'her'
        ? "Bride's side"
        : 'Both'
  const status = r.attending === 'yes' ? `Coming, ${r.headcount}` : 'Declined'
  return `<div class="rsvp-row ${r.attending === 'no' ? 'no' : ''}">
      <span class="rsvp-name">${escapeHtml(r.name || 'Guest')}</span>
      <span class="rsvp-meta">${status} &middot; ${side}</span>
      ${r.message ? `<span class="rsvp-msg">${escapeHtml(r.message)}</span>` : ''}
    </div>`
}

function inviteCard(inv) {
  const l = link(inv.token)
  const rs = inv.rsvps || []
  return `<div class="inv" data-id="${inv.id}">
      <div class="inv-head">
        <input class="inv-label" data-f="label" value="${escapeAttr(inv.label)}" placeholder="Who is this for, e.g. Noor's cousins">
        <button class="del" data-del="${inv.id}" title="Delete">&times;</button>
      </div>
      <div class="inv-qr" data-token="${escapeAttr(inv.token)}"></div>
      <div class="inv-link"><input readonly value="${escapeAttr(l)}"><button class="btn ghost sm" data-copy="${escapeAttr(l)}">Copy</button></div>
      <div class="inv-actions">
        <button class="btn ghost sm" data-dl="${inv.id}">Download QR</button>
        <span class="inv-count">${rs.length} repl${rs.length === 1 ? 'y' : 'ies'}</span>
      </div>
      ${rs.length ? `<div class="inv-rsvps">${rs.map(rsvpRow).join('')}</div>` : ''}
    </div>`
}

export function renderInvite() {
  const el = document.getElementById('tab-invite')
  if (!el) return
  const s = summary()
  el.innerHTML = `
    <div class="card">
      <h2>Invites</h2>
      <p class="hint">Make an invite, share the link or the QR. Guests RSVP without logging in, and the replies land here.</p>
      <div class="money-row">
        <div class="money"><div class="l">Guests coming</div><div class="v" style="color:var(--emerald)">${s.coming}</div></div>
        <div class="money"><div class="l">Replies</div><div class="v">${s.replies}</div></div>
      </div>
      <div class="toolbar" style="margin-top:14px">
        <button class="btn sm" id="addInvite">+ New invite</button>
        <button class="btn ghost sm" id="scanInvite">Scan a QR</button>
      </div>
      <div id="scanner-mount"></div>
      <div class="inv-list">${invites().map(inviteCard).join('') || '<div class="empty">No invites yet. Make your first one.</div>'}</div>
    </div>`

  el.querySelectorAll('.inv-qr').forEach((m) => {
    const c = qrCanvas(link(m.dataset.token))
    c.className = 'qr-canvas'
    m.appendChild(c)
  })
  wire(el)
}

function wire(el) {
  el.querySelector('#addInvite')?.addEventListener('click', async () => {
    try {
      const r = await api.invite({ label: '' })
      bumpRev(r)
      invites().push({
        id: r.id,
        token: r.token,
        label: '',
        active: true,
        rsvps: [],
        rsvpCount: 0,
        by: 'You',
        byId: meId(),
        at: new Date().toISOString(),
      })
      renderInvite()
    } catch (_) {
      /* ignore */
    }
  })

  el.querySelector('#scanInvite')?.addEventListener('click', () =>
    startScanner(document.getElementById('scanner-mount')),
  )

  el.querySelectorAll('.inv-label').forEach((inp) =>
    inp.addEventListener('input', (e) => {
      const i = find(e.target.closest('.inv').dataset.id)
      if (!i) return
      i.label = e.target.value
      i.by = 'You'
      i.byId = meId()
      i.at = new Date().toISOString()
      pushInvite(i.id)
    }),
  )

  el.querySelectorAll('[data-del]').forEach((b) =>
    b.addEventListener('click', async (e) => {
      const id = e.target.dataset.del
      store.data.invites = invites().filter((i) => String(i.id) !== String(id))
      renderInvite()
      try {
        bumpRev(await api.inviteDelete(id))
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
      const inv = find(b.dataset.dl)
      if (!inv) return
      const c = qrCanvas(link(inv.token), 600)
      const a = document.createElement('a')
      a.href = c.toDataURL('image/png')
      a.download = `invite-${(inv.label || inv.token).slice(0, 20).replace(/\s+/g, '-')}.png`
      a.click()
    }),
  )
}
