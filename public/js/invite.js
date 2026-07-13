import { api } from './api.js'
import { WED_DEFAULT } from './content.js'
import { qrCanvas } from './qr.js'
import { startScanner } from './scanner.js'
import { bumpRev, meId, store } from './store.js'
import { confirmDelete, toast, undoToast } from './ui.js'
import { debounce, escapeAttr, escapeHtml } from './util.js'

const invites = () => store.data.invites || (store.data.invites = [])
const find = (id) => invites().find((i) => String(i.id) === String(id))
const link = (token) => `${location.origin}/rsvp.html?token=${token}`

const SIDES = [
  ['you', "Groom's side"],
  ['her', "Bride's side"],
  ['both', 'Both'],
]
const ATTENDING = [
  ['yes', 'Coming'],
  ['no', 'Declined'],
]
const sideLabel = (v) => (SIDES.find(([s]) => s === v) || SIDES[2])[1]
const clampHead = (v) => Math.max(1, Math.min(20, Math.round(Number(v)) || 1))
const selectOptions = (pairs, selected) =>
  pairs
    .map(
      ([v, label]) =>
        `<option value="${v}"${v === selected ? ' selected' : ''}>${label}</option>`,
    )
    .join('')

const pushInvite = debounce(async (id) => {
  const i = find(id)
  if (!i) return
  try {
    bumpRev(await api.invite(i))
  } catch (_) {
    /* next poll reconciles */
  }
}, 500)

// One debounce timer per reply, so editing two replies inside the window never
// drops the first one's save the way a single shared timer would.
const rsvpTimers = new Map()
function queueRsvp(inviteId, rsvpId) {
  const key = String(rsvpId)
  clearTimeout(rsvpTimers.get(key))
  rsvpTimers.set(
    key,
    setTimeout(async () => {
      rsvpTimers.delete(key)
      const r = (find(inviteId)?.rsvps || []).find((x) => String(x.id) === key)
      if (!r) return
      try {
        bumpRev(
          await api.rsvpUpdate({
            id: r.id,
            name: r.name,
            side: r.side,
            headcount: r.headcount,
            attending: r.attending,
            message: r.message,
          }),
        )
      } catch (_) {
        /* next poll reconciles */
      }
    }, 500),
  )
}

function summary() {
  let coming = 0
  let replies = 0
  invites().forEach((i) =>
    (i.rsvps || []).forEach((r) => {
      replies += 1
      if (r.attending === 'yes') coming += r.headcount || 0
    }),
  )
  return { invites: invites().length, replies, coming }
}

