import { writable } from 'svelte/store'

const store = writable([])
let idCounter = 0

function add(message, type = 'info', durationMs = 4000) {
  const id = ++idCounter
  const toast = { id, message, type }
  store.update((items) => [...items, toast])
  setTimeout(() => {
    remove(id)
  }, durationMs)
  return id
}

function remove(id) {
  store.update((items) => items.filter((item) => item.id !== id))
}

export const toasts = {
  subscribe: store.subscribe,
  add,
  remove,
  success: (message) => add(message, 'success'),
  error: (message) => add(message, 'error'),
  warning: (message) => add(message, 'warning'),
  info: (message) => add(message, 'info'),
}
