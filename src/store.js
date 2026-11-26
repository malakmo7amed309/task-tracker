import { supabase } from './supabase'

// Same shape for both backends so the UI does not care which one it talks to.
export function remoteStore(user) {
  return {
    async list() {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    async add(title) {
      const { data, error } = await supabase.from('tasks').insert({ title, user_id: user.id }).select().single()
      if (error) throw error
      return data
    },
    async patch(id, fields) {
      const { error } = await supabase.from('tasks').update(fields).eq('id', id)
      if (error) throw error
    },
    async remove(id) {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    async removeMany(ids) {
      const { error } = await supabase.from('tasks').delete().in('id', ids)
      if (error) throw error
    },
  }
}

// Guest mode: tasks live in this browser only (localStorage).
const KEY = 'taskflow-guest-tasks'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } }
const write = (t) => localStorage.setItem(KEY, JSON.stringify(t))

export function guestStore() {
  return {
    async list() { return read() },
    async add(title) {
      const t = { id: 'g-' + Date.now() + Math.random().toString(36).slice(2, 6), title, is_complete: false, created_at: new Date().toISOString() }
      write([t, ...read()])
      return t
    },
    async patch(id, fields) { write(read().map((t) => (t.id === id ? { ...t, ...fields } : t))) },
    async remove(id) { write(read().filter((t) => t.id !== id)) },
    async removeMany(ids) { write(read().filter((t) => !ids.includes(t.id))) },
  }
}
