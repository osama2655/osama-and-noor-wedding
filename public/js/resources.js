import { RESOURCES } from './content.js'

export function renderResources() {
  const el = document.getElementById('tab-resources')
  if (!el) return
  el.innerHTML = RESOURCES.map(
    (r) => `<div class="card"><h2>${r.h}</h2>
      <ul class="checks">${r.items.map((it) => `<li><span class="txt"><a href="${it[1]}" target="_blank" rel="noopener">${it[0]}</a></span></li>`).join('')}</ul>
    </div>`,
  ).join('')
}
