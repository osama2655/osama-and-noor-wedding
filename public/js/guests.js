import { api } from './api.js'
import { guestStats } from './stats.js'
import { bumpRev, meId, store } from './store.js'
import { confirmDelete, undoToast } from './ui.js'
import { byTag, debounce, escapeAttr } from './util.js'

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

export function renderGuestStats() {
  const s = guestStats()
  const el = document.getElementById('guestStats')
  if (!el) return
  el.innerHTML = `
    <div class="money"><div class="l">Total invited (seats)</div><div class="v">${s.seats}</div></div>
    <div class="money"><div class="l">Confirmed coming</div><div class="v" style="color:var(--emerald)">${s.coming}</div></div>
    <div class="money"><div class="l">Awaiting reply</div><div class="v" style="color:var(--amber)">${s.pending}</div></div>
    <div class="money"><div class="l">Your side / Noor's</div><div class="v">${s.you}<small> / ${s.her}</small></div></div>`
}

export function renderGuests() {
  const body = document.getElementById('guestBody')
  if (!body) return
  const rows = guests()
  if (!rows.length) {
    body.innerHTML =
      '<tr><td colspan="7" class="empty">No guests yet. Add your first party.</td></tr>'
  } else {
    body.innerHTML = rows
      .map(
        (g) => `
      <tr data-id="${g.id}">
        <td data-label="Name"><input value="${escapeAttr(g.name)}" data-f="name" placeholder="Name / family"></td>
        <td data-label="Side"><select data-f="side">
          <option value="you" ${g.side === 'you' ? 'selected' : ''}>Your side</option>
          <option value="her" ${g.side === 'her' ? 'selected' : ''}>Noor's side</option>
          <option value="both" ${g.side === 'both' ? 'selected' : ''}>Both</option></select></td>
        <td data-label="Seats"><input value="${escapeAttr(g.seats)}" data-f="seats" inputmode="numeric" placeholder="1"></td>
        <td data-label="RSVP"><select data-f="rsvp">
          <option value="pending" ${g.rsvp === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="yes" ${g.rsvp === 'yes' ? 'selected' : ''}>Coming</option>
          <option value="no" ${g.rsvp === 'no' ? 'selected' : ''}>Declined</option></select></td>
        <td data-label="Notes"><input value="${escapeAttr(g.notes)}" data-f="notes" placeholder="notes"></td>
        <td data-label="Updated" class="upd">${byTag(g, meId())}</td>
        <td class="del-cell"><button class="del" data-del="${g.id}">✕</button></td>
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
      g.by = 'You'
      g.byId = meId()
      g.at = new Date().toISOString()
      tr.querySelector('.upd').innerHTML = byTag(g, meId())
      renderGuestStats()
      pushGuest(g.id)
    })
  })

  body.querySelectorAll('.del').forEach((b) =>
    b.addEventListener('click', async (e) => {
      const id = e.target.dataset.del
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
    }),
  )

  renderGuestStats()
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
