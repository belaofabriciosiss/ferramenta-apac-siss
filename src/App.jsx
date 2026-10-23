import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import GerarAPAC from './pages/GerarAPAC'
import CadastrarFaixa from './pages/CadastrarFaixa'
import CadastrarEstabelecimento from './pages/CadastrarEstabelecimento'
import Regras from './pages/Regras'

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
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#17324D' }}>
        Carregando acesso...
      </div>
    )
  }

  if (!session) {
    return <Login onLoginSuccess={() => {}} />
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F4F7F9' }}>
      <TopBar onLogout={handleLogout} usuarioEmail={session?.user?.email} />
      
      <div style={{ display: 'flex', paddingTop: '56px' }}>
        <Sidebar 
          currentPage={currentPage} 
          setPage={setCurrentPage} 
        />
        
        <div style={{ flex: 1, minWidth: 0 }}>
          {currentPage === 'gerar' && <GerarAPAC />}
          {currentPage === 'cadastrar' && <CadastrarFaixa />}
          {currentPage === 'estabelecimentos' && <CadastrarEstabelecimento />}
          {currentPage === 'regras' && <Regras />}
        </div>
      </div>
    </div>
  )
}
