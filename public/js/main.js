import { api } from './api.js'
import { initAuth, initLogout, showLogin } from './auth.js'
import { renderChecklist } from './checklist.js'
import { renderCountdown } from './countdown.js'
import { renderDash, renderOverall } from './dashboard.js'
import { renderDecisions } from './decisions.js'
import { initGuestControls, renderGuests } from './guests.js'
import { renderLanes } from './lanes.js'
import { renderResources } from './resources.js'
import { renderShortlist } from './shortlist.js'
import { bumpRev, setData, store } from './store.js'
import { startSync } from './sync.js'
import { initTheme } from './theme.js'
import { initVendorControls, renderVendors } from './vendors.js'

function renderWhoami() {
  const el = document.getElementById('whoami')
  if (el && store.data?.me)
    el.textContent = store.data.me.display || store.data.me.name
}

function renderAll() {
  renderWhoami()
  renderCountdown()
  renderOverall()
  renderDash()
  renderDecisions()
  renderChecklist()
  renderLanes()
  renderVendors()
  renderGuests()
  renderShortlist()
  renderResources()
}

function initTabs() {
  const tabs = document.getElementById('tabs')
  if (!tabs) return
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]')
    if (!b) return
    tabs.querySelectorAll('button').forEach((x) => x.classList.remove('active'))
    document
      .querySelectorAll('.panel')
      .forEach((x) => x.classList.remove('active'))
    b.classList.add('active')
    document.getElementById(`tab-${b.dataset.tab}`).classList.add('active')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })
}

function initDateEdit() {
  const btn = document.getElementById('editDate')
  if (!btn) return
  btn.addEventListener('click', async () => {
    const v = prompt('Wedding date (YYYY-MM-DD):', store.data.wedDate)
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      store.data.wedDate = v
      renderCountdown()
      try {
        bumpRev(await api.setting('wedDate', v))
      } catch (_) {
        /* ignore */
      }
    }
  })
}

function initExport() {
  const btn = document.getElementById('exportBtn')
  if (!btn) return
  btn.addEventListener('click', (e) => {
    e.preventDefault()
    const blob = new Blob([JSON.stringify(store.data, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'osama-noor-wedding-backup.json'
    a.click()
  })
}

async function boot() {
  try {
    const data = await api.state()
    if (!data || !data.me) {
      showLogin(true)
      return
    }
    setData(data)
    showLogin(false)
    renderAll()
    startSync(renderAll)
  } catch (e) {
    if (e.code === 401) {
      showLogin(true)
      return
    }
    const tick = document.getElementById('saveTick')
    if (tick) {
      tick.textContent = '⚠ offline'
      tick.closest('.savebar').classList.add('err')
    }
  }
}

// One-time UI wiring (survives login/logout).
initTheme()
initTabs()
initDateEdit()
initExport()
initVendorControls()
initGuestControls()
initLogout()
initAuth(boot)

// Keep the countdown ticking.
setInterval(renderCountdown, 60000)

boot()