function whatsappMessage(inv) {
  const date = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${store.data.wedDate || WED_DEFAULT}T00:00:00`))
  return `Osama & Noor are getting married. ${date}, Bahrain. We would love to have you. Please RSVP: ${link(inv.token)}`
}

function rsvpRow(r) {
  return `<div class="rsvp-row ${r.attending === 'no' ? 'no' : ''}" data-rid="${r.id}">
      <div class="rsvp-top">
        <input class="field" data-f="name" value="${escapeAttr(r.name)}" placeholder="Guest name">
        <button class="del" data-rdel="${r.id}" title="Delete reply">&times;</button>
      </div>
      <div class="rsvp-f-grid">
        <select class="field" data-f="side" aria-label="Side">${selectOptions(SIDES, r.side)}</select>
        <select class="field" data-f="attending" aria-label="Coming or not">${selectOptions(ATTENDING, r.attending)}</select>
        <input class="field" data-f="headcount" type="number" min="1" max="20" value="${escapeAttr(clampHead(r.headcount))}" aria-label="Headcount">
      </div>
      <input class="field" data-f="message" value="${escapeAttr(r.message)}" placeholder="Message (optional)">
    </div>`
}

function addForm(inv) {
  return `<div class="rsvp-add">
      <button class="btn ghost sm" data-add-toggle="${inv.id}">+ Log a reply</button>
      <div class="rsvp-add-form" hidden>
        <input class="field" data-af="name" placeholder="Guest name">
        <div class="rsvp-f-grid">
          <select class="field" data-af="side" aria-label="Side">${selectOptions(SIDES, 'both')}</select>
          <select class="field" data-af="attending" aria-label="Coming or not">${selectOptions(ATTENDING, 'yes')}</select>
          <input class="field" data-af="headcount" type="number" min="1" max="20" value="1" aria-label="Headcount">
        </div>
        <input class="field" data-af="message" placeholder="Message (optional)">
        <button class="btn sm" data-add="${inv.id}">Add reply</button>
      </div>
    </div>`
}

function inviteCard(inv) {
  const l = link(inv.token)
  const rs = inv.rsvps || []
  return `<div class="inv ${inv.active ? '' : 'is-closed'}" data-id="${inv.id}">
      <div class="inv-head">
        <input class="inv-label" data-f="label" value="${escapeAttr(inv.label)}" placeholder="Who is this for, e.g. Noor's cousins">
        ${inv.active ? '' : '<span class="badge inv-closed-badge">Closed</span>'}
        <button class="del" data-del="${inv.id}" title="Delete">&times;</button>
      </div>
      <div class="inv-qr" data-token="${escapeAttr(inv.token)}"></div>
      <div class="inv-link">
        <input readonly value="${escapeAttr(l)}">
        <button class="btn ghost sm" data-copy="${escapeAttr(l)}">Copy</button>
        <button class="btn ghost sm" data-wa="${inv.id}" title="Copy WhatsApp message">WhatsApp</button>
      </div>
      <div class="inv-actions">
        <div class="inv-actions-l">
          <button class="btn ghost sm" data-dl="${inv.id}">Download QR</button>
          <button class="btn ghost sm" data-toggle="${inv.id}">${inv.active ? 'Close' : 'Reopen'}</button>
        </div>
        <span class="inv-count">${rs.length} repl${rs.length === 1 ? 'y' : 'ies'}</span>
      </div>
      ${rs.length ? `<div class="inv-rsvps">${rs.map(rsvpRow).join('')}</div>` : ''}
      ${addForm(inv)}
    </div>`
}

export function renderInvite() {
  const el = document.getElementById('tab-invite')
  if (!el) return
  const s = summary()
  el.innerHTML = `
    <div class="card">
      <h2>Invites</h2>
      <p class="hint">Make an invite, share the link or the QR. Guests RSVP without logging in, and the replies land here. You can also log replies that arrive by phone or WhatsApp.</p>
      <div class="money-row">
        <div class="money"><div class="l">Invites</div><div class="v">${s.invites}</div></div>
        <div class="money"><div class="l">Replies</div><div class="v">${s.replies}</div></div>
        <div class="money"><div class="l">Guests coming</div><div class="v" style="color:var(--emerald)">${s.coming}</div></div>
      </div>
      <div class="toolbar" style="margin-top:14px;flex-wrap:wrap;gap:8px">
        <button class="btn sm" id="addInvite">+ New invite</button>
        <button class="btn ghost sm" id="scanInvite">Scan a QR</button>
        <button class="btn ghost sm" id="printGuests"${s.replies === 0 ? ' disabled' : ''}>Print guest list</button>
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

  el.querySelector('#printGuests')?.addEventListener('click', printGuests)

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

  el.querySelectorAll('.rsvp-row .field').forEach((inp) => {
    inp.addEventListener('input', (e) => {
      const inv = find(e.target.closest('.inv').dataset.id)
      const r = (inv?.rsvps || []).find(
        (x) => String(x.id) === e.target.closest('.rsvp-row').dataset.rid,
      )
      if (!r) return
      const f = e.target.dataset.f
      r[f] = f === 'headcount' ? clampHead(e.target.value) : e.target.value
      queueRsvp(inv.id, r.id)
    })
    // Headcount and attending feed the summary and the declined styling, so
    // re-render once the value is committed (mirrors the dates module).
    if (inp.dataset.f === 'headcount' || inp.dataset.f === 'attending')
      inp.addEventListener('change', renderInvite)
  })

  el.querySelectorAll('[data-rdel]').forEach((b) =>
    b.addEventListener('click', async (e) => {
      const inv = find(e.target.closest('.inv').dataset.id)
      const id = e.target.dataset.rdel
      const snap = (inv?.rsvps || []).find((x) => String(x.id) === String(id))
      if (!snap || !(await confirmDelete('this reply'))) return
      const data = {
        name: snap.name,
        side: snap.side,
        headcount: snap.headcount,
        attending: snap.attending,
        message: snap.message,
      }
      inv.rsvps = (inv.rsvps || []).filter((x) => String(x.id) !== String(id))
      renderInvite()
      undoToast('Reply deleted', async () => {
        const r = await api.rsvpAdd({ invite_id: inv.id, ...data })
        bumpRev(r)
        inv.rsvps.unshift({ id: r.id, ...data, at: new Date().toISOString() })
        renderInvite()
      })
      try {
        bumpRev(await api.rsvpDelete(id))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )

  el.querySelectorAll('[data-add-toggle]').forEach((b) =>
    b.addEventListener('click', () => {
      const form = b.parentElement.querySelector('.rsvp-add-form')
      if (!form) return
      form.hidden = !form.hidden
      if (!form.hidden) form.querySelector('[data-af="name"]')?.focus()
    }),
  )

  el.querySelectorAll('[data-add]').forEach((b) =>
    b.addEventListener('click', async () => {
      const inv = find(b.dataset.add)
      if (!inv) return
      const form = b.closest('.rsvp-add-form')
      const read = (k) => form.querySelector(`[data-af="${k}"]`)?.value ?? ''
      const reply = {
        name: read('name').trim(),
        side: read('side'),
        attending: read('attending'),
        headcount: clampHead(read('headcount')),
        message: read('message').trim(),
      }
      b.disabled = true
      try {
        const r = await api.rsvpAdd({ invite_id: inv.id, ...reply })
        bumpRev(r)
        const list = inv.rsvps || (inv.rsvps = [])
        list.unshift({ id: r.id, ...reply, at: new Date().toISOString() })
        renderInvite()
      } catch (_) {
        b.disabled = false
      }
    }),
  )

  el.querySelectorAll('[data-toggle]').forEach((b) =>
    b.addEventListener('click', async () => {
      const inv = find(b.dataset.toggle)
      if (!inv) return
      inv.active = !inv.active
      inv.by = 'You'
      inv.byId = meId()
      inv.at = new Date().toISOString()
      renderInvite()
      try {
        bumpRev(
          await api.invite({ id: inv.id, label: inv.label, active: inv.active }),
        )
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )

  el.querySelectorAll('[data-wa]').forEach((b) =>
    b.addEventListener('click', () => {
      const inv = find(b.dataset.wa)
      if (!inv) return
      const done = navigator.clipboard?.writeText(whatsappMessage(inv))
      if (done)
        done.then(
          () => toast({ type: 'ok', message: 'WhatsApp message copied' }),
          () => {},
        )
    }),
  )

  el.querySelectorAll('[data-del]').forEach((b) =>
    b.addEventListener('click', async (e) => {
      const id = e.target.dataset.del
      const snap = find(id)
      if (!snap || !(await confirmDelete('this invite'))) return
      const label = snap.label
      store.data.invites = invites().filter((i) => String(i.id) !== String(id))
      renderInvite()
      undoToast('Invite deleted', async () => {
        const r = await api.invite({ label })
        bumpRev(r)
        invites().push({
          id: r.id,
          token: r.token,
          label,
          active: true,
          rsvps: [],
          rsvpCount: 0,
          by: 'You',
          byId: meId(),
          at: new Date().toISOString(),
        })
        renderInvite()
      })
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

// A print-friendly, flat list of every reply across all invites: one row each,
// with a headcount total for the caterer.
function printGuests() {
  const w = window.open('', '_blank')
  if (!w) return
  let coming = 0
  const rows = []
  invites().forEach((inv) =>
    (inv.rsvps || []).forEach((r) => {
      const yes = r.attending === 'yes'
      if (yes) coming += r.headcount || 0
      rows.push(`<tr class="${yes ? '' : 'out'}">
        <td>${escapeHtml(r.name || 'Guest')}</td>
        <td>${escapeHtml(sideLabel(r.side))}</td>
        <td>${yes ? escapeHtml(String(clampHead(r.headcount))) : 'Declined'}</td>
        <td>${escapeHtml(inv.label || 'Untitled invite')}</td>
      </tr>`)
    }),
  )
  w.document.write(`<!doctype html><html><head><title>Guest list</title>
    <style>
      body{font-family:system-ui,sans-serif;margin:24px;color:#1a1a1a}
      h1{font-size:18px;margin:0 0 2px}
      .sub{color:#666;font-size:13px;margin:0 0 16px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th,td{text-align:left;padding:7px 10px;border-bottom:1px solid #e4e4e4}
      th{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#888}
      tr.out td{color:#9a9a9a}
      @media print{th,td{border-color:#ccc}}
    </style></head><body>
    <h1>Osama &amp; Noor guest list</h1>
    <p class="sub">${rows.length} repl${rows.length === 1 ? 'y' : 'ies'} &middot; ${coming} guests coming</p>
    <table>
      <thead><tr><th>Name</th><th>Side</th><th>Coming</th><th>Invite</th></tr></thead>
      <tbody>${rows.join('') || '<tr><td colspan="4">No replies yet.</td></tr>'}</tbody>
    </table>
    <script>window.onload=function(){window.print()}</script>
    </body></html>`)
  w.document.close()
}
