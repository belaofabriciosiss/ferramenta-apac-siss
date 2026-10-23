import styles from './Sidebar.module.css'

export default function Sidebar({ setPage, currentPage }) {
  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        <div className={styles.sectionLabel}>OPERAÇÕES</div>

        <button 
          className={`${styles.navItem} ${currentPage === 'gerar' ? styles.active : ''}`}
          onClick={() => setPage('gerar')}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <span className={styles.navText}>Gerar Arquivo APAC</span>
        </button>

        <button 
          className={`${styles.navItem} ${currentPage === 'cadastrar' ? styles.active : ''}`}
          onClick={() => setPage('cadastrar')}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          <span className={styles.navText}>Cadastrar Faixas</span>
        </button>

        <button 
          className={`${styles.navItem} ${currentPage === 'estabelecimentos' ? styles.active : ''}`}
          onClick={() => setPage('estabelecimentos')}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18"/>
            <path d="M5 21V7l8-4v18"/>
            <path d="M19 21V11l-6-4"/>
            <path d="M9 9h1"/>
            <path d="M9 13h1"/>
            <path d="M9 17h1"/>
          </svg>
          <span className={styles.navText}>Cadastro Estabelecimento</span>
        </button>

        <div className={styles.sectionLabel} style={{ marginTop: '1.25rem' }}>CONSULTAS</div>

        <button
          className={`${styles.navItem} ${currentPage === 'regras' ? styles.active : ''}`}
          onClick={() => setPage('regras')}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span className={styles.navText}>Regras de Negócio</span>
        </button>
      </nav>

      <div className={styles.footer}>
        <span className={styles.versionText}>SissSaúde • APAC v2.1</span>
      </div>
    </aside>
  )
}
