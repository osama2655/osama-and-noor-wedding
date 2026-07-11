import { api } from './api.js'

let chosen = null

export function showLogin(show) {
  const login = document.getElementById('login')
  const app = document.getElementById('app')
  if (login) login.hidden = !show
  if (app) app.hidden = show
}

export function initAuth(onLogin) {
  const err = document.getElementById('loginErr')
  const pass = document.getElementById('loginPass')
  const form = document.getElementById('loginForm')
  const whoBtns = [...document.querySelectorAll('#loginWho button')]

  whoBtns.forEach((b) =>
    b.addEventListener('click', () => {
      chosen = b.dataset.name
      whoBtns.forEach((x) => x.classList.toggle('on', x === b))
      pass.focus()
    }),
  )

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    err.textContent = ''
    if (!chosen) {
      err.textContent = 'Pick who you are first.'
      return
    }
    if (!pass.value) {
      err.textContent = 'Enter your password.'
      return
    }
    const submit = form.querySelector('button[type="submit"]')
    submit.disabled = true
    try {
      await api.login(chosen, pass.value)
      pass.value = ''
      await onLogin()
    } catch (ex) {
      err.textContent =
        ex.code === 401
          ? 'Wrong password for that name.'
          : ex.message || 'Login failed.'
    } finally {
      submit.disabled = false
    }
  })
}

export function initLogout() {
  const btn = document.getElementById('logoutBtn')
  if (btn)
    btn.addEventListener('click', async () => {
      try {
        await api.logout()
      } catch (_) {
        /* ignore */
      }
      location.reload()
    })
}
