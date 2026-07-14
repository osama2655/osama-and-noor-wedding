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
  checkOverrideDelete: (key) => req('check_override_delete', 'POST', { key }),
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
  catalogRemarkUpdate: (id, body) =>
    req('catalog_remark_update', 'POST', { id, body }),
  catalogFileDelete: (id) => req('catalog_file_delete', 'POST', { id }),
  catalogFileUrl: (id) =>
    `${BASE}?action=catalog_file&id=${encodeURIComponent(id)}`,
  // XHR (not fetch) so we can report real upload progress. onProgress receives
  // a 0..1 fraction, or null once the bytes are sent and the server is working.
  catalogFileUpload: (catalogId, file, onProgress) =>
    new Promise((resolve, reject) => {
      const fd = new FormData()
      fd.append('catalogId', String(catalogId))
      fd.append('file', file)
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${BASE}?action=catalog_file_upload`)
      xhr.withCredentials = true
      xhr.upload.addEventListener('progress', (e) => {
        if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total)
      })
      xhr.upload.addEventListener('load', () => onProgress?.(null))
      xhr.addEventListener('load', () => {
        let data = {}
        try {
          data = JSON.parse(xhr.responseText)
        } catch (_) {
          /* empty body */
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data)
        } else {
          const err = new Error(data.error || `upload failed (${xhr.status})`)
          err.code = xhr.status
          reject(err)
        }
      })
      xhr.addEventListener('error', () =>
        reject(new Error('Upload failed. Check your connection.')),
      )
      xhr.addEventListener('abort', () => reject(new Error('Upload cancelled.')))
      xhr.send(fd)
    }),
  note: (n) => req('note', 'POST', n),
  noteDelete: (id) => req('note_delete', 'POST', { id }),
  importantDate: (d) => req('important_date', 'POST', d),
  importantDateDelete: (id) => req('important_date_delete', 'POST', { id }),
  bundle: (b) => req('bundle', 'POST', b),
  bundleDelete: (id) => req('bundle_delete', 'POST', { id }),
  bundleItem: (i) => req('bundle_item', 'POST', i),
  bundleItemDelete: (id) => req('bundle_item_delete', 'POST', { id }),
  lane: (l) => req('lane', 'POST', l),
  laneDelete: (id) => req('lane_delete', 'POST', { id }),
  laneItem: (i) => req('lane_item', 'POST', i),
  laneItemDelete: (id) => req('lane_item_delete', 'POST', { id }),
  invite: (i) => req('invite', 'POST', i),
  inviteDelete: (id) => req('invite_delete', 'POST', { id }),
  rsvpUpdate: (r) => req('rsvp_update', 'POST', r),
  rsvpDelete: (id) => req('rsvp_delete', 'POST', { id }),
  rsvpAdd: (r) => req('rsvp_add', 'POST', r),
  passesGenerate: (count) => req('passes_generate', 'POST', { count }),
  pass: (p) => req('pass', 'POST', p),
  passDelete: (id) => req('pass_delete', 'POST', { id }),
  passRedeem: (token) => req('pass_redeem', 'POST', { token }),
  passAdd: (label) => req('pass_add', 'POST', { label }),
  passUnredeem: (id) => req('pass_unredeem', 'POST', { id }),
  setting: (k, v) => req('setting', 'POST', { k, v }),
}
