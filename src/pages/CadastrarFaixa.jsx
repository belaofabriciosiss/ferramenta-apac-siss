import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { parsearAPAC, calcularDV, formatarAPAC } from '../utils/apacUtils'
import styles from '../App.module.css'

export default function CadastrarFaixa() {
  const [lote, setLote] = useState('')
  const [estabelecimento, setEstabelecimento] = useState('')
  const [apacDe, setApacDe] = useState('')
  const [apacAte, setApacAte] = useState('')
  
  const [faixas, setFaixas] = useState([])
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState(null)
  
  const [faixaDetalhes, setFaixaDetalhes] = useState(null)
  
  useEffect(() => {
    carregarFaixas()
  }, [])

  async function carregarFaixas() {
    const { data, error } = await supabase
      .from('faixas_apac')
      .select('*')
      .order('criado_em', { ascending: false })
      
    if (!error && data) {
      setFaixas(data)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMensagem(null)
    
    if (!lote.trim()) {
      setMensagem({ tipo: 'error', texto: 'Informe o Lote' })
      return
    }

    const parseDe = apacDe.trim() ? parsearAPAC(apacDe.trim()) : null
    const parseAte = apacAte.trim() ? parsearAPAC(apacAte.trim()) : null

    if (!parseDe || !parseAte) {
      setMensagem({ tipo: 'error', texto: 'Verifique as numerações de APAC. Precisam ter 13 dígitos.' })
      return
    }

    const inicio = BigInt(parseDe.base12)
    const fim = BigInt(parseAte.base12)

    if (fim < inicio) {
      setMensagem({ tipo: 'error', texto: 'A numeração final deve ser maior ou igual à inicial.' })
      return
    }

    const total = Number(fim - inicio) + 1

    setLoading(true)

    const { error } = await supabase.from('faixas_apac').insert([{
      lote: lote.trim(),
      estabelecimento: estabelecimento.trim() || null,
      numero_inicial: inicio.toString(),
      numero_final: fim.toString(),
      proximo_numero: inicio.toString(),
      total_numeros: total,
      numeros_restantes: total,
      ativo: true
    }])

    if (error) {
      setMensagem({ tipo: 'error', texto: 'Erro ao salvar: ' + error.message })
    } else {
      setMensagem({ tipo: 'success', texto: 'Faixa cadastrada com sucesso!' })
      setLote('')
      setEstabelecimento('')
      setApacDe('')
      setApacAte('')
      carregarFaixas()
    }
    
    setLoading(false)
  }

  async function inativarFaixa(id) {
    if(!confirm("Tem certeza que deseja inativar esta faixa?")) return
    
    await supabase.from('faixas_apac').update({ ativo: false }).eq('id', id)
    carregarFaixas()
  }

  function gerarListaNumeros(faixa) {
    if (!faixa) return []
    const lista = []
    const maxToRender = 2000
    
    let atual = BigInt(faixa.numero_inicial)
    const final = BigInt(faixa.numero_final)
    const proximo = BigInt(faixa.proximo_numero)
    let count = 0
    
    while (atual <= final && count < maxToRender) {
      const base12 = String(atual).padStart(12, '0')
      const dv = calcularDV(base12)
      const numeroAPAC = formatarAPAC(base12, dv)
      
      lista.push({
        numero: String(atual),
        numeroAPAC,
        utilizado: atual < proximo
      })
      
      atual++
      count++
    }
    return lista
  }

  return (
    <div className={styles.page} style={{ marginLeft: '260px', minHeight: '100vh', width: 'auto' }}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerText}>
            <h1 className={styles.headerTitle}>Cadastrar Faixa Numérica APAC</h1>
            <p className={styles.headerSub}>Gerencie os lotes de numerações disponíveis de autorização.</p>
          </div>
        </div>
      </header>

      <main className={styles.main} style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div className={styles.card}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Nova Faixa</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className={styles.fieldsRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Identificação do Lote *</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={lote} 
                    onChange={e => setLote(e.target.value)} 
                    placeholder="Ex: Lote Abril/2026"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Estabelecimento (Opcional)</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={estabelecimento} 
                    onChange={e => setEstabelecimento(e.target.value)} 
                    placeholder="Ex: UPA Centro"
                  />
                </div>
              </div>

              <div className={styles.fieldsRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Número Inicial *</label>
                  <input 
                    type="text" 
                    className={`${styles.input} ${styles.inputMono}`} 
                    value={apacDe} 
                    onChange={e => setApacDe(e.target.value)} 
                    placeholder="123456789012-3"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Número Final *</label>
                  <input 
                    type="text" 
                    className={`${styles.input} ${styles.inputMono}`} 
                    value={apacAte} 
                    onChange={e => setApacAte(e.target.value)} 
                    placeholder="123456789012-9"
                  />
                </div>
              </div>

              {mensagem && (
                <div className={`${styles.mensagem} ${styles[`mensagem_${mensagem.tipo}`]}`}>
                  <span className={styles.mensagemIcon}>
                    {mensagem.tipo === 'success' ? '✓' : '✕'}
                  </span>
                  {mensagem.texto}
                </div>
              )}

              <div className={styles.actions}>
                <button type="submit" className={styles.btnGerar} disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar Faixa'}
                </button>
              </div>
            </form>
          </section>

          <div className={styles.divider} />

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Lotes Cadastrados</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280' }}>
                    <th style={{ padding: '0.75rem' }}>Lote</th>
                    <th style={{ padding: '0.75rem' }}>Estabelecimento</th>
                    <th style={{ padding: '0.75rem' }}>Restantes</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {faixas.map(f => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem', fontWeight: '500' }}>{f.lote}</td>
                      <td style={{ padding: '0.75rem' }}>{f.estabelecimento || '-'}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ fontWeight: '600', color: f.numeros_restantes === 0 ? '#ef4444' : '#008E7B' }}>
                          {f.numeros_restantes}
                        </span> de {f.total_numeros}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {f.ativo ? (
                          <div className={`${styles.statusBadge} ${styles.badge_success}`}><span className={styles.badgeDot}/> Ativa</div>
                        ) : (
                          <div className={`${styles.statusBadge} ${styles.badge_error}`}><span className={styles.badgeDot}/> Inativa</div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {f.ativo && (
                          <button onClick={() => inativarFaixa(f.id)} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                            Inativar
                          </button>
                        )}
                        <button onClick={() => setFaixaDetalhes(f)} title="Detalhes da faixa" style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          ℹ️
                        </button>
                      </td>
                    </tr>
                  ))}
                  {faixas.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280' }}>
                        Nenhuma faixa cadastrada ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {/* Modal de Detalhes da Faixa */}
      {faixaDetalhes && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Detalhes: {faixaDetalhes.lote}</h2>
            <p style={{ margin: '0 0 1rem 0', color: '#6b7280', fontSize: '0.875rem' }}>Listagem de números gerados na faixa (Exibindo até 2000 itens se a faixa for muito grande).</p>
            
            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ padding: '0.75rem' }}>Número APAC</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {gerarListaNumeros(faixaDetalhes).map(item => (
                    <tr key={item.numero} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace' }}>{item.numeroAPAC}</td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        {item.utilizado 
                          ? <span style={{ color: '#ef4444', background: '#fef2f2', padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>✕ Utilizado</span>
                          : <span style={{ color: '#008E7B', background: '#e0f6f4', padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>✓ Disponível</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button 
                onClick={() => setFaixaDetalhes(null)}
                style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
