import { escapeAttr, escapeHtml } from './util.js'

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
    // Safety: focus starts on Cancel, never on the destructive action.
    root.querySelector('button[data-cancel]').focus()
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

// Text/date prompt on the shared modal. Resolves the entered value, or null on cancel.
export function promptDialog({
  title = '',
  label = '',
  value = '',
  inputType = 'text',
  confirm = 'Save',
  placeholder = '',
} = {}) {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root')
    if (!root) {
      const r = window.prompt(label || title, value)
      resolve(r == null ? null : r)
      return
    }
    root.innerHTML = `
      <div class="modal-backdrop" data-cancel></div>
      <div class="modal" role="dialog" aria-modal="true">
        <h3 class="modal-title">${escapeHtml(title)}</h3>
        ${label ? `<label class="modal-label" for="modal-input">${escapeHtml(label)}</label>` : ''}
        <input id="modal-input" class="field modal-input" type="${escapeAttr(inputType)}" value="${escapeAttr(value)}"${placeholder ? ` placeholder="${escapeAttr(placeholder)}"` : ''} />
        <div class="modal-actions">
          <button class="btn ghost" type="button" data-cancel>Cancel</button>
          <button class="btn" type="button" data-ok>${escapeHtml(confirm)}</button>
        </div>
      </div>`
    root.classList.add('open')
    const input = root.querySelector('#modal-input')
    const close = (val) => {
      root.classList.remove('open')
      root.innerHTML = ''
      document.removeEventListener('keydown', onKey)
      resolve(val)
    }
    const submit = () => close(input.value)
    const onKey = (e) => {
      if (e.key === 'Escape') close(null)
      else if (e.key === 'Enter') {
        e.preventDefault()
        submit()
      }
    }
    document.addEventListener('keydown', onKey)
    root
      .querySelectorAll('[data-cancel]')
      .forEach((el) => (el.onclick = () => close(null)))
    root.querySelector('[data-ok]').onclick = submit
    input.focus()
    if (inputType !== 'date') {
      try {
        input.select()
      } catch (_) {
        /* some input types reject select() */
      }
    }
  })
}

// Shared toast lifecycle: one timer, one #toast-root owner.
let toastTimer
function clearToast() {
  clearTimeout(toastTimer)
  const root = document.getElementById('toast-root')
  if (!root) return
  root.classList.remove('show')
  root.innerHTML = ''
}
function openToast(html) {
  const root = document.getElementById('toast-root')
  if (!root) return null
  clearTimeout(toastTimer)
  root.innerHTML = html
  root.classList.add('show')
  return root
}

// Status toast. 'ok'/'info' auto-dismiss; 'err' stays until the user closes it.
export function toast({ type = 'info', message = '' } = {}) {
  const cls = type === 'ok' || type === 'err' ? type : 'info'
  const closable = type === 'err'
  const root = openToast(
    `<div class="toast ${cls}"><span class="toast-label">${escapeHtml(message)}</span>${
      closable
        ? '<button class="toast-close" type="button" aria-label="Dismiss">×</button>'
        : ''
    }</div>`,
  )
  if (!root) return
  if (closable) root.querySelector('.toast-close').onclick = clearToast
  else toastTimer = setTimeout(clearToast, 4000)
}

// Undo toast. Shows for ~8s; clicking Undo runs the provided reverse action.
export function undoToast(label, undoFn) {
  const root = openToast(
    `<div class="toast"><span class="toast-label">${escapeHtml(label)}</span><button class="toast-undo" type="button">Undo</button></div>`,
  )
  if (!root) return
  root.querySelector('.toast-undo').onclick = async () => {
    clearToast()
    try {
      await undoFn()
    } catch (_) {
      /* best effort */
    }
  }
  toastTimer = setTimeout(clearToast, 8000)
}
