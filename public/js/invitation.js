// The Invitation tab: the settings surface for everything a guest sees. One
// configuration drives the pass page, the QR popup in the guest table, the
// downloads, and the shared WhatsApp card. Edits are a local draft until
// "Apply to guests"; the 5s sync poll must never rebuild the DOM mid-edit.
import { api } from './api.js'
import { WED_DEFAULT } from './content.js'
import {
  COUPLE,
  DEFAULT_INVITE,
  INVITE_THEMES,
  NAME_FACES,
  STR,
  buildInviteCard,
  resolveInvite,
} from './invite-card.js'
import { qrArtCanvas } from './qr.js'
import { bumpRev, store } from './store.js'
import { toast } from './ui.js'
import { escapeAttr, escapeHtml } from './util.js'

const SAMPLE_TOKEN = '0123456789abcdef0123456789abcdef'
const DESIGN_KEYS = [
  'inviteNameFace',
  'inviteNameScale',
  'groomFirstAr',
  'groomFamilyAr',
  'brideFirstAr',
  'brideFamilyAr',
  'eyebrowText',
  'footerText',
  'sealGlyph',
]
const NAME_FIELD_MAP = {
  groomFirstAr: ['groomFirst', COUPLE.groomFirst],
  brideFirstAr: ['brideFirst', COUPLE.brideFirst],
  groomFamilyAr: ['groomFamily', COUPLE.groomFamily],
  brideFamilyAr: ['brideFamily', COUPLE.brideFamily],
}
const FIELDS = [
  ['groomFirstAr', 'Groom first name', COUPLE.groomFirst, 'rtl'],
  ['brideFirstAr', 'Bride first name', COUPLE.brideFirst, 'rtl'],
  ['groomFamilyAr', 'Groom family', COUPLE.groomFamily, 'rtl'],
  ['brideFamilyAr', 'Bride family', COUPLE.brideFamily, 'rtl'],
  ['eyebrowText', 'Header line', STR.eyebrow, 'rtl'],
  ['sealGlyph', 'Seal glyph', 'و', 'rtl'],
  ['honoraryLabel', 'Guest line label', 'المكرمة', 'rtl'],
  ['venueAr', 'Venue', 'قاعة …', 'rtl'],
  ['timeReception', 'الاستقبال', '9:30', 'ltr'],
  ['timeZaffa', 'الزفة', '11:30', 'ltr'],
  ['timeDinner', 'العشاء', '12:30', 'ltr'],
  ['hijriDateAr', 'Hijri date (empty = automatic Umm al-Qura)', 'auto', 'rtl'],
  ['footerText', 'Footer line', STR.footer, 'rtl'],
]

let saved = { ...DEFAULT_INVITE }
let draft = null
let previewState = 'valid'
let previewTimer = 0
let applying = false

const snapshot = () => ({ ...DEFAULT_INVITE, ...(store.data.inviteCard || {}) })
const keysDiffer = (a, b) =>
  Object.keys(DEFAULT_INVITE).some((k) => String(a[k] ?? '') !== String(b[k] ?? ''))
const isDirty = () => !!draft && keysDiffer(draft, saved)
const stripKashida = (s) => String(s || '').replace(/ـ/g, '')
const passLink = () => `${location.origin}/pass.html?token=${SAMPLE_TOKEN}`

export function renderInvitation() {
  const el = document.getElementById('tab-invite')
  if (!el) return
  const fresh = snapshot()
  if (el.dataset.built) {
    // Sync tick: never rebuild the DOM under the user's cursor. Adopt remote
    // changes only when there is nothing unsaved here.
    const remoteChanged = keysDiffer(fresh, saved)
    saved = fresh
    if (remoteChanged && !isDirty()) {
      draft = { ...saved }
      syncControls(el)
      schedulePreview(el, true)
    }
    refreshBar(el)
    return
  }
  saved = fresh
  draft = { ...saved }
  build(el)
}

/* ---------------- markup ---------------- */

const themeChip = (id, active) => {
  const t = INVITE_THEMES[id]
  return `<button class="ics-theme ${active ? 'active' : ''}" data-invb-theme="${id}" title="${t.name}">
      <span class="ics-sw" style="background:${t.ground}"><i style="background:${t.names}"></i><i style="background:${t.accent}"></i><i style="background:${t.gold}"></i></span>
      <span class="ics-name">${t.nameAr}</span>
    </button>`
}

