import styles from './TopBar.module.css'

export default function TopBar({ onLogout, usuarioEmail }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <div className={styles.brand}>
          <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <span className={styles.brandTitle}>SissSaúde</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.moduleBadge}>
          <svg className={styles.shieldIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
          <span className={styles.moduleText}>Gestão e Exportação APAC</span>
        </div>
      </div>

      <div className={styles.right}>
        {usuarioEmail && (
          <div className={styles.userBadge}>
            <svg className={styles.userIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span className={styles.userEmail}>{usuarioEmail}</span>
          </div>
        )}
        <button className={styles.logoutBtn} onClick={onLogout} title="Encerrar sessão">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Sair</span>
        </button>
      </div>
    </header>
  )
}
