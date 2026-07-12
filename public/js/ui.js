import { escapeHtml } from './util.js'

// Mobile-first confirm dialog. Returns a promise that resolves true/false.
export function confirmDialog({
  title = 'Are you sure?',
  message = '',
  confirm = 'Confirm',
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root')
    if (!root) {
      resolve(window.confirm(message || title))
      return
    }
    root.innerHTML = `
      <div class="modal-backdrop" data-cancel></div>
      <div class="modal" role="dialog" aria-modal="true">
        <h3 class="modal-title">${escapeHtml(title)}</h3>
        ${message ? `<p class="modal-msg">${escapeHtml(message)}</p>` : ''}
        <div class="modal-actions">
          <button class="btn ghost" data-cancel>Cancel</button>
          <button class="btn ${danger ? 'danger' : ''}" data-ok>${escapeHtml(confirm)}</button>
        </div>
      </div>`
    root.classList.add('open')
    const close = (val) => {
      root.classList.remove('open')
      root.innerHTML = ''
      document.removeEventListener('keydown', onKey)
      resolve(val)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') close(false)
    }
    document.addEventListener('keydown', onKey)
    root
      .querySelectorAll('[data-cancel]')
      .forEach((el) => (el.onclick = () => close(false)))
    root.querySelector('[data-ok]').onclick = () => close(true)
    root.querySelector('[data-ok]').focus()
  })
}

// Convenience for deletes.
export const confirmDelete = (thing) =>
  confirmDialog({
    title: `Delete ${thing}?`,
    message: 'You can undo this right after.',
    confirm: 'Delete',
    danger: true,
  })

// Undo toast. Shows for ~8s; clicking Undo runs the provided reverse action.
let undoTimer
export function undoToast(label, undoFn) {
  const root = document.getElementById('toast-root')
  if (!root) return
  clearTimeout(undoTimer)
  root.innerHTML = `<div class="toast"><span class="toast-label">${escapeHtml(label)}</span><button class="toast-undo">Undo</button></div>`
  root.classList.add('show')
  const dismiss = () => {
    root.classList.remove('show')
    root.innerHTML = ''
  }
  root.querySelector('.toast-undo').onclick = async () => {
    clearTimeout(undoTimer)
    dismiss()
    try {
      await undoFn()
    } catch (_) {
      /* best effort */
    }
  }
  undoTimer = setTimeout(dismiss, 8000)
}
