// The بطاقة دخول invitation card: one shared skeleton, four themes.
// Used by the public pass page, the couple-side preview, and the PNG compositor.

// Kashida is designed, not sprayed: fixed strings with a single tatweel placed
// between dual-joining pairs. Guest names never get kashida (arbitrary input).
export const COUPLE = {
  groomFirst: 'أسـامة',
  groomFamily: 'الجمـل',
  brideFirst: 'نـور',
  brideFamily: 'القـروص',
  join: 'و',
  latin: 'OSAMA & NOOR',
  dateLatin: '21 . 08 . 2026',
}

export const STR = {
  eyebrow: 'بطاقة دخول',
  reception: 'الاستقبال',
  zaffa: 'الزفة',
  dinner: 'العشاء',
  footer: 'الدعوة شخصية · الدخول برمز QR فقط',
  validT: 'الدعوة سارية',
  validS: 'تُبرز عند المدخل وتُستخدم مرة واحدة',
  usedT: 'تم الدخول',
  usedS: 'تم استخدام هذه الدعوة عند المدخل',
  invalidT: 'الرمز غير صالح',
  invalidS: 'تأكدوا من فتح الرابط المرسل لكم كما هو',
  offlineT: 'تعذر الاتصال',
  offlineS: 'تحققوا من اتصالكم بالإنترنت ثم أعيدوا المحاولة',
  retry: 'إعادة المحاولة',
  save: 'حفظ الدعوة',
}

// Theme tokens. Accents are for hairlines and ornament only, never small text;
// labels always hold AA on their ground. QR inks clear 7:1 on their panel.
export const INVITE_THEMES = {
  sage: {
    name: 'Sage Watercolor',
    nameAr: 'حديقة',
    ground: '#f7f2e9',
    names: '#565b44',
    family: '#494d3a',
    body: '#5f644d',
    label: '#494d3a',
    muted: '#8b8f78',
    hairline: '#d8d3c2',
    accent: '#7d8663',
    gold: '#b89a5e',
    dark: false,
    face: "'Scheherazade New'",
    nameWeight: 400,
    art: 'images/invite-sage-br.png',
    qr: { ink: '#33372a', pupil: '#454936', gold: '#d6cfa2', panel: null },
  },
  arch: {
    name: 'Rose Arch',
    nameAr: 'قصر',
    ground: '#f2e3e1',
    names: '#5c2028',
    family: '#7a3a42',
    body: '#64323a',
    label: '#7e2f39',
    muted: '#9a6b70',
    hairline: '#ddc3c1',
    accent: '#7e2f39',
    gold: '#b89a5e',
    dark: false,
    face: "'Amiri'",
    nameWeight: 400,
    art: 'images/invite-rose-br.png',
    qr: { ink: '#401419', pupil: '#5c2028', gold: '#e8c9b8', panel: '#f7efe8' },
  },
  badr: {
    name: 'Laylat AlBadr',
    nameAr: 'ليلة البدر',
    ground: '#0b1019',
    names: '#e6c67a',
    family: '#d7c493',
    body: '#cfc6b2',
    label: '#d7c493',
    muted: '#948e7c',
    hairline: 'rgba(201,162,75,.35)',
    accent: '#d4af37',
    gold: '#c9a24b',
    dark: true,
    face: "'El Messiri'",
    nameWeight: 500,
    art: null,
    qr: { ink: '#2e3b42', pupil: '#43330f', gold: '#d4af37', panel: '#f3ead8', panelRing: '#c9a24b' },
  },
  dana: {
    name: 'Dana',
    nameAr: 'دانة',
    ground: '#f7f4ee',
    names: '#2a3440',
    family: '#45505c',
    body: '#3d4854',
    label: '#45505c',
    muted: '#78828c',
    hairline: '#d9d2c2',
    accent: '#a98c52',
    gold: '#a98c52',
    dark: false,
    face: "'Lateef'",
    nameWeight: 300,
    art: null,
    qr: { ink: '#2e3b42', pupil: '#1d2530', gold: '#c9b06c', panel: '#f7efe8' },
  },
}

export const DEFAULT_INVITE = {
  inviteTheme: 'sage',
  venueAr: '',
  hijriDateAr: '',
  timeReception: '9:30',
  timeZaffa: '11:30',
  timeDinner: '12:30',
  honoraryLabel: 'المكرمة',
  inviteNameFace: '',
  inviteNameScale: '1',
  groomFirstAr: '',
  groomFamilyAr: '',
  brideFirstAr: '',
  brideFamilyAr: '',
  eyebrowText: '',
  footerText: '',
  sealGlyph: '',
}

