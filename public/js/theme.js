const KEY = 'osama-noor-wedding-theme'

function apply(t) {
  document.documentElement.setAttribute('data-theme', t)
  try {
    localStorage.setItem(KEY, t)
  } catch (_) {
    /* private mode */
  }
}

export function initTheme() {
  let saved = null
  try {
    saved = localStorage.getItem(KEY)
  } catch (_) {
    /* ignore */
  }
  if (saved) apply(saved)
  const btn = document.getElementById('themeBtn')
  if (btn)
    btn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme')
      const next =
        cur === 'dark'
          ? 'light'
          : cur === 'light'
            ? 'dark'
            : matchMedia('(prefers-color-scheme: dark)').matches
              ? 'light'
              : 'dark'
      apply(next)
    })
}
