import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import Spinner from './Spinner'

const FILTERS = [
  ['all', 'All'],
  ['active', 'Active'],
  ['done', 'Done'],
]

export default function TaskList({ user }) {
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) setError('Could not load your tasks. Try again.')
    else setTasks(data)
    setLoading(false)
  }, [])

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
    const { data, error: err } = await supabase
      .from('tasks')
      .insert({ title: text, user_id: user.id })
      .select()
      .single()
    if (err) setTasks((prev) => prev.filter((t) => t.id !== optimistic.id))
    else setTasks((prev) => prev.map((t) => (t.id === optimistic.id ? data : t)))
  }

  async function toggle(task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_complete: !t.is_complete } : t)))
    const { error: err } = await supabase.from('tasks').update({ is_complete: !task.is_complete }).eq('id', task.id)
    if (err) setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
  }

  async function remove(task) {
    const backup = tasks
    setTasks((prev) => prev.filter((t) => t.id !== task.id))
    const { error: err } = await supabase.from('tasks').delete().eq('id', task.id)
    if (err) setTasks(backup)
  }

  const visible = useMemo(
    () => tasks.filter((t) => (filter === 'all' ? true : filter === 'active' ? !t.is_complete : t.is_complete)),
    [tasks, filter],
  )
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
              <span className="task-title">{t.title}</span>
            </label>
            <button className="delete-btn" onClick={() => remove(t)} aria-label={`Delete ${t.title}`}>
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