// The builder's typography gallery: 16 Arabic display faces across the great
// script families. `scale` normalizes optical size (display faces differ wildly
// at the same px); `lh` overrides line-height for deep nastaliq swashes.
export const NAME_FACES = {
  amiri: { label: 'أميري', tag: 'نسخ كلاسيكي', css: "'Amiri'", weight: 400, scale: 1 },
  quran: { label: 'أميري قرآني', tag: 'مصحفي', css: "'Amiri Quran'", weight: 400, scale: 0.95, lh: 1.6 },
  scheherazade: { label: 'شهرزاد', tag: 'نسخ تقليدي', css: "'Scheherazade New'", weight: 400, scale: 1 },
  lateef: { label: 'لطيف', tag: 'نسخ ممدود رفيع', css: "'Lateef'", weight: 300, scale: 1.05 },
  harmattan: { label: 'هرمتان', tag: 'نسخ هادئ', css: "'Harmattan'", weight: 500, scale: 0.95 },
  aref: { label: 'عارف رقعة', tag: 'رقعة احتفالية', css: "'Aref Ruqaa'", weight: 400, scale: 0.9, lh: 1.6 },
  rakkas: { label: 'رقّاص', tag: 'رقعة استعراضية', css: "'Rakkas'", weight: 400, scale: 0.95, lh: 1.5 },
  katibeh: { label: 'كاتبة', tag: 'عناوين كلاسيكية', css: "'Katibeh'", weight: 400, scale: 1, lh: 1.5 },
  jomhuria: { label: 'جمهورية', tag: 'عنوان ثقيل', css: "'Jomhuria'", weight: 400, scale: 0.85, lh: 1.5 },
  reemkufi: { label: 'ريم كوفي', tag: 'كوفي هندسي', css: "'Reem Kufi'", weight: 500, scale: 0.88 },
  qahiri: { label: 'قاهري', tag: 'كوفي خطي', css: "'Qahiri'", weight: 400, scale: 0.9 },
  nastaliq: { label: 'نوتو نستعليق', tag: 'نستعليق انسيابي', css: "'Noto Nastaliq Urdu'", weight: 400, scale: 0.78, lh: 2 },
  gulzar: { label: 'كلزار', tag: 'نستعليق مزخرف', css: "'Gulzar'", weight: 400, scale: 0.8, lh: 2 },
  mirza: { label: 'ميرزا', tag: 'نستعليق معاصر', css: "'Mirza'", weight: 500, scale: 0.95, lh: 1.6 },
  messiri: { label: 'المسيري', tag: 'خط عصري', css: "'El Messiri'", weight: 500, scale: 0.9 },
  vibes: { label: 'فايبز', tag: 'زخرفي', css: "'Vibes'", weight: 400, scale: 1.1 },
}

// One resolver used by the DOM card, the canvas compositor, and the QR seal, so
// every surface renders the identical configuration. Empty fields always fall
// back to the designed defaults; the card can never go blank.
export function resolveInvite(settings) {
  const s = { ...DEFAULT_INVITE, ...settings }
  const face = NAME_FACES[s.inviteNameFace] || null
  const scale = Math.min(1.4, Math.max(0.7, parseFloat(s.inviteNameScale) || 1))
  const txt = (v, d) => (String(v ?? '').trim() ? String(v).trim() : d)
  return {
    s,
    face,
    scale,
    groomFirst: txt(s.groomFirstAr, COUPLE.groomFirst),
    groomFamily: txt(s.groomFamilyAr, COUPLE.groomFamily),
    brideFirst: txt(s.brideFirstAr, COUPLE.brideFirst),
    brideFamily: txt(s.brideFamilyAr, COUPLE.brideFamily),
    eyebrow: txt(s.eyebrowText, STR.eyebrow),
    footer: txt(s.footerText, STR.footer),
    sealGlyph: txt(s.sealGlyph, 'و').slice(0, 4),
    honorary: txt(s.honoraryLabel, 'المكرمة'),
    sealFont: face ? face.css : "'Lateef'",
  }
}

