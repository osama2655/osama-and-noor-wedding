// The scanner lib is heavy, so load it only when the couple actually scans.
function loadLib() {
  return new Promise((resolve, reject) => {
    if (window.Html5Qrcode) return resolve()
    const s = document.createElement('script')
    s.src = 'js/vendor/html5-qrcode.min.js'
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}

export async function startScanner(mount) {
  if (!mount) return
  try {
    await loadLib()
  } catch (_) {
    mount.innerHTML =
      '<div class="card"><p class="hint">The scanner could not load.</p></div>'
    return
  }
  mount.innerHTML = `
    <div class="card">
      <p class="hint">Point the camera at an invite QR.</p>
      <div id="reader" style="width:100%;max-width:320px;margin:0 auto"></div>
      <div class="toolbar" style="justify-content:center;margin-top:10px"><button class="btn ghost sm" id="stopScan">Stop</button></div>
    </div>`
  const scanner = new window.Html5Qrcode('reader')
  const stop = () => {
    scanner.stop().catch(() => {})
    mount.innerHTML = ''
  }
  document.getElementById('stopScan').onclick = stop
  scanner
    .start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 240 },
      (decoded) => {
        stop()
        if (/^https?:\/\//.test(decoded)) window.location.href = decoded
        else alert(`Scanned: ${decoded}`)
      },
      () => {},
    )
    .catch(() => {
      mount.innerHTML =
        '<div class="card"><p class="hint">Camera access was blocked. Allow the camera and try again.</p></div>'
    })
}
