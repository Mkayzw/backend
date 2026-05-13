import { writable } from 'svelte/store'
import { notificationsApi } from './api.js'
import { startRealtimeStream } from './realtime.js'

function createNotificationsStore() {
  const { subscribe, set, update } = writable({
    items: [],
    unreadCount: 0,
    unreadAlerts: 0,
    loading: false,
  })

  let stream = null

  return {
    subscribe,
    async refresh() {
      update((state) => ({ ...state, loading: true }))
      try {
        const data = await notificationsApi.list({ limit: 50 })
        set({
          items: data.notifications || [],
          unreadCount: data.unreadCount || 0,
          unreadAlerts: 0,
          loading: false,
        })
      } catch {
        update((state) => ({ ...state, loading: false }))
      }
    },
    setUnreadAlerts(count) {
      update((state) => ({ ...state, unreadAlerts: Number(count) || 0 }))
    },
    async markRead(id) {
      try {
        const updated = await notificationsApi.markRead(id)
        update((state) => ({
          ...state,
          items: state.items.map((item) => (item.id === id ? updated : item)),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }))
      } catch {
        // no-op
      }
    },
    async markAllRead() {
      try {
        await notificationsApi.markAllRead()
        update((state) => ({
          ...state,
          items: state.items.map((item) => ({ ...item, isRead: true })),
          unreadCount: 0,
        }))
      } catch {
        // no-op
      }
    },
    start(token) {
      this.stop()
      if (!token) return
      stream = startRealtimeStream({
        token,
        onEvent: (evt) => {
          if (evt?.event !== 'notification.created') return
          const incoming = evt?.data
          if (!incoming?.id) return
          update((state) => {
            if (state.items.some((item) => item.id === incoming.id)) return state
            return {
              ...state,
              items: [incoming, ...state.items].slice(0, 50),
              unreadCount: incoming.isRead ? state.unreadCount : state.unreadCount + 1,
            }
          })
        },
      })
    },
    stop() {
      if (stream) {
        stream.stop()
        stream = null
      }
    },
    reset() {
      this.stop()
      set({ items: [], unreadCount: 0, unreadAlerts: 0, loading: false })
    },
  }
}

export const notifications = createNotificationsStore()
