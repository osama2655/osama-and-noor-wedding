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
  checkItem: (c) => req('check_item', 'POST', c),
  checkItemDelete: (id) => req('check_item_delete', 'POST', { id }),
  hideCheck: (key, hidden) => req('hide_check', 'POST', { key, hidden }),
  checkOverride: (key, text) => req('check_override', 'POST', { key, text }),
  fact: (f) => req('fact', 'POST', f),
  factDelete: (id) => req('fact_delete', 'POST', { id }),
  openItem: (o) => req('open_item', 'POST', o),
  openItemDelete: (id) => req('open_item_delete', 'POST', { id }),
  decision: (idx, answer) => req('decision', 'POST', { idx, answer }),
  vendor: (v) => req('vendor', 'POST', v),
  vendorDelete: (id) => req('vendor_delete', 'POST', { id }),
  guest: (g) => req('guest', 'POST', g),
  guestDelete: (id) => req('guest_delete', 'POST', { id }),
  pick: (key, picked) => req('pick', 'POST', { key, picked }),
  catalog: (c) => req('catalog', 'POST', c),
  catalogDelete: (id) => req('catalog_delete', 'POST', { id }),
  catalogRemark: (catalogId, body) =>
    req('catalog_remark', 'POST', { catalogId, body }),
  catalogRemarkDelete: (id) => req('catalog_remark_delete', 'POST', { id }),
  catalogFileDelete: (id) => req('catalog_file_delete', 'POST', { id }),
  catalogFileUrl: (id) =>
    `${BASE}?action=catalog_file&id=${encodeURIComponent(id)}`,
  catalogFileUpload: async (catalogId, file) => {
    const fd = new FormData()
    fd.append('catalogId', String(catalogId))
    fd.append('file', file)
    const res = await fetch(`${BASE}?action=catalog_file_upload`, {
      method: 'POST',
      credentials: 'same-origin',
      body: fd,
    })
    let data = {}
    try {
      data = await res.json()
    } catch (_) {
      /* empty body */
    }
    if (!res.ok) {
      const err = new Error(data.error || `upload failed (${res.status})`)
      err.code = res.status
      throw err
    }
    return data
  },
  note: (n) => req('note', 'POST', n),
  noteDelete: (id) => req('note_delete', 'POST', { id }),
  importantDate: (d) => req('important_date', 'POST', d),
  importantDateDelete: (id) => req('important_date_delete', 'POST', { id }),
  bundle: (b) => req('bundle', 'POST', b),
  bundleDelete: (id) => req('bundle_delete', 'POST', { id }),
  bundleItem: (i) => req('bundle_item', 'POST', i),
  bundleItemDelete: (id) => req('bundle_item_delete', 'POST', { id }),
  invite: (i) => req('invite', 'POST', i),
  inviteDelete: (id) => req('invite_delete', 'POST', { id }),
  passesGenerate: (count) => req('passes_generate', 'POST', { count }),
  pass: (p) => req('pass', 'POST', p),
  passDelete: (id) => req('pass_delete', 'POST', { id }),
  passRedeem: (token) => req('pass_redeem', 'POST', { token }),
  setting: (k, v) => req('setting', 'POST', { k, v }),
}
