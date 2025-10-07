import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import SignIn from './components/SignIn'
import Dashboard from './pages/Dashboard'
export default function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess))
    return () => sub.subscription.unsubscribe()
  }, [])
  if (loading) return null
  return session ? <Dashboard onSignOut={() => supabase.auth.signOut()} /> : <SignIn />
}
