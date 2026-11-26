import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import AuthForm from './components/AuthForm'
import TaskList from './components/TaskList'
import Spinner from './components/Spinner'

export default function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [guest, setGuest] = useState(() => localStorage.getItem('taskflow-guest') === '1')
  const enterGuest = (on) => { localStorage.setItem('taskflow-guest', on ? '1' : '0'); setGuest(on) }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    // keep the app in sync when the user signs in, out, or the token refreshes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (checking) return <Spinner label="Loading…" />

  return (
    <div className="app">
      <header className="topbar container">
        <h1 className="brand">
          <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 12l4 4 10-10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span> TaskFlow
        </h1>
        {!session && guest && (
          <div className="user-box">
            <span className="user-email">Guest</span>
            <button className="link-btn" onClick={() => enterGuest(false)}>Leave guest mode</button>
          </div>
        )}
        {session && (
          <div className="user-box">
            <span className="user-email">{session.user.email}</span>
            <button className="link-btn" onClick={() => supabase.auth.signOut()}>
              Sign out
            </button>
          </div>
        )}
      </header>
      <main className="container">
        {session ? <TaskList user={session.user} /> : guest ? <TaskList guest /> : (
          <>
            <AuthForm />
            <p className="guest-cta">No account? <button className="link-btn" onClick={() => enterGuest(true)}>Try it as a guest</button></p>
          </>
        )}
      </main>
      <footer className="footer">
        <p>
          Built with React + <a href="https://supabase.com" target="_blank" rel="noopener">Supabase</a>{' '}
          (auth + Postgres with Row Level Security).
        </p>
      </footer>
    </div>
  )
}
