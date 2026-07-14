// Pointer-based drag-to-reorder for list rows. Works with mouse and touch, and
// survives the app's 5s pull re-render: sync.js checks isDragging() and defers.
//
// Usage: makeSortable(container, (orderedIds) => persist(orderedIds))
// - container holds rows marked `.sortable` with `data-sort-id`, each containing
//   a `.drag-handle`. Only the handle starts a drag, so inline inputs stay usable.
// - onReorder receives the sort-ids in their new top-to-bottom order.

let dragging = false
export const isDragging = () => dragging

export function makeSortable(container, onReorder) {
  if (!container) return
  container.querySelectorAll('.drag-handle').forEach((handle) => {
    handle.addEventListener('pointerdown', (e) =>
      begin(e, handle, container, onReorder),
    )
  })
}

function begin(e, handle, container, onReorder) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  const row = handle.closest('.sortable')
  if (!row) return
  e.preventDefault()

  dragging = true
  document.body.classList.add('drag-active')
  row.classList.add('dragging')
  try {
    handle.setPointerCapture(e.pointerId)
  } catch (_) {
    /* not all targets support capture */
  }

  const rows = () => [...container.querySelectorAll('.sortable')]

  const onMove = (ev) => {
    const y = ev.clientY
    const others = rows().filter((x) => x !== row)
    let placed = false
    for (const sib of others) {
      const r = sib.getBoundingClientRect()
      if (y < r.top + r.height / 2) {
        container.insertBefore(row, sib)
        placed = true
        break
      }
    }
    if (!placed) container.appendChild(row)
  }

  const end = () => {
    dragging = false
    document.body.classList.remove('drag-active')
    row.classList.remove('dragging')
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
    const ids = rows().map((x) => x.dataset.sortId)
    onReorder(ids)
    // Flush any re-render the poll deferred while we were dragging.
    window.dispatchEvent(new Event('overlay:closed'))
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', end)
  window.addEventListener('pointercancel', end)
}
