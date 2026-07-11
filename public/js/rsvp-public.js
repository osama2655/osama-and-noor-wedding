// Standalone public RSVP page. No login, no app bundle. Talks only to the public
// invite endpoints, keyed by the token in the link.
const token = new URLSearchParams(location.search).get('token') || ''

function call(action, body) {
  return fetch(
    `api/index.php?action=${action}&token=${encodeURIComponent(token)}`,
    {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    },
  ).then((r) => r.json())
}

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m],
  )

async function init() {
  const root = document.getElementById('rsvp-root')
  if (!token) {
    root.innerHTML =
      '<div class="rsvp-card"><h1>Invalid link</h1><p>This invite link is missing its code.</p></div>'
    return
  }
  let info
  try {
    info = await call('invite_info')
  } catch (_) {
    /* handled below */
  }
  if (!info || info.error) {
    root.innerHTML =
      '<div class="rsvp-card"><h1>Invite not found</h1><p>This link is not valid or has been closed.</p></div>'
    return
  }
  const wed = new Date(`${info.wedDate}T00:00:00`).toLocaleDateString(
    undefined,
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  )
  root.innerHTML = `<div class="rsvp-card">
      <div class="eyebrow">You are invited</div>
      <h1>Osama <span class="amp">and</span> Noor</h1>
      <p class="rsvp-date">${esc(wed)}</p>
      <form id="rsvpForm">
        <input name="name" placeholder="Your name" autocomplete="name" required>
        <div class="rsvp-att">
          <label><input type="radio" name="attending" value="yes" checked> Coming</label>
          <label><input type="radio" name="attending" value="no"> Cannot make it</label>
        </div>
        <label class="rsvp-lbl">How many, including you?</label>
        <input name="headcount" type="number" min="1" max="20" value="1">
        <select name="side">
          <option value="both">Whose guest are you?</option>
          <option value="you">Groom's side</option>
          <option value="her">Bride's side</option>
        </select>
        <textarea name="message" placeholder="A note for the couple (optional)"></textarea>
        <button class="btn" type="submit">Send RSVP</button>
        <div class="rsvp-err" id="rsvpErr"></div>
      </form>
    </div>`

  document.getElementById('rsvpForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const f = e.target
    const btn = f.querySelector('button')
    btn.disabled = true
    const payload = {
      name: f.name.value,
      attending: f.attending.value,
      headcount: Number(f.headcount.value) || 1,
      side: f.side.value,
      message: f.message.value,
    }
    try {
      const r = await call('rsvp', payload)
      if (r && r.ok) {
        root.innerHTML =
          '<div class="rsvp-card"><h1>Thank you</h1><p>Your RSVP is in. We cannot wait to celebrate with you.</p></div>'
      } else {
        throw new Error('failed')
      }
    } catch (_) {
      document.getElementById('rsvpErr').textContent =
        'Something went wrong. Please try again.'
      btn.disabled = false
    }
  })
}

init()