// Deterministic star field for Laylat AlBadr: identical in DOM and canvas,
// none inside the central text column. [x%, y%, radius px, opacity]
export const STARS = [
  [4, 4, 1.5, 0.4], [11, 9, 1, 0.25], [7, 16, 1, 0.32], [16, 3, 1, 0.2],
  [22, 7, 1.5, 0.35], [3, 26, 1, 0.28], [9, 33, 1, 0.2], [15, 24, 1, 0.3],
  [5, 44, 1.5, 0.26], [12, 52, 1, 0.2], [7, 61, 1, 0.3], [14, 70, 1, 0.22],
  [4, 78, 1, 0.28], [10, 86, 1.5, 0.3], [17, 92, 1, 0.2], [6, 94, 1, 0.26],
  [84, 5, 1.5, 0.42], [90, 11, 1, 0.26], [96, 6, 1, 0.34], [79, 9, 1, 0.2],
  [93, 18, 1.5, 0.3], [86, 24, 1, 0.24], [97, 28, 1, 0.3], [82, 33, 1, 0.2],
  [95, 41, 1.5, 0.28], [88, 49, 1, 0.2], [93, 58, 1, 0.3], [85, 66, 1, 0.24],
  [96, 72, 1, 0.28], [90, 80, 1.5, 0.3], [83, 88, 1, 0.2], [95, 93, 1, 0.26],
  [26, 4, 1, 0.22], [33, 8, 1, 0.28], [68, 5, 1, 0.24], [74, 10, 1, 0.3],
  [41, 3, 1, 0.2], [59, 4, 1, 0.26], [24, 93, 1, 0.2], [33, 96, 1, 0.24],
  [67, 95, 1, 0.26], [76, 91, 1, 0.2], [50, 97, 1, 0.22], [58, 93, 1, 0.2],
]

export function hijriLabel(dateStr, override) {
  if (override) return override
  try {
    let s = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${dateStr}T12:00:00`))
    if (!/هـ/.test(s)) s += ' هـ'
    return s
  } catch (_) {
    return ''
  }
}

export function gregorianLabel(dateStr) {
  const [y, m, d] = String(dateStr || '').split('-').map(Number)
  return y ? `${y} . ${m} . ${d}` : ''
}

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m],
  )

const KHATAM_TILE = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g fill="none" stroke="#c9a24b" stroke-width="1"><rect x="12" y="12" width="24" height="24"/><rect x="12" y="12" width="24" height="24" transform="rotate(45 24 24)"/></g></svg>`,
)

const seal = (glyph = 'و') => `
  <div class="ic-seal">
    <span class="ic-seal-disc"></span>
    <span class="ic-seal-waw">${esc(glyph)}</span>
  </div>`

const dividers = {
  sage: '<div class="ic-divider"><span class="ic-rule"></span></div>',
  arch: `
    <div class="ic-divider ic-icons">
      <span class="ic-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16M9 3v5M15 3v5"/></svg></span>
      <span class="ic-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg></span>
      <span class="ic-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2.2"/></svg></span>
    </div>`,
  badr: '<div class="ic-divider"><span class="ic-rule"></span><span class="ic-star8"></span><span class="ic-rule"></span></div>',
  dana: `
    <div class="ic-divider"><svg class="ic-wave" viewBox="0 0 96 8" fill="none"><path d="M0 4 C6 0.5, 12 0.5, 18 4 S30 7.5, 36 4 S48 0.5, 54 4 S66 7.5, 72 4 S84 0.5, 90 4 L96 4" stroke="currentColor" stroke-width="1"/></svg></div>`,
}

const badrOrnaments = () => `
  <div class="ic-stars">${STARS.map(([x, y, r, o]) => `<i style="left:${x}%;top:${y}%;width:${r * 2}px;height:${r * 2}px;opacity:${o}"></i>`).join('')}</div>
  <div class="ic-lattice ic-lattice-t" style="background-image:url('data:image/svg+xml,${KHATAM_TILE}')"></div>
  <div class="ic-lattice ic-lattice-b" style="background-image:url('data:image/svg+xml,${KHATAM_TILE}')"></div>
  <svg class="ic-ogee" viewBox="0 0 240 180" fill="none" preserveAspectRatio="xMidYMin meet">
    <path d="M10 178 L10 118 C10 64 62 52 120 8 C178 52 230 64 230 118 L230 178" stroke="currentColor" stroke-width="1.5"/>
  </svg>`

function stateBand(status, redeemedAt) {
  if (status === 'valid')
    return `<div class="ic-state ok"><div class="ic-state-t">${STR.validT}</div><div class="ic-state-s">${STR.validS}</div></div>`
  if (status === 'redeemed') {
    let when = ''
    if (redeemedAt) {
      try {
        when = new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(redeemedAt.replace(' ', 'T')))
      } catch (_) { /* keep empty */ }
    }
    return `<div class="ic-state used"><div class="ic-state-t">${STR.usedT}</div><div class="ic-state-s">${STR.usedS}${when ? ` · ${esc(when)}` : ''}</div></div>`
  }
  if (status === 'invalid')
    return `<div class="ic-state bad"><div class="ic-state-t">${STR.invalidT}</div><div class="ic-state-s">${STR.invalidS}</div></div>`
  if (status === 'offline')
    return `<div class="ic-state bad"><div class="ic-state-t">${STR.offlineT}</div><div class="ic-state-s">${STR.offlineS}</div><button class="ic-retry" data-retry>${STR.retry}</button></div>`
  return ''
}

