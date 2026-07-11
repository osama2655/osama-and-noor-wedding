// Swappable embed components. The rest of the app calls these and never knows the
// underlying technique, so it can change in one place. All keyless, no API keys.

export function googleMap(mount, query) {
  if (!mount) return
  if (!query) {
    mount.innerHTML = ''
    return
  }
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
  mount.innerHTML = `<iframe class="gmap" src="${src}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen title="Map"></iframe>`
}

export function instagramCard(mount, handle) {
  if (!mount) return
  if (!handle) {
    mount.innerHTML = ''
    return
  }
  const h = handle.replace(/^@/, '')
  mount.innerHTML = `<a class="ig-card" href="https://instagram.com/${h}" target="_blank" rel="noopener">
      <span class="ig-glyph">Ig</span>
      <span class="ig-body"><span class="ig-handle">@${h}</span><span class="ig-sub">View on Instagram</span></span>
      <span class="ig-arrow">&rarr;</span>
    </a>`
}
