import { useCallback, useEffect, useMemo, useState } from 'react'
import { guestStore, remoteStore } from '../store'
import Spinner from './Spinner'

const FILTERS = [
  ['all', 'All'],
  ['active', 'Active'],
  ['done', 'Done'],
]

export default function TaskList({ user, guest }) {
  const store = useMemo(() => (guest ? guestStore() : remoteStore(user)), [guest, user])
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState('')
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setTasks(await store.list())
    } catch {
      setError('Could not load your tasks. Try again.')
    }
    setLoading(false)
  }, [store])

  useEffect(() => {
    load()
  }, [load])

  async function addTask(e) {
    e.preventDefault()
    const text = title.trim()
    if (!text) return
    setTitle('')
    // optimistic insert: show it right away, roll back if the insert fails
    const optimistic = { id: `tmp-${Date.now()}`, title: text, is_complete: false, created_at: new Date().toISOString() }
    setTasks((prev) => [optimistic, ...prev])
    try {
      const data = await store.add(text)
      setTasks((prev) => prev.map((t) => (t.id === optimistic.id ? data : t)))
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== optimistic.id))
    }
  }

  async function toggle(task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_complete: !t.is_complete } : t)))
    try { await store.patch(task.id, { is_complete: !task.is_complete }) }
    catch { setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t))) }
  }

  async function remove(task) {
    const backup = tasks
    setTasks((prev) => prev.filter((t) => t.id !== task.id))
    try { await store.remove(task.id) } catch { setTasks(backup) }
  }

  async function clearDone() {
    const ids = tasks.filter((t) => t.is_complete).map((t) => t.id)
    if (!ids.length) return
    const backup = tasks
    setTasks((prev) => prev.filter((t) => !t.is_complete))
    try { await store.removeMany(ids) } catch { setTasks(backup) }
  }

  async function saveEdit(task) {
    const text = draft.trim()
    setEditing(null)
    if (!text || text === task.title) return
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, title: text } : t)))
    try { await store.patch(task.id, { title: text }) }
    catch { setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t))) }
  }

  const visible = useMemo(
    () => tasks
      .filter((t) => (filter === 'all' ? true : filter === 'active' ? !t.is_complete : t.is_complete))
      .filter((t) => t.title.toLowerCase().includes(query.trim().toLowerCase())),
    [tasks, filter, query],
  )
  const doneCount = tasks.length - tasks.filter((t) => !t.is_complete).length
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0
  const remaining = tasks.filter((t) => !t.is_complete).length

  return (
    <section>
      <form className="add-form" onSubmit={addTask}>
        <input
          className="add-input"
          placeholder="What needs doing?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="New task"
        />
        <button className="primary-btn" type="submit">Add task</button>
      </form>

      {guest && <p className="guest-note">Guest mode: tasks are saved in this browser only.</p>}
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Tasks completed">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="muted-line">{doneCount} of {tasks.length} done ({pct}%)</p>
      <input className="add-input search" placeholder="Search tasks..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search tasks" />
      <div className="list-toolbar">
        <div className="filters">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              className={`chip ${filter === value ? 'chip-active' : ''}`}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="counter">{remaining} left</span>
        <button className="link-btn" onClick={clearDone} disabled={!doneCount}>Clear completed</button>
      </div>

      {loading && <Spinner label="Loading tasks…" />}
      {error && !loading && (
        <div className="error-box" role="alert">
          <p>{error}</p>
          <button className="link-btn" onClick={load}>Try again</button>
        </div>
      )}
      {!loading && !error && visible.length === 0 && (
        <p className="empty">
          {filter === 'all' ? 'No tasks yet. Add your first one above!' : `No ${filter} tasks.`}
        </p>
      )}
      <ul className="task-list">
        {visible.map((t) => (
          <li className={`task-item ${t.is_complete ? 'task-done' : ''}`} key={t.id}>
            <label className="task-check">
              <input type="checkbox" checked={t.is_complete} onChange={() => toggle(t)} />
              {editing !== t.id && <span className="task-title">{t.title}</span>}
            </label>
            {editing === t.id ? (
              <input
                className="edit-input"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => saveEdit(t)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(t); if (e.key === 'Escape') setEditing(null) }}
                aria-label="Edit task"
              />
            ) : (
              <button className="link-btn" onClick={() => { setEditing(t.id); setDraft(t.title) }} aria-label={`Edit ${t.title}`}>Edit</button>
            )}
            <button className="delete-btn" onClick={() => remove(t)} aria-label={`Delete ${t.title}`}>
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