// Builds the card DOM. The caller appends the QR canvas into `.ic-qr` and, on
// the live page, wires [data-retry]. `settings` follows DEFAULT_INVITE keys.
export function buildInviteCard({ theme = 'sage', settings = {}, wedDate = '2026-08-21', guestName = null, status = 'loading', redeemedAt = null }) {
  const t = INVITE_THEMES[theme] ? theme : 'sage'
  const r = resolveInvite(settings)
  const s = r.s
  const el = document.createElement('div')
  el.className = 'invite-card'
  el.dataset.inviteTheme = t
  el.dir = 'rtl'
  el.setAttribute('lang', 'ar')

  if (r.face) {
    el.style.setProperty('--ic-khatt', `${r.face.css}, 'Lateef', serif`)
    el.style.setProperty('--ic-nameweight', String(r.face.weight))
    el.style.setProperty('--ic-sealfont', `${r.face.css}, 'Lateef', serif`)
    if (r.face.lh) el.style.setProperty('--ic-nameline', String(r.face.lh))
  }
  const optical = (r.face?.scale || 1) * r.scale
  if (r.face || r.scale !== 1)
    el.style.setProperty('--ic-namesize', `calc(${optical.toFixed(3)} * clamp(40px, 12vw, 58px))`)

  const loading = status === 'loading'
  const invalid = status === 'invalid'
  const hijri = hijriLabel(wedDate, s.hijriDateAr)
  const greg = gregorianLabel(wedDate)

  el.innerHTML = `
    ${INVITE_THEMES[t].art ? `<div class="ic-art" style="background-image:url('${INVITE_THEMES[t].art}')"></div>` : '<div class="ic-art"></div>'}
    ${t === 'badr' ? badrOrnaments() : ''}
    <div class="ic-frame"></div>
    <div class="ic-body">
      ${seal(r.sealGlyph)}
      <div class="ic-eyebrow">${esc(r.eyebrow)}</div>
      <div class="ic-names">
        <span class="ic-name">${esc(r.groomFirst)}</span>
        <span class="ic-join">${COUPLE.join}</span>
        <span class="ic-name">${esc(r.brideFirst)}</span>
      </div>
      <div class="ic-families">
        <span>${esc(r.groomFamily)}</span>
        <span>${esc(r.brideFamily)}</span>
      </div>
      ${dividers[t]}
      <div class="ic-dates">
        ${hijri ? `<div class="ic-hijri">${esc(hijri)}</div>` : ''}
        <div class="ic-greg"><bdi dir="ltr">${esc(greg)}</bdi></div>
        ${s.venueAr ? `<div class="ic-venue">${esc(s.venueAr)}</div>` : ''}
      </div>
      <div class="ic-times">
        <div class="ic-time"><span class="l">${STR.reception}</span><span class="v"><bdi dir="ltr">${esc(s.timeReception)}</bdi></span></div>
        <div class="ic-time"><span class="l">${STR.zaffa}</span><span class="v"><bdi dir="ltr">${esc(s.timeZaffa)}</bdi></span></div>
        <div class="ic-time"><span class="l">${STR.dinner}</span><span class="v"><bdi dir="ltr">${esc(s.timeDinner)}</bdi></span></div>
      </div>
      ${invalid ? '' : `
      <div class="ic-qr-wrap ${status === 'redeemed' ? 'is-used' : ''}">
        <div class="ic-qr">${loading ? '<span class="ic-skel ic-skel-qr"></span>' : ''}</div>
      </div>
      <div class="ic-guest">
        <span class="l">${esc(r.honorary)} :</span>
        ${loading ? '<span class="ic-skel ic-skel-name"></span>' : `<span class="v">${esc(guestName || '')}</span>`}
      </div>`}
      ${stateBand(status, redeemedAt)}
      <div class="ic-footer">${esc(r.footer)}</div>
    </div>`
  return el
}
