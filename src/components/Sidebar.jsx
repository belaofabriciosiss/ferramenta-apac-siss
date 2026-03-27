import { supabase } from '../lib/supabaseClient'
import styles from './Sidebar.module.css'

export default function Sidebar({ setPage, currentPage, onLogout }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoArea}>
        <img src="/logo.png" alt="Logo" className={styles.logo} onError={e => e.target.style.display='none'} />
        <h2 className={styles.title}>Painel APAC</h2>
      </div>

      <nav className={styles.nav}>
        <button 
          className={`${styles.navItem} ${currentPage === 'gerar' ? styles.active : ''}`}
          onClick={() => setPage('gerar')}
        >
          <span className={styles.icon}>📄</span>
          Gerar Arquivo
        </button>
        <button 
          className={`${styles.navItem} ${currentPage === 'cadastrar' ? styles.active : ''}`}
          onClick={() => setPage('cadastrar')}
        >
          <span className={styles.icon}>➕</span>
          Cadastrar Faixa
        </button>
      </nav>

      <div className={styles.footer}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <span className={styles.icon}>🚪</span>
          Sair
        </button>
      </div>
    </aside>
  )
}
