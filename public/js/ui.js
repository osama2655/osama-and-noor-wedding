import { escapeAttr, escapeHtml } from './util.js'

// ---------------------------------------------------------------------------
// Overlay system. Three layers, bottom to top: the Sheet (#sheet-root, z 190),
// confirm/prompt modals (#modal-root, z 200) which may stack over a sheet, and
// the kebab menu (positioned fixed, z 120, closes on any outside interaction).
// The 5s sync poll defers full re-renders while any of these is open; every
// close dispatches 'overlay:closed' so the deferred render can flush.
// ---------------------------------------------------------------------------

const overlayClosed = () =>
  window.dispatchEvent(new CustomEvent('overlay:closed'))

export function isOverlayOpen() {
  return (
    !!menuEl ||
    !!sheetState ||
    !!document.getElementById('modal-root')?.classList.contains('open')
  )
}

// --- The Sheet: centered modal on desktop, bottom sheet on mobile -----------

let sheetState = null

export function openSheet({
  title = '',
  size = 'md',
  content = '',
  headActions = '',
  onClose,
} = {}) {
  const root = document.getElementById('sheet-root')
  if (!root) return null
  closeKebabMenu()
  if (sheetState) sheetState.close()
  const opener = document.activeElement
  root.innerHTML = `
    <div class="sheet-backdrop" data-sheet-close></div>
    <div class="sheet sheet-${escapeAttr(size)}" role="dialog" aria-modal="true">
      <div class="sheet-grab" aria-hidden="true"></div>
      <div class="sheet-head">
        <h3 class="sheet-title">${escapeHtml(title)}</h3>
        <div class="sheet-actions">${headActions}</div>
        <button class="sheet-x" type="button" aria-label="Close" data-sheet-close>&times;</button>
      </div>
      <div class="sheet-body"></div>
    </div>`
  root.classList.add('open')
  document.body.classList.add('sheet-lock')
  const panel = root.querySelector('.sheet')
  const body = root.querySelector('.sheet-body')
  if (typeof content === 'string') body.innerHTML = content
  else if (content) body.appendChild(content)
  const close = () => {
    if (!sheetState) return
    sheetState = null
    root.classList.remove('open')
    root.innerHTML = ''
    document.body.classList.remove('sheet-lock')
    document.removeEventListener('keydown', onKey, true)
    if (onClose) onClose()
    if (opener && document.contains(opener)) opener.focus()
    overlayClosed()
  }
  const onKey = (e) => {
    if (e.key === 'Escape') {
      if (menuEl) return
      if (document.getElementById('modal-root')?.classList.contains('open'))
        return
      e.stopPropagation()
      close()
      return
    }
    if (e.key !== 'Tab') return
    const f = [
      ...panel.querySelectorAll(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
      ),
    ].filter((x) => !x.disabled && x.offsetParent !== null)
    if (!f.length) return
    const first = f[0]
    const last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
  document.addEventListener('keydown', onKey, true)
  root
    .querySelectorAll('[data-sheet-close]')
    .forEach((el) => el.addEventListener('click', close))
  sheetState = { close, body, panel }
  const firstField = panel.querySelector('input,select,textarea')
  ;(firstField || panel.querySelector('.sheet-x')).focus()
  return sheetState
}

export function closeSheet() {
  if (sheetState) sheetState.close()
}
export const isSheetOpen = () => !!sheetState

// --- The kebab: one action pattern for every row and card -------------------

const KEBAB_ICON =
  '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="5" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="19" r="1.8" fill="currentColor"/></svg>'

export const kebabButton = (label = 'Actions') =>
  `<button type="button" class="kebab" data-kebab aria-haspopup="menu" aria-label="${escapeAttr(label)}">${KEBAB_ICON}</button>`

let menuEl = null
let menuAnchor = null

export function closeKebabMenu(refocus = false) {
  if (!menuEl) return
  menuEl.remove()
  menuEl = null
  document.removeEventListener('pointerdown', onMenuDocDown, true)
  document.removeEventListener('keydown', onMenuKey, true)
  if (refocus && menuAnchor && document.contains(menuAnchor)) menuAnchor.focus()
  menuAnchor = null
  overlayClosed()
}

function onMenuDocDown(e) {
  if (menuEl && !menuEl.contains(e.target) && !menuAnchor?.contains(e.target))
    closeKebabMenu()
}

function onMenuKey(e) {
  if (!menuEl) return
  const items = [...menuEl.querySelectorAll('.menu-item:not(:disabled)')]
  const i = items.indexOf(document.activeElement)
  if (e.key === 'Escape') {
    e.stopPropagation()
    closeKebabMenu(true)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    items[(i + 1) % items.length]?.focus()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    items[(i - 1 + items.length) % items.length]?.focus()
  }
}

// items: [{label, onClick, destructive, disabled, separatorBefore}]
export function openKebabMenu(anchor, items) {
  if (menuEl && menuAnchor === anchor) {
    closeKebabMenu()
    return
  }
  closeKebabMenu()
  menuAnchor = anchor
  menuEl = document.createElement('div')
  menuEl.className = 'menu'
  menuEl.setAttribute('role', 'menu')
  menuEl.innerHTML = items
    .map(
      (it, idx) =>
        `${it.separatorBefore ? '<div class="menu-sep"></div>' : ''}<button type="button" class="menu-item ${it.destructive ? 'destructive' : ''}" role="menuitem" data-mi="${idx}" ${it.disabled ? 'disabled' : ''}>${escapeHtml(it.label)}</button>`,
    )
    .join('')
  document.body.appendChild(menuEl)
  const r = anchor.getBoundingClientRect()
  const mw = menuEl.offsetWidth
  const mh = menuEl.offsetHeight
  const x = Math.max(8, Math.min(r.right - mw, window.innerWidth - mw - 8))
  let y = r.bottom + 6
  if (y + mh > window.innerHeight - 8) y = Math.max(8, r.top - mh - 6)
  menuEl.style.left = `${Math.round(x)}px`
  menuEl.style.top = `${Math.round(y)}px`
  menuEl.querySelectorAll('.menu-item').forEach((b) =>
    b.addEventListener('click', () => {
      const it = items[Number(b.dataset.mi)]
      closeKebabMenu()
      if (it && typeof it.onClick === 'function') it.onClick()
    }),
  )
  document.addEventListener('pointerdown', onMenuDocDown, true)
  document.addEventListener('keydown', onMenuKey, true)
  menuEl.querySelector('.menu-item:not(:disabled)')?.focus()
}

// --- Empty state -------------------------------------------------------------

export const emptyState = ({
  icon = '&#10022;',
  title = '',
  sub = '',
  cta = '',
  ctaId = '',
} = {}) =>
  `<div class="empty-state">
    <div class="es-ico" aria-hidden="true">${icon}</div>
    <div class="es-title">${escapeHtml(title)}</div>
    ${sub ? `<div class="es-sub">${escapeHtml(sub)}</div>` : ''}
    ${cta ? `<button class="btn sm" type="button" id="${escapeAttr(ctaId)}">${escapeHtml(cta)}</button>` : ''}
  </div>`

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
      overlayClosed()
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
      overlayClosed()
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