function faceCard(id, f, names, active) {
  const style = f.css
    ? `font-family:${escapeAttr(f.css)}, 'Lateef', serif; font-size:${Math.round(24 * (f.scale || 1))}px; font-weight:${f.weight || 400};`
    : 'font-family: var(--font-khatt); font-size: 24px;'
  return `<button class="invb-face ${active ? 'active' : ''}" data-invb-face="${id}">
      <span class="invb-face-sample" style="${style}">${escapeHtml(names)}</span>
      <span class="invb-face-name">${f.label}</span>
      <span class="invb-face-tag">${f.tag}</span>
    </button>`
}

const facesMarkup = () => {
  const r = resolveInvite(draft)
  const names = `${r.groomFirst} ${COUPLE.join} ${r.brideFirst}`
  const all = [
    ['', { label: 'حسب الثيم', tag: 'الخط الافتراضي لكل ثيم', css: '', scale: 1 }],
    ...Object.entries(NAME_FACES),
  ]
  return all.map(([id, f]) => faceCard(id, f, names, String(draft.inviteNameFace || '') === id)).join('')
}

const fieldMarkup = ([k, label, ph, dir]) => `
  <div class="invb-field">
    <label class="invb-l" for="invb-${k}">${escapeHtml(label)}</label>
    <input class="field" id="invb-${k}" data-invb-k="${k}" dir="${dir}" ${k === 'sealGlyph' ? 'maxlength="4"' : ''} value="${escapeAttr(draft[k] || '')}" placeholder="${escapeAttr(ph)}">
  </div>`

