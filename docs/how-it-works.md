# How TaskFlow works (plain-language tour)

This note explains how the app is put together, so you can talk about it
confidently in an interview. This is the only project in the portfolio with a
real backend, so it is worth understanding the extra pieces.

## The big picture

TaskFlow is a React single-page app backed by Supabase. Supabase provides
three things out of the box: user accounts (Auth), a Postgres database, and
an auto-generated REST API over that database. The React app talks to all
three through one library, `@supabase/supabase-js`, configured once in
`src/supabase.js`.

## Authentication

`App.jsx` starts by asking Supabase for the current session. If there is one,
the task list renders; otherwise the sign-in form does. A listener
(`onAuthStateChange`) keeps the app in sync when the user signs in, signs
out, or the token refreshes, so the UI always matches reality without manual
plumbing.

Supabase handles the hard parts of auth: password hashing, verification,
session tokens, and refresh. The session token (a JWT) is stored by the
library and sent with every database request, which is how the database knows
*who* is asking.

## Row Level Security (RLS)

This is the concept interviewers will dig into, because it is what makes the
architecture safe.

The app's API key is public (it ships in the JavaScript, anyone can read it).
That is fine *by design*, because the database does not trust the key. Every
task row carries the `user_id` of its owner, and the table has RLS policies
that say, in SQL: "for select/insert/update/delete, `auth.uid()` must equal
the row's `user_id`". `auth.uid()` is the user id from the JWT attached to
the request.

So even if someone takes the key and writes their own queries, the database
itself refuses to show them anyone else's tasks. Security lives in the
database, not in the frontend, which is exactly where it should be.

## Optimistic updates

When you add, check off or delete a task, the UI changes *instantly*, before
the server answers. The code updates React state first, then sends the
request; if the request fails, it rolls the state back (the added task
disappears, the check flips back, the deleted task returns). This is the
pattern behind how fast modern apps feel, and it is easy to explain with the
add flow: insert a temporary task locally, replace it with the real row the
server returns, remove it on error.

## Concepts worth mentioning in an interview

- Why a public API key can be safe: Row Level Security + JWTs
- `onAuthStateChange` as a subscription, cleaned up in the `useEffect`
  return function
- Optimistic UI with rollback
- Derived state with `useMemo`: the filtered list and the "tasks left"
  counter are computed from the tasks array, never stored separately
- Backend-as-a-Service trade-offs: fast to build, less control; a good
  talking point about when you would write your own API instead
- A real gotcha: tables created in the SQL editor need explicit `grant`
  statements for the API roles, otherwise every request says "permission
  denied" (the fix is in the README's setup SQL)
