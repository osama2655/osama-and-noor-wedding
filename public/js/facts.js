import { FACTS, OPEN_ITEMS, OWNERS } from './content.js'

const ownerClass = (o) =>
  o === 'you' ? 'you' : o === 'her' ? 'her' : o === 'men' ? 'men' : 'hall'

export function renderFacts() {
  const el = document.getElementById('tab-facts')
  if (!el) return
  el.innerHTML = `
    <div class="card">
      <h2>The plan, locked</h2>
      <p class="hint">Segregated, traditional, about 200 guests. One all-inclusive hall. These are settled, not up for debate.</p>
      <div class="facts">
        ${FACTS.map(
          ([label, value]) => `
          <div class="fact">
            <div class="fact-k">${label}</div>
            <div class="fact-v">${value}</div>
          </div>`,
        ).join('')}
      </div>
    </div>
    <div class="card">
      <h2>Still open</h2>
      <p class="hint">Three loose threads. Do not lose them.</p>
      <ul class="open-list">
        ${OPEN_ITEMS.map(
          ([title, detail, owner]) => `
          <li>
            <span class="open-tag t-${ownerClass(owner)}">${OWNERS[owner]}</span>
            <span class="open-body"><b>${title}.</b> ${detail}</span>
          </li>`,
        ).join('')}
      </ul>
    </div>`
}
