import { WED_DEFAULT } from './content.js'
import { store } from './store.js'

const wedDate = () => store.data?.wedDate || WED_DEFAULT

function parts() {
  const wd = new Date(`${wedDate()}T18:00:00`)
  const ms = wd - new Date()
  return {
    d: Math.max(0, Math.floor(ms / 86400000)),
    h: Math.max(0, Math.floor((ms % 86400000) / 3600000)),
    m: Math.max(0, Math.floor((ms % 3600000) / 60000)),
    past: ms < 0,
  }
}

export function renderCountdown() {
  const c = parts()
  const el = document.getElementById('countdown')
  if (el) {
    el.innerHTML = c.past
      ? '<div class="cd"><div class="n">🎉</div><div class="l">Mabrook!</div></div>'
      : [
          ['d', 'Days'],
          ['h', 'Hours'],
          ['m', 'Mins'],
        ]
          .map(
            (x) =>
              `<div class="cd"><div class="n">${c[x[0]]}</div><div class="l">${x[1]}</div></div>`,
          )
          .join('')
  }
  const lab = document.getElementById('wedDateLabel')
  if (lab) {
    const wd = new Date(`${wedDate()}T00:00:00`)
    lab.textContent = wd.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
}
