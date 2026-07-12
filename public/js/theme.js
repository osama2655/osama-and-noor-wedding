import { api } from './api.js'
import { bumpRev, store } from './store.js'

const KEY = 'osama-noor-wedding-theme'
export const DEFAULT_THEME = 'gold'

// The 8 themes. id drives the data-theme attribute and the shared setting value.
export const THEMES = [
  {
    id: 'gold',
    name: 'Layl w Dhahab',
    mood: 'Warm gold heritage, candlelit and Khaleeji.',
  },
  {
    id: 'nocturne',
    name: 'Sadu Nocturne',
    mood: 'Midnight velvet with gold foil.',
  },
  {
    id: 'rose',
    name: 'Ward Ateeq',
    mood: 'Blush and champagne, modern romance.',
  },
  {
    id: 'emerald',
    name: 'Zumurrud w Qeshta',
    mood: 'Emerald and cream, regal and calm.',
  },
  {
    id: 'aurora',
    name: 'Ghuroub Aurora',
    mood: 'Desert dusk, apricot into violet.',
  },
  {
    id: 'geometric',
    name: 'Nujoom Handasiya',
    mood: 'Eight point stars on deep navy.',
  },
  { id: 'glass', name: 'Habab', mood: 'Frosted glass over a soft dawn.' },
  { id: 'ivory', name: 'Waraq Ivory', mood: 'Ivory editorial, one gold rule.' },
]

const valid = (id) => THEMES.some((t) => t.id === id)

export function applyTheme(id) {
  const t = valid(id) ? id : DEFAULT_THEME
  document.documentElement.setAttribute('data-theme', t)
  try {
    localStorage.setItem(KEY, t)
  } catch (_) {
    /* private mode */
  }
}

export const currentTheme = () =>
  document.documentElement.getAttribute('data-theme') || DEFAULT_THEME

// Persist the shared choice for both partners.
export async function setTheme(id) {
  applyTheme(id)
  store.data.theme = currentTheme()
  try {
    bumpRev(await api.setting('theme', currentTheme()))
  } catch (_) {
    /* next poll reconciles */
  }
}

// Instant first paint from localStorage, before the network state arrives.
export function initTheme() {
  let saved = null
  try {
    saved = localStorage.getItem(KEY)
  } catch (_) {
    /* ignore */
  }
  applyTheme(saved || DEFAULT_THEME)
  const btn = document.getElementById('themeBtn')
  if (btn)
    btn.addEventListener('click', () => {
      document.querySelector('#navGroups button[data-group="more"]')?.click()
      document.querySelector('#tabs button[data-tab="themes"]')?.click()
    })
}

// The shared server value wins once state loads.
export function hydrateTheme() {
  if (store.data?.theme) applyTheme(store.data.theme)
}
