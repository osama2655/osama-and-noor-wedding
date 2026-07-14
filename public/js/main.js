import { api } from './api.js'
import { initAuth, initLogout, showLogin } from './auth.js'
import { renderBoards } from './boards.js'
import { renderShortlist } from './catalog.js'
import { renderChecklist } from './checklist.js'
import { renderCountdown } from './countdown.js'
import { renderDash, renderOverall } from './dashboard.js'
import { renderDates } from './dates.js'
import { renderFacts } from './facts.js'
import { renderSaved } from './favorites.js'
import { initGuestControls, renderGuests } from './guests.js'
import { renderInvite } from './invite.js'
import { renderLanes } from './lanes.js'
import { renderNotes } from './notes.js'
import { renderPasses } from './passes.js'
import { renderResources } from './resources.js'
import { bumpRev, setData, store } from './store.js'
import { startSync } from './sync.js'
import { hydrateTheme, initTheme } from './theme.js'
import { renderThemes } from './themes.js'
import { promptDialog } from './ui.js'
import { initVendorControls, renderVendors } from './vendors.js'

function renderWhoami() {
  const el = document.getElementById('whoami')
  if (el && store.data?.me)
    el.textContent = store.data.me.display || store.data.me.name
}

function renderAll() {
  hydrateTheme()
  renderWhoami()
  renderDash()
  renderCountdown()
  renderOverall()
  renderFacts()
  renderChecklist()
  renderLanes()
  renderShortlist()
  renderSaved()
  renderBoards()
  renderInvite()
  renderPasses()
  renderDates()
  renderNotes()
  renderVendors()
  renderGuests()
  renderResources()
  renderThemes()
}

function openTab(tab) {
  const tabs = document.getElementById('tabs')
  tabs.querySelectorAll('button').forEach((x) => x.classList.remove('active'))
  document
    .querySelectorAll('.panel')
    .forEach((x) => x.classList.remove('active'))
  const btn = tabs.querySelector(`button[data-tab="${tab}"]`)
  btn?.classList.add('active')
  document.getElementById(`tab-${tab}`)?.classList.add('active')
  // Panels that JS-size content (checklist auto-grow textareas) must relayout once
  // they are visible; scrollHeight reads 0 while a panel is display:none.
  window.dispatchEvent(new CustomEvent('tab:shown', { detail: tab }))
}

// Two-level nav: a group strip filters which sub-tabs show; clicking a sub-tab opens its panel.
function initTabs() {
  const groups = document.getElementById('navGroups')
  const tabs = document.getElementById('tabs')
  if (!groups || !tabs) return

  const showGroup = (group) => {
    groups
      .querySelectorAll('button')
      .forEach((g) => g.classList.toggle('active', g.dataset.group === group))
    const members = [...tabs.querySelectorAll('button')].filter(
      (b) => b.dataset.group === group,
    )
    tabs.querySelectorAll('button').forEach((b) => {
      b.hidden = b.dataset.group !== group
    })
    const activeVisible = members.some((b) => b.classList.contains('active'))
    if (!activeVisible && members[0]) openTab(members[0].dataset.tab)
  }

  groups.addEventListener('click', (e) => {
    const g = e.target.closest('button[data-group]')
    if (!g) return
    showGroup(g.dataset.group)
    window.scrollTo(0, 0)
  })

  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]')
    if (!b) return
    openTab(b.dataset.tab)
    window.scrollTo(0, 0)
  })

  showGroup('home')
}

// #editDate lives inside the Dashboard, which re-renders every sync, so delegate.
function initDateEdit() {
  document.addEventListener('click', async (e) => {
    if (e.target.id !== 'editDate') return
    const v = await promptDialog({
      title: 'Wedding day',
      label: 'Pick the date',
      value: store.data.wedDate,
      inputType: 'date',
    })
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

// The boot splash covers first paint; drop it once the app or login is on screen.
function hideBoot() {
  const b = document.getElementById('boot')
  if (!b || b.dataset.hiding) return
  b.dataset.hiding = '1'
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    b.remove()
    return
  }
  b.classList.add('boot-hide')
  const done = () => b.remove()
  b.addEventListener('transitionend', done, { once: true })
  setTimeout(done, 500)
}

async function boot() {
  try {
    const data = await api.state()
    if (!data || !data.me) {
      showLogin(true)
      return
    }
    setData(data)
    hydrateTheme()
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
  } finally {
    hideBoot()
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
