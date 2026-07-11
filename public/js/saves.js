import { api } from './api.js'
import { bumpRev, meId, store } from './store.js'

// Saving a catalog item reuses the picks table, keyed cat:<id>.
export const saveKey = (item) => `cat:${item.id}`
export const isSaved = (item) => !!store.data.picks?.[saveKey(item)]

export async function toggleSave(item) {
  const key = saveKey(item)
  const picks = store.data.picks || (store.data.picks = {})
  const picked = !picks[key]
  if (picked)
    picks[key] = { by: 'You', byId: meId(), at: new Date().toISOString() }
  else delete picks[key]
  try {
    bumpRev(await api.pick(key, picked))
  } catch (_) {
    /* next poll reconciles */
  }
  return picked
}
