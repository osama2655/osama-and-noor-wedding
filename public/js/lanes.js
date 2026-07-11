import { LANES } from './content.js'

const label = (t) => (t === 'you' ? 'You' : t === 'her' ? 'Noor' : 'Both')
const cls = (t) => (t === 'you' ? 'you' : t === 'her' ? 'her' : 'shared')

export function renderLanes() {
  const el = document.getElementById('tab-lanes')
  if (!el) return
  el.innerHTML = LANES.map(
    (l) => `<div class="card">
      <div class="week-head"><h2>${l.title}</h2><span class="owner-tag t-${cls(l.tag)}" style="font-size:11px">${label(l.tag)}</span></div>
      ${l.note ? `<p class="hint">${l.note}</p>` : ''}
      <ul class="checks">${l.items.map((it) => `<li><span class="cbx" style="pointer-events:none;opacity:.35"></span><span class="txt">${it}</span></li>`).join('')}</ul>
    </div>`,
  ).join('')
}
