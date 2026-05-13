import { writable } from 'svelte/store'
import { authApi } from './api.js'
import { notifications } from './notifications.js'

function createSession() {
  const { subscribe, set, update } = writable({
    user: null,
    loading: true,
    error: '',
  })

  function persist(user) {
    localStorage.setItem('rpm_token', user.token)
    localStorage.setItem('rpm_user', JSON.stringify(user))
  }

  function clear() {
    localStorage.removeItem('rpm_token')
    localStorage.removeItem('rpm_user')
  }

  return {
    subscribe,
    async restore() {
      const token = localStorage.getItem('rpm_token')
      if (!token) {
        notifications.reset()
        set({ user: null, loading: false, error: '' })
        return
      }

      try {
        const user = await authApi.me()
        notifications.start(token)
        notifications.refresh()
        set({ user, loading: false, error: '' })
      } catch (error) {
        clear()
        notifications.reset()
        set({ user: null, loading: false, error: error.message || 'Session expired' })
      }
    },
    async login(email, password) {
      update((state) => ({ ...state, error: '' }))
      const user = await authApi.login(email, password)
      persist(user)
      notifications.start(user.token)
      notifications.refresh()
      set({ user, loading: false, error: '' })
      return user
    },
    async signup(form) {
      update((state) => ({ ...state, error: '' }))
      const user = await authApi.signup(form)
      persist(user)
      notifications.start(user.token)
      notifications.refresh()
      set({ user, loading: false, error: '' })
      return user
    },
    logout() {
      clear()
      notifications.reset()
      set({ user: null, loading: false, error: '' })
      window.location.hash = '#/login'
    },
  }
}

export const session = createSession()