function build(el) {
  const f = Object.fromEntries(FIELDS.map((x) => [x[0], fieldMarkup(x)]))
  el.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div class="ch-text">
          <h2>Invitation</h2>
          <p class="hint">Designs every guest's بطاقة دخول — the pass page they open, the QR in the guest list, and the WhatsApp card you share.</p>
        </div>
        <div class="ch-actions">
          <span class="invb-status" id="invbStatus"></span>
          <button class="btn ghost sm" id="invbRevert">Revert</button>
          <button class="btn sm" id="invbApply">Apply to guests</button>
        </div>
      </div>
      <div class="invb-grid">
        <div class="invb-controls">
          <h3 class="invb-h">Theme</h3>
          <div class="ics-themes" id="invbThemes">${Object.keys(INVITE_THEMES).map((id) => themeChip(id, draft.inviteTheme === id)).join('')}</div>
          <h3 class="invb-h">Typography · خط الأسماء</h3>
          <div class="invb-faces" id="invbFaces">${facesMarkup()}</div>
          <h3 class="invb-h">Names size · حجم الأسماء</h3>
          <div class="invb-slider">
            <input type="range" id="invbScale" min="0.7" max="1.4" step="0.05" value="1" aria-label="Names size">
            <span id="invbScaleVal">100%</span>
            <button class="btn ghost sm" id="invbKashida" title="Toggle the stretched kashida in the names">Kashida ـــ</button>
          </div>
          <h3 class="invb-h">Text · النصوص</h3>
          <div class="invb-fields">
            <div class="invb-pair">${f.groomFirstAr}${f.brideFirstAr}</div>
            <div class="invb-pair">${f.groomFamilyAr}${f.brideFamilyAr}</div>
            <div class="invb-pair">${f.eyebrowText}${f.sealGlyph}</div>
            <div class="invb-pair">${f.honoraryLabel}${f.venueAr}</div>
            <div class="invb-pair invb-times">${f.timeReception}${f.timeZaffa}${f.timeDinner}</div>
            ${f.hijriDateAr}
            ${f.footerText}
          </div>
          <div class="invb-foot">
            <button class="btn ghost sm" id="invbReset" title="Back to the designed defaults; venue and times stay">Reset design</button>
          </div>
        </div>
        <div class="invb-preview">
          <div class="invb-states" id="invbStates" role="tablist" aria-label="Preview state">
            <button data-invb-state="valid" class="active">سارية</button>
            <button data-invb-state="redeemed">مستخدمة</button>
            <button data-invb-state="invalid">غير صالحة</button>
            <button data-invb-state="whatsapp">واتساب 4:5</button>
          </div>
          <div id="invbCard"></div>
          <div class="invb-preview-foot">
            <button class="btn ghost sm" id="invbDownload">Download card image</button>
          </div>
        </div>
      </div>
    </div>`
  el.dataset.built = '1'
  wire(el)
  syncControls(el)
  refreshBar(el)
  renderPreview(el)
}

/* ---------------- behaviour ---------------- */

function refreshBar(el) {
  const status = el.querySelector('#invbStatus')
  const apply = el.querySelector('#invbApply')
  const revert = el.querySelector('#invbRevert')
  if (!status || !apply || !revert) return
  const d = isDirty()
  apply.disabled = !d || applying
  revert.disabled = !d || applying
  if (applying) {
    status.textContent = 'applying…'
    status.className = 'invb-status'
  } else if (d) {
    status.textContent = 'draft — not applied'
    status.className = 'invb-status dirty'
  } else {
    status.textContent = 'saved ✓'
    status.className = 'invb-status ok'
  }
}

let exportSeq = 0

// The exact 1080x1350 PNG a guest receives on WhatsApp, rendered live.
async function renderWhatsappPreview(el, mount) {
  const seq = ++exportSeq
  if (!mount.querySelector('img')) {
    mount.innerHTML = '<div class="invb-export-pending">rendering the WhatsApp card…</div>'
  }
  try {
    const mod = await import('./invite-export.js')
    const canvas = await mod.drawInviteCanvas({
      theme: draft.inviteTheme,
      settings: draft,
      wedDate: store.data.wedDate || WED_DEFAULT,
      guestName: 'اسم الضيف',
      tokenUrl: passLink(),
    })
    if (seq !== exportSeq || previewState !== 'whatsapp') return
    const img = new Image()
    img.className = 'invb-export-img'
    img.alt = 'WhatsApp invitation card preview'
    img.src = canvas.toDataURL('image/png')
    mount.replaceChildren(img)
  } catch (_) {
    if (seq === exportSeq && previewState === 'whatsapp')
      mount.innerHTML = '<div class="invb-export-pending">could not render the card</div>'
  }
}

function renderPreview(el) {
  const mount = el.querySelector('#invbCard')
  if (!mount) return
  if (previewState === 'whatsapp') {
    renderWhatsappPreview(el, mount)
    return
  }
  const theme = INVITE_THEMES[draft.inviteTheme] ? draft.inviteTheme : 'sage'
  const card = buildInviteCard({
    theme,
    settings: draft,
    wedDate: store.data.wedDate || WED_DEFAULT,
    guestName: 'اسم الضيف',
    status: previewState,
    redeemedAt: `${store.data.wedDate || WED_DEFAULT} 21:30:00`,
  })
  if (previewState === 'valid' || previewState === 'redeemed') {
    const t = INVITE_THEMES[theme]
    const rv = resolveInvite(draft)
    card.querySelector('.ic-qr')?.replaceChildren(
      qrArtCanvas(passLink(), {
        size: 240,
        ...t.qr,
        medallion: previewState === 'redeemed' ? 'check' : 'waw',
        medallionGlyph: rv.sealGlyph,
        medallionFont: rv.sealFont,
      }),
    )
  }
  mount.replaceChildren(card)
  el.querySelector('#invbKashida')?.classList.toggle('on', /ـ/.test(resolveInvite(draft).groomFirst))
}

function schedulePreview(el, immediate = false) {
  clearTimeout(previewTimer)
  previewTimer = setTimeout(() => renderPreview(el), immediate ? 0 : 150)
}

function syncControls(el) {
  el.querySelectorAll('[data-invb-theme]').forEach((b) =>
    b.classList.toggle('active', b.dataset.invbTheme === draft.inviteTheme),
  )
  const faces = el.querySelector('#invbFaces')
  if (faces) faces.innerHTML = facesMarkup()
  wireFaces(el)
  const scale = el.querySelector('#invbScale')
  if (scale && document.activeElement !== scale) {
    scale.value = String(Math.min(1.4, Math.max(0.7, parseFloat(draft.inviteNameScale) || 1)))
  }
  const val = el.querySelector('#invbScaleVal')
  if (val) val.textContent = `${Math.round((parseFloat(draft.inviteNameScale) || 1) * 100)}%`
  el.querySelectorAll('[data-invb-k]').forEach((inp) => {
    if (document.activeElement !== inp) inp.value = draft[inp.dataset.invbK] || ''
  })
}

function wireFaces(el) {
  el.querySelectorAll('[data-invb-face]').forEach((b) =>
    b.addEventListener('click', () => {
      draft.inviteNameFace = b.dataset.invbFace
      el.querySelectorAll('.invb-face').forEach((x) => x.classList.toggle('active', x === b))
      refreshBar(el)
      schedulePreview(el, true)
    }),
  )
}

function wire(el) {
  el.querySelector('#invbThemes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-invb-theme]')
    if (!b) return
    draft.inviteTheme = b.dataset.invbTheme
    el.querySelectorAll('[data-invb-theme]').forEach((x) => x.classList.toggle('active', x === b))
    refreshBar(el)
    schedulePreview(el, true)
  })

  wireFaces(el)

  el.querySelector('#invbScale').addEventListener('input', (e) => {
    draft.inviteNameScale = e.target.value
    el.querySelector('#invbScaleVal').textContent = `${Math.round(parseFloat(e.target.value) * 100)}%`
    refreshBar(el)
    schedulePreview(el)
  })

  el.querySelector('#invbKashida').addEventListener('click', () => {
    const on = /ـ/.test(resolveInvite(draft).groomFirst)
    for (const [key, [resolved, designed]] of Object.entries(NAME_FIELD_MAP)) {
      const cur = resolveInvite(draft)[resolved]
      if (on) draft[key] = stripKashida(cur)
      else draft[key] = stripKashida(cur) === stripKashida(designed) ? designed : cur
    }
    syncControls(el)
    refreshBar(el)
    schedulePreview(el, true)
  })

  el.querySelectorAll('[data-invb-k]').forEach((inp) =>
    inp.addEventListener('input', () => {
      draft[inp.dataset.invbK] = inp.value
      if (inp.dataset.invbK in NAME_FIELD_MAP) {
        const faces = el.querySelector('#invbFaces')
        if (faces) {
          faces.innerHTML = facesMarkup()
          wireFaces(el)
        }
      }
      refreshBar(el)
      schedulePreview(el)
    }),
  )

  el.querySelector('#invbStates').addEventListener('click', (e) => {
    const b = e.target.closest('[data-invb-state]')
    if (!b) return
    previewState = b.dataset.invbState
    el.querySelectorAll('[data-invb-state]').forEach((x) => x.classList.toggle('active', x === b))
    renderPreview(el)
  })

  el.querySelector('#invbRevert').addEventListener('click', () => {
    draft = { ...saved }
    syncControls(el)
    refreshBar(el)
    schedulePreview(el, true)
  })

  el.querySelector('#invbReset').addEventListener('click', () => {
    for (const k of DESIGN_KEYS) draft[k] = DEFAULT_INVITE[k]
    syncControls(el)
    refreshBar(el)
    schedulePreview(el, true)
  })

  el.querySelector('#invbApply').addEventListener('click', () => apply(el))

  el.querySelector('#invbDownload').addEventListener('click', async (e) => {
    const btn = e.currentTarget
    btn.disabled = true
    try {
      const mod = await import('./invite-export.js')
      const canvas = await mod.drawInviteCanvas({
        theme: draft.inviteTheme,
        settings: draft,
        wedDate: store.data.wedDate || WED_DEFAULT,
        guestName: 'اسم الضيف',
        tokenUrl: passLink(),
      })
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `invitation-${draft.inviteTheme}.png`
      a.click()
    } catch (_) {
      toast({ type: 'err', message: 'Could not render the card image' })
    } finally {
      btn.disabled = false
    }
  })

  // Warm the export path so the first download does not stall on fonts.
  import('./invite-export.js').then((m) => m.prewarm(draft.inviteTheme, draft)).catch(() => {})
}

async function apply(el) {
  if (!isDirty() || applying) return
  applying = true
  refreshBar(el)
  const changed = Object.keys(DEFAULT_INVITE).filter(
    (k) => String(draft[k] ?? '') !== String(saved[k] ?? ''),
  )
  try {
    for (const k of changed) {
      bumpRev(await api.setting(k, String(draft[k] ?? '')))
    }
    saved = { ...draft }
    store.data.inviteCard = { ...draft }
    toast({ type: 'ok', message: 'Invitation updated for every guest' })
  } catch (_) {
    toast({ type: 'err', message: 'Could not save every change; it will retry on the next edit' })
  } finally {
    applying = false
    refreshBar(el)
  }
}
