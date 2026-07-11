const BASE = 'api/index.php'

async function req(action, method, body) {
  const opts = { method, credentials: 'same-origin', headers: {} }
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(`${BASE}?action=${action}`, opts)
  let data = {}
  try {
    data = await res.json()
  } catch (_) {
    /* empty body */
  }
  if (!res.ok) {
    const err = new Error(data.error || `request failed (${res.status})`)
    err.code = res.status
    throw err
  }
  return data
}

export const api = {
  me: () => req('me', 'GET'),
  login: (name, password) => req('login', 'POST', { name, password }),
  logout: () => req('logout', 'POST', {}),
  state: (rev) =>
    req(`state${rev != null ? `&rev=${encodeURIComponent(rev)}` : ''}`, 'GET'),
  check: (key, done) => req('check', 'POST', { key, done }),
  decision: (idx, answer) => req('decision', 'POST', { idx, answer }),
  vendor: (v) => req('vendor', 'POST', v),
  vendorDelete: (id) => req('vendor_delete', 'POST', { id }),
  guest: (g) => req('guest', 'POST', g),
  guestDelete: (id) => req('guest_delete', 'POST', { id }),
  pick: (key, picked) => req('pick', 'POST', { key, picked }),
  setting: (k, v) => req('setting', 'POST', { k, v }),
}
