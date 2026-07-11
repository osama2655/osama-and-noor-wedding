import { api } from './api.js'
import { bumpRev, meId, store } from './store.js'
import { byTag, debounce, escapeAttr, escapeHtml } from './util.js'

const notes = () => store.data.notes || (store.data.notes = [])
const find = (id) => notes().find((n) => String(n.id) === String(id))

const push = debounce(async (id) => {
  const n = find(id)
  if (!n) return
  try {
    bumpRev(await api.note(n))
  } catch (_) {
    /* next poll reconciles */
  }
}, 500)

function noteCard(n) {
  return `<div class="note-card" data-id="${n.id}">
      <input class="note-title" data-f="title" value="${escapeAttr(n.title)}" placeholder="Title">
      <textarea class="note-body" data-f="body" placeholder="Write it down...">${escapeHtml(n.body || '')}</textarea>
      <div class="note-foot">${byTag(n, meId())}<button class="del" data-del="${n.id}" title="Delete">&times;</button></div>
    </div>`
}

export function renderNotes() {
  const el = document.getElementById('tab-notes')
  if (!el) return
  el.innerHTML = `
    <div class="card">
      <h2>Notes</h2>
      <p class="hint">Anything you want to remember, shared. Both of you can write here.</p>
      <div class="toolbar"><button class="btn sm" id="addNote">+ Add note</button></div>
      <div class="notes-list">${notes().map(noteCard).join('') || '<div class="empty">No notes yet. Add the first one.</div>'}</div>
    </div>`

  el.querySelector('#addNote')?.addEventListener('click', async () => {
    try {
      const r = await api.note({ title: '', body: '' })
      bumpRev(r)
      notes().unshift({
        id: r.id,
        title: '',
        body: '',
        by: 'You',
        byId: meId(),
        at: new Date().toISOString(),
      })
      renderNotes()
    } catch (_) {
      /* ignore */
    }
  })

  el.querySelectorAll('.note-card input, .note-card textarea').forEach((inp) =>
    inp.addEventListener('input', (e) => {
      const n = find(e.target.closest('.note-card').dataset.id)
      if (!n) return
      n[e.target.dataset.f] = e.target.value
      n.by = 'You'
      n.byId = meId()
      n.at = new Date().toISOString()
      push(n.id)
    }),
  )

  el.querySelectorAll('[data-del]').forEach((b) =>
    b.addEventListener('click', async (e) => {
      const id = e.target.dataset.del
      store.data.notes = notes().filter((n) => String(n.id) !== String(id))
      renderNotes()
      try {
        bumpRev(await api.noteDelete(id))
      } catch (_) {
        /* next poll reconciles */
      }
    }),
  )
}
