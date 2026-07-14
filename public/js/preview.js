// The invitation builder. Everything on this page is a local draft; nothing
// touches the live invitations until "Apply", which needs a planner session.
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
import { drawInviteCanvas } from './invite-export.js'

const SAMPLE_URL = `${location.origin}/pass.html?token=0123456789abcdef0123456789abcdef`
const STATES = [
  ['valid', 'Valid'],
  ['redeemed', 'Checked in'],
  ['invalid', 'Invalid'],
  ['offline', 'Offline'],
  ['loading', 'Loading'],
]
// Design keys reset by "Reset design"; content keys (venue, times…) survive it.
const DESIGN_KEYS = ['inviteNameFace', 'inviteNameScale', 'groomFirstAr', 'groomFamilyAr', 'brideFirstAr', 'brideFamilyAr', 'eyebrowText', 'footerText', 'sealGlyph']

let saved = { ...DEFAULT_INVITE }
let draft = { ...DEFAULT_INVITE }
let wedDate = '2026-08-21'
let signedIn = false
let gridTimer = 0
let exportSeq = 0

const $ = (id) => document.getElementById(id)
const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m])
const dirty = () => Object.keys(DEFAULT_INVITE).some((k) => String(draft[k] ?? '') !== String(saved[k] ?? ''))
const stripKashida = (s) => String(s || '').replace(/ـ/g, '')

function setStatus(text, cls = '') {
  const el = $('pvStatus')
  el.textContent = text
  el.className = `pv-status ${cls}`
}

function refreshSaveBar() {
  const d = dirty()
  $('pvApply').disabled = !d || !signedIn
  $('pvRevert').disabled = !d
  if (!signedIn) setStatus('viewing only · sign in to the planner in this browser to apply', 'err')
  else if (d) setStatus('draft · not applied yet', 'dirty')
  else setStatus('matches the live invitations', 'ok')
}

function sampleNames() {
  const r = resolveInvite(draft)
  return `${r.groomFirst} ${COUPLE.join} ${r.brideFirst}`
}

/* ---------------- controls ---------------- */

function renderThemes() {
  $('pvThemes').innerHTML = Object.entries(INVITE_THEMES)
    .map(
      ([id, t]) => `<button class="ics-theme ${draft.inviteTheme === id ? 'active' : ''}" data-theme="${id}">
        <span class="ics-sw" style="background:${t.ground}"><i style="background:${t.names}"></i><i style="background:${t.accent}"></i><i style="background:${t.gold}"></i></span>
        <span class="ics-name">${t.nameAr}</span>
      </button>`,
    )
    .join('')
  $('pvThemes').querySelectorAll('[data-theme]').forEach((b) =>
    b.addEventListener('click', () => {
      draft.inviteTheme = b.dataset.theme
      renderThemes()
      onDraftChange(true)
    }),
  )
}

function renderFaces() {
  const names = sampleNames()
  const options = [['', { label: 'حسب الثيم', tag: 'الخط الافتراضي لكل ثيم', css: '', scale: 1 }], ...Object.entries(NAME_FACES)]
  $('pvFaces').innerHTML = options
    .map(([id, f]) => {
      const style = f.css
        ? `font-family:${esc(f.css)}, 'Lateef', serif; font-size:${Math.round(26 * (f.scale || 1))}px; font-weight:${f.weight || 400};`
        : `font-family: var(--font-khatt); font-size: 26px;`
      return `<button class="pv-face ${String(draft.inviteNameFace) === id ? 'active' : ''}" data-face="${id}">
          <span class="pv-face-sample" style="${style}">${esc(names)}</span>
          <span class="pv-face-name">${f.label}</span>
          <span class="pv-face-tag">${f.tag}</span>
        </button>`
    })
    .join('')
  $('pvFaces').querySelectorAll('[data-face]').forEach((b) =>
    b.addEventListener('click', () => {
      draft.inviteNameFace = b.dataset.face
      $('pvFaces').querySelectorAll('.pv-face').forEach((x) => x.classList.toggle('active', x === b))
      onDraftChange(true)
    }),
  )
}

