import { api } from './api.js'
import { setData, store } from './store.js'

let started = false

// Re-render, but never clobber a field the user is actively editing — defer to its blur.
function safeRender(renderAll) {
  const a = document.activeElement
  const editing =
    a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('#app')
  if (editing) {
    a.addEventListener('blur', () => renderAll(), { once: true })
    return
  }
  renderAll()
}

export function startSync(renderAll) {
  if (started) return
  started = true
  const poll = async () => {
    if (!store.data || document.hidden) return
    try {
      const res = await api.state(store.data.rev)
      if (!res || res.same) return
      if (res.me) {
        setData(res)
        safeRender(renderAll)
      }
    } catch (e) {
      if (e.code === 401) location.reload()
    }
  }
  setInterval(poll, 5000)
  window.addEventListener('focus', poll)
}
