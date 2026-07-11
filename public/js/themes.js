import { currentTheme, setTheme, THEMES } from './theme.js'

export function renderThemes() {
  const el = document.getElementById('tab-themes')
  if (!el) return
  const active = currentTheme()

  el.innerHTML = `
    <div class="card">
      <h2>Pick your theme</h2>
      <p class="hint">One shared look for both of you. Tap a card to try it live, the whole app changes. Choose the one you love.</p>
      <div class="theme-grid">
        ${THEMES.map(
          (t) => `
          <button class="theme-card ${t.id === active ? 'on' : ''}" data-theme="${t.id}" data-pick="${t.id}">
            <div class="tc-bg"></div>
            <div class="tc-mock">
              <div class="tc-title">Osama <span class="tc-amp">and</span> Noor</div>
              <div class="tc-bar"><span></span></div>
              <div class="tc-row">
                <span class="tc-chip">Venues</span>
                <span class="tc-btn">Save</span>
              </div>
            </div>
            <div class="tc-foot">
              <div class="tc-name">${t.name}${t.id === active ? ' <span class="tc-check">selected</span>' : ''}</div>
              <div class="tc-mood">${t.mood}</div>
            </div>
          </button>`,
        ).join('')}
      </div>
    </div>`

  el.querySelectorAll('.theme-card').forEach((c) =>
    c.addEventListener('click', () => {
      setTheme(c.dataset.pick)
      renderThemes()
    }),
  )
}