const FIELDS = [
  ['groomFirstAr', 'Groom first name', COUPLE.groomFirst, 'rtl'],
  ['brideFirstAr', 'Bride first name', COUPLE.brideFirst, 'rtl'],
  ['groomFamilyAr', 'Groom family', COUPLE.groomFamily, 'rtl'],
  ['brideFamilyAr', 'Bride family', COUPLE.brideFamily, 'rtl'],
  ['eyebrowText', 'Header line', STR.eyebrow, 'rtl'],
  ['sealGlyph', 'Seal glyph (max 4)', 'و', 'rtl'],
  ['honoraryLabel', 'Guest line label', 'المكرمة', 'rtl'],
  ['venueAr', 'Venue', 'قاعة …', 'rtl'],
  ['hijriDateAr', 'Hijri date (empty = auto)', 'auto', 'rtl'],
  ['timeReception', 'الاستقبال', '9:30', 'ltr'],
  ['timeZaffa', 'الزفة', '11:30', 'ltr'],
  ['timeDinner', 'العشاء', '12:30', 'ltr'],
  ['footerText', 'Footer line', STR.footer, 'rtl'],
]

function renderFields() {
  const pair = (a, b) => `<div class="pv-pair"><div>${a}</div><div>${b}</div></div>`
  const one = ([k, label, ph, dir]) => `
    <label for="pv-${k}">${esc(label)}</label>
    <input class="field" id="pv-${k}" data-k="${k}" dir="${dir}" ${k === 'sealGlyph' ? 'maxlength="4"' : ''} value="${esc(draft[k] || '')}" placeholder="${esc(ph)}">`
  const f = Object.fromEntries(FIELDS.map((x) => [x[0], one(x)]))
  $('pvFields').innerHTML = [
    pair(f.groomFirstAr, f.brideFirstAr),
    pair(f.groomFamilyAr, f.brideFamilyAr),
    pair(f.eyebrowText, f.sealGlyph),
    pair(f.honoraryLabel, f.venueAr),
    f.hijriDateAr,
    `<div class="pv-pair"><div>${f.timeReception}</div><div>${f.timeZaffa}</div><div>${f.timeDinner}</div></div>`,
    f.footerText,
  ].join('')
  $('pvFields').querySelectorAll('input').forEach((inp) =>
    inp.addEventListener('input', () => {
      draft[inp.dataset.k] = inp.value
      if (['groomFirstAr', 'brideFirstAr', 'groomFamilyAr', 'brideFamilyAr'].includes(inp.dataset.k)) renderFaces()
      onDraftChange()
    }),
  )
}

function wireStatic() {
  $('pvScale').addEventListener('input', () => {
    draft.inviteNameScale = $('pvScale').value
    $('pvScaleVal').textContent = `${Math.round(parseFloat($('pvScale').value) * 100)}%`
    onDraftChange()
  })

  $('pvKashida').addEventListener('click', () => {
    const on = /ـ/.test(resolveInvite(draft).groomFirst)
    const designed = { groomFirstAr: COUPLE.groomFirst, brideFirstAr: COUPLE.brideFirst, groomFamilyAr: COUPLE.groomFamily, brideFamilyAr: COUPLE.brideFamily }
    for (const [k, dz] of Object.entries(designed)) {
      const cur = resolveInvite(draft)[{ groomFirstAr: 'groomFirst', brideFirstAr: 'brideFirst', groomFamilyAr: 'groomFamily', brideFamilyAr: 'brideFamily' }[k]]
      if (on) draft[k] = stripKashida(cur)
      else draft[k] = stripKashida(cur) === stripKashida(dz) ? dz : cur
    }
    renderFields()
    renderFaces()
    onDraftChange()
  })

  $('pvApply').addEventListener('click', apply)
  $('pvRevert').addEventListener('click', () => {
    draft = { ...saved }
    syncControls()
    onDraftChange(true)
  })
  $('pvReset').addEventListener('click', () => {
    for (const k of DESIGN_KEYS) draft[k] = DEFAULT_INVITE[k]
    syncControls()
    onDraftChange(true)
  })
}

function syncControls() {
  renderThemes()
  renderFaces()
  renderFields()
  $('pvScale').value = String(Math.min(1.4, Math.max(0.7, parseFloat(draft.inviteNameScale) || 1)))
  $('pvScaleVal').textContent = `${Math.round(parseFloat($('pvScale').value) * 100)}%`
  $('pvKashida').classList.toggle('on', /ـ/.test(resolveInvite(draft).groomFirst))
}

/* ---------------- stage ---------------- */

