import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import GerarAPAC from './pages/GerarAPAC'
import CadastrarFaixa from './pages/CadastrarFaixa'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('gerar')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>Carregando acesso...</div>
  }

  if (!session) {
    return <Login onLoginSuccess={() => {}} />
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar 
        currentPage={currentPage} 
        setPage={setCurrentPage} 
        onLogout={() => setSession(null)} 
      />
      
      <div style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
        {currentPage === 'gerar' && <GerarAPAC />}
        {currentPage === 'cadastrar' && <CadastrarFaixa />}
      </div>
    </div>
  )
}
