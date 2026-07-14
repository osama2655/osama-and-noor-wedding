import { api } from './api.js'
import { isDragging } from './drag-sort.js'
import { setData, store } from './store.js'
import { isOverlayOpen } from './ui.js'

let started = false

// Re-render, but never clobber an open overlay (sheet/menu/confirm) or a field
// the user is actively editing. Defer to the overlay's close or the field's blur.
function safeRender(renderAll) {
  if (isOverlayOpen() || isDragging()) {
    window.addEventListener('overlay:closed', () => safeRender(renderAll), {
      once: true,
    })
    return
  }
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