function cardFor(theme, status) {
  const card = buildInviteCard({
    theme,
    settings: draft,
    wedDate,
    guestName: 'اسم الضيف',
    status,
    redeemedAt: `${wedDate} 21:30:00`,
  })
  if (status === 'valid' || status === 'redeemed') {
    const t = INVITE_THEMES[theme]
    const rv = resolveInvite(draft)
    card.querySelector('.ic-qr')?.replaceChildren(
      qrArtCanvas(SAMPLE_URL, {
        size: 240,
        ...t.qr,
        medallion: status === 'redeemed' ? 'check' : 'waw',
        medallionGlyph: rv.sealGlyph,
        medallionFont: rv.sealFont,
      }),
    )
  }
  return card
}

function renderHero() {
  const theme = INVITE_THEMES[draft.inviteTheme] ? draft.inviteTheme : 'sage'
  $('pvHero').replaceChildren(cardFor(theme, 'valid'))
  $('pvKashida').classList.toggle('on', /ـ/.test(resolveInvite(draft).groomFirst))
}

function renderGridShells() {
  $('pvGrids').innerHTML = Object.entries(INVITE_THEMES)
    .map(
      ([id, t]) => `<section class="pv-theme-section" id="pv-theme-${id}">
        <div class="pv-theme-head"><h2>${t.name}</h2><span class="ar">${t.nameAr}</span></div>
        <div class="pv-row">
          <div class="pv-cell"><h4>WhatsApp export · 4:5</h4><div class="pv-export" data-export="${id}"><div class="pv-export-pending">rendering…</div></div></div>
          ${STATES.map(([st, label]) => `<div class="pv-cell"><h4>${label}</h4><div data-card="${id}-${st}"></div></div>`).join('')}
        </div>
      </section>`,
    )
    .join('')
}

function renderStateCards() {
  for (const id of Object.keys(INVITE_THEMES)) {
    for (const [st] of STATES) {
      document.querySelector(`[data-card="${id}-${st}"]`)?.replaceChildren(cardFor(id, st))
    }
  }
}

async function renderExports() {
  const seq = ++exportSeq
  for (const id of Object.keys(INVITE_THEMES)) {
    if (seq !== exportSeq) return
    try {
      const canvas = await drawInviteCanvas({
        theme: id,
        settings: { ...draft, inviteTheme: id },
        wedDate,
        guestName: 'اسم الضيف',
        tokenUrl: SAMPLE_URL,
      })
      if (seq !== exportSeq) return
      const img = new Image()
      img.src = canvas.toDataURL('image/png')
      document.querySelector(`[data-export="${id}"]`)?.replaceChildren(img)
    } catch (_) {
      /* keep the pending shell */
    }
  }
}

function onDraftChange(immediateGrids = false) {
  refreshSaveBar()
  renderHero()
  clearTimeout(gridTimer)
  gridTimer = setTimeout(
    () => {
      renderStateCards()
      renderExports()
    },
    immediateGrids ? 0 : 650,
  )
}

/* ---------------- persistence ---------------- */

async function apply() {
  const btn = $('pvApply')
  btn.disabled = true
  setStatus('applying…')
  const changed = Object.keys(DEFAULT_INVITE).filter((k) => String(draft[k] ?? '') !== String(saved[k] ?? ''))
  try {
    for (const k of changed) {
      const r = await fetch('api/index.php?action=setting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ k, v: String(draft[k] ?? '') }),
      }).then((x) => x.json())
      if (r && r.error) throw new Error(r.error)
    }
    saved = { ...draft }
    refreshSaveBar()
    setStatus('applied · live for every guest', 'ok')
  } catch (e) {
    setStatus(`could not apply (${e && e.message ? e.message : 'error'})`, 'err')
    refreshSaveBar()
  }
}

async function boot() {
  try {
    const r = await fetch('api/index.php?action=invite_card').then((x) => x.json())
    if (r && r.invite) {
      saved = { ...DEFAULT_INVITE, ...r.invite }
      draft = { ...saved }
      wedDate = r.wedDate || wedDate
    }
  } catch (_) {
    /* defaults stand */
  }
  try {
    const me = await fetch('api/index.php?action=me').then((x) => x.json())
    signedIn = !!(me && me.me)
  } catch (_) {
    signedIn = false
  }
  wireStatic()
  syncControls()
  renderGridShells()
  refreshSaveBar()
  renderHero()
  renderStateCards()
  renderExports()
}

boot()
