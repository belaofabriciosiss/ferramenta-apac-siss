import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { parsearAPAC, calcularDV, formatarAPAC } from '../utils/apacUtils'
import styles from '../App.module.css'

export default function CadastrarFaixa() {
  const [lote, setLote] = useState('')
  const [estabelecimento, setEstabelecimento] = useState('')
  // Múltiplas sequências para o mesmo lote
  const [sequencias, setSequencias] = useState([{ de: '', ate: '' }])
  
  const [faixas, setFaixas] = useState([])
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState(null)
  
  const [faixaDetalhes, setFaixaDetalhes] = useState(null)
  const [faixaParaExcluir, setFaixaParaExcluir] = useState(null)
  const [numerosSelecionados, setNumerosSelecionados] = useState([])
  const [processandoExclusao, setProcessandoExclusao] = useState(false)
  
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

  function adicionarSequencia() {
    setSequencias(prev => [...prev, { de: '', ate: '' }])
  }

  function removerSequencia(index) {
    if (sequencias.length <= 1) return
    setSequencias(prev => prev.filter((_, i) => i !== index))
  }

  function atualizarSequencia(index, campo, valor) {
    setSequencias(prev => prev.map((seq, i) => i === index ? { ...seq, [campo]: valor } : seq))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMensagem(null)
    
    if (!lote.trim()) {
      setMensagem({ tipo: 'error', texto: 'Informe o Lote' })
      return
    }

    if (sequencias.length === 0) {
      setMensagem({ tipo: 'error', texto: 'Adicione pelo menos uma sequência de numeração.' })
      return
    }

    const registrosParaInserir = []

    for (let i = 0; i < sequencias.length; i++) {
      const seq = sequencias[i]
      const parseDe = seq.de.trim() ? parsearAPAC(seq.de.trim()) : null
      const parseAte = seq.ate.trim() ? parsearAPAC(seq.ate.trim()) : null

      if (!parseDe || !parseAte) {
        setMensagem({ tipo: 'error', texto: `Sequência ${i + 1}: Verifique as numerações de APAC. Precisam ter 13 dígitos.` })
        return
      }

      const inicio = BigInt(parseDe.base12)
      const fim = BigInt(parseAte.base12)

      if (fim < inicio) {
        setMensagem({ tipo: 'error', texto: `Sequência ${i + 1}: A numeração final deve ser maior ou igual à inicial.` })
        return
      }

      const total = Number(fim - inicio) + 1

      registrosParaInserir.push({
        lote: lote.trim(),
        estabelecimento: estabelecimento.trim() || null,
        numero_inicial: inicio.toString(),
        numero_final: fim.toString(),
        proximo_numero: inicio.toString(),
        total_numeros: total,
        numeros_restantes: total,
        numeros_excluidos: [],
        ativo: true
      })
    }

    setLoading(true)

    const { error } = await supabase.from('faixas_apac').insert(registrosParaInserir)

    if (error) {
      setMensagem({ tipo: 'error', texto: 'Erro ao salvar: ' + error.message })
    } else {
      setMensagem({ 
        tipo: 'success', 
        texto: registrosParaInserir.length > 1 
          ? `${registrosParaInserir.length} sequências cadastradas com sucesso para o lote!` 
          : 'Faixa cadastrada com sucesso!' 
      })
      setLote('')
      setEstabelecimento('')
      setSequencias([{ de: '', ate: '' }])
      carregarFaixas()
    }
    
    setLoading(false)
  }

  async function inativarFaixa(id) {
    if(!confirm("Tem certeza que deseja inativar esta faixa?")) return
    await supabase.from('faixas_apac').update({ ativo: false }).eq('id', id)
    carregarFaixas()
  }

  async function ativarFaixa(faixa) {
    if(!confirm("Deseja reativar esta faixa? Todos os números voltarão a ficar disponíveis.")) return
    await supabase.from('faixas_apac').update({
      ativo: true,
      proximo_numero: faixa.numero_inicial,
      numeros_restantes: faixa.total_numeros,
      numeros_excluidos: []
    }).eq('id', faixa.id)
    carregarFaixas()
  }

  async function confirmarExclusao() {
    if (!faixaParaExcluir) return
    await supabase.from('faixas_apac').delete().eq('id', faixaParaExcluir.id)
    setFaixaParaExcluir(null)
    carregarFaixas()
  }

  function gerarListaNumeros(faixa) {
    if (!faixa) return []
    const lista = []
    const maxToRender = 2000
    
    let atual = BigInt(faixa.numero_inicial)
    const final = BigInt(faixa.numero_final)
    const proximo = BigInt(faixa.proximo_numero)
    const excluidosSet = new Set((faixa.numeros_excluidos || []).map(String))
    let count = 0
    
    while (atual <= final && count < maxToRender) {
      const base12 = String(atual).padStart(12, '0')
      const dv = calcularDV(base12)
      const numeroAPAC = formatarAPAC(base12, dv)
      const numStr = String(atual)
      
      const cancelado = excluidosSet.has(numStr)
      const utilizado = !cancelado && atual < proximo
      const disponivel = !cancelado && !utilizado
      
      lista.push({
        numero: numStr,
        numeroAPAC,
        utilizado,
        cancelado,
        disponivel
      })
      
      atual++
      count++
    }
    return lista
  }

  async function cancelarNumeracoes(faixa, numerosParaCancelar) {
    if (!numerosParaCancelar || numerosParaCancelar.length === 0) return
    const msg = numerosParaCancelar.length === 1
      ? 'Deseja realmente cancelar esta numeração? Ela não será utilizada na geração de APAC.'
      : `Deseja realmente cancelar as ${numerosParaCancelar.length} numerações selecionadas? Elas não serão utilizadas na geração de APAC.`
    if (!confirm(msg)) return

    setProcessandoExclusao(true)
    try {
      const anteriores = (faixa.numeros_excluidos || []).map(String)
      const novoExcluidos = Array.from(new Set([...anteriores, ...numerosParaCancelar.map(String)]))
      
      // Recalcula números restantes com base nos números não cancelados que ainda estão à frente ou iguais a proximo_numero
      const excluidosSet = new Set(novoExcluidos)
      let restantes = 0
      let cur = BigInt(faixa.proximo_numero)
      const final = BigInt(faixa.numero_final)
      while (cur <= final) {
        if (!excluidosSet.has(String(cur))) {
          restantes++
        }
        cur++
      }

      // Se o próximo número atual está na lista de excluídos, avança proximo_numero até o próximo disponível
      let novoProximo = BigInt(faixa.proximo_numero)
      while (excluidosSet.has(String(novoProximo)) && novoProximo <= final) {
        novoProximo++
      }

      const updateData = {
        numeros_excluidos: novoExcluidos,
        numeros_restantes: restantes,
        proximo_numero: String(novoProximo),
        ativo: restantes > 0
      }

      const { error } = await supabase.from('faixas_apac').update(updateData).eq('id', faixa.id)
      if (error) {
        alert('Erro ao cancelar numerações: ' + error.message)
      } else {
        const faixaAtualizada = { ...faixa, ...updateData }
        setFaixaDetalhes(faixaAtualizada)
        setNumerosSelecionados([])
        carregarFaixas()
      }
    } finally {
      setProcessandoExclusao(false)
    }
  }

  function toggleSelecionarNumero(numero) {
    setNumerosSelecionados(prev => 
      prev.includes(numero) ? prev.filter(n => n !== numero) : [...prev, numero]
    )
  }

  function toggleSelecionarTodos(disponiveis) {
    const todosDisponiveisNumeros = disponiveis.map(d => d.numero)
    const todosJaSelecionados = todosDisponiveisNumeros.length > 0 && 
      todosDisponiveisNumeros.every(num => numerosSelecionados.includes(num))

    if (todosJaSelecionados) {
      setNumerosSelecionados([])
    } else {
      setNumerosSelecionados(todosDisponiveisNumeros)
    }
  }

  return (
    <div className={styles.page}>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                    Sequências Numéricas {sequencias.length > 1 ? `(${sequencias.length})` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={adicionarSequencia}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: '#e0f6f4',
                      color: '#008E7B',
                      border: '1px solid #008E7B',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                    title="Adicionar mais uma sequência numérica a este lote"
                  >
                    <span>＋</span> Adicionar Sequência
                  </button>
                </div>

                {sequencias.map((seq, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      padding: sequencias.length > 1 ? '1rem' : '0', 
                      background: sequencias.length > 1 ? '#f9fafb' : 'transparent',
                      border: sequencias.length > 1 ? '1px solid #e5e7eb' : 'none',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    {sequencias.length > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#6b7280' }}>
                          Sequência #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removerSequencia(idx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '0.2rem 0.5rem'
                          }}
                        >
                          ✕ Remover
                        </button>
                      </div>
                    )}
                    <div className={styles.fieldsRow}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Número Inicial *</label>
                        <input 
                          type="text" 
                          className={`${styles.input} ${styles.inputMono}`} 
                          value={seq.de} 
                          onChange={e => atualizarSequencia(idx, 'de', e.target.value)} 
                          placeholder="123456789012-3"
                        />
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Número Final *</label>
                        <input 
                          type="text" 
                          className={`${styles.input} ${styles.inputMono}`} 
                          value={seq.ate} 
                          onChange={e => atualizarSequencia(idx, 'ate', e.target.value)} 
                          placeholder="123456789012-9"
                        />
                      </div>
                    </div>
                  </div>
                ))}
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
                        {f.ativo ? (
                          <button onClick={() => inativarFaixa(f.id)} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                            Inativar
                          </button>
                        ) : (
                          <button onClick={() => ativarFaixa(f)} style={{ background: 'transparent', border: '1px solid #008E7B', color: '#008E7B', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                            Ativar
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setNumerosSelecionados([])
                            setFaixaDetalhes(f)
                          }} 
                          title="Detalhes da faixa" 
                          style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                        >
                          ℹ️
                        </button>
                        <button onClick={() => setFaixaParaExcluir(f)} title="Excluir faixa" style={{ background: 'transparent', border: '1px solid #dc2626', color: '#dc2626', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>
                          🗑
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
      {faixaDetalhes && (() => {
        const lista = gerarListaNumeros(faixaDetalhes)
        const disponiveis = lista.filter(item => item.disponivel)
        const todosDisponiveisSelecionados = disponiveis.length > 0 && 
          disponiveis.every(item => numerosSelecionados.includes(item.numero))
        const temSelecionados = numerosSelecionados.length > 0

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '720px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <h2 style={{ margin: 0, marginBottom: '0.25rem' }}>Detalhes: {faixaDetalhes.lote}</h2>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
                    {faixaDetalhes.estabelecimento ? `${faixaDetalhes.estabelecimento} • ` : ''}
                    Listagem de números da faixa (Exibindo até 2000 itens).
                  </p>
                </div>
                {temSelecionados && (
                  <button
                    onClick={() => cancelarNumeracoes(faixaDetalhes, numerosSelecionados)}
                    disabled={processandoExclusao}
                    style={{
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      padding: '0.45rem 0.9rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    🗑 Cancelar Selecionados ({numerosSelecionados.length})
                  </button>
                )}
              </div>
              
              <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #e5e7eb', borderRadius: '8px', marginTop: '0.75rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', zIndex: 2 }}>
                    <tr>
                      <th style={{ padding: '0.75rem', width: '44px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={todosDisponiveisSelecionados}
                          disabled={disponiveis.length === 0}
                          onChange={() => toggleSelecionarTodos(disponiveis)}
                          title="Selecionar todos os números disponíveis"
                          style={{ cursor: disponiveis.length === 0 ? 'not-allowed' : 'pointer' }}
                        />
                      </th>
                      <th style={{ padding: '0.75rem' }}>Número APAC</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem', width: '70px', textAlign: 'center' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map(item => (
                      <tr 
                        key={item.numero} 
                        style={{ 
                          borderBottom: '1px solid #e5e7eb',
                          backgroundColor: numerosSelecionados.includes(item.numero) ? '#fef2f2' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                          {item.disponivel ? (
                            <input
                              type="checkbox"
                              checked={numerosSelecionados.includes(item.numero)}
                              onChange={() => toggleSelecionarNumero(item.numero)}
                              style={{ cursor: 'pointer' }}
                            />
                          ) : (
                            <input
                              type="checkbox"
                              disabled
                              style={{ cursor: 'not-allowed', opacity: 0.3 }}
                            />
                          )}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontWeight: '500' }}>
                          {item.numeroAPAC}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          {item.cancelado ? (
                            <span style={{ color: '#6b7280', background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
                              ✕ Cancelada
                            </span>
                          ) : item.utilizado ? (
                            <span style={{ color: '#ef4444', background: '#fef2f2', padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
                              ✕ Utilizado
                            </span>
                          ) : (
                            <span style={{ color: '#008E7B', background: '#e0f6f4', padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
                              ✓ Disponível
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                          {item.disponivel ? (
                            <button
                              onClick={() => cancelarNumeracoes(faixaDetalhes, [item.numero])}
                              disabled={processandoExclusao}
                              title="Cancelar esta numeração"
                              style={{
                                background: 'transparent',
                                border: '1px solid #ef4444',
                                color: '#ef4444',
                                padding: '0.2rem 0.45rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              🗑
                            </button>
                          ) : (
                            <span style={{ color: '#d1d5db', fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  {disponiveis.length} disponível(is) • {numerosSelecionados.length} selecionado(s)
                </span>
                <button
                  onClick={() => {
                    setFaixaDetalhes(null)
                    setNumerosSelecionados([])
                  }}
                  style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '0.7rem 1.4rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal de Confirmação de Exclusão */}
      {faixaParaExcluir && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem' }}>⚠️</span>
              <h2 style={{ margin: 0, color: '#dc2626', fontSize: '1.25rem' }}>Confirmar Exclusão</h2>
            </div>
            <p style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>
              Você está prestes a excluir permanentemente a faixa:
            </p>
            <p style={{ margin: '0 0 1rem 0', fontWeight: '700', color: '#111827', background: '#f3f4f6', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
              {faixaParaExcluir.lote} {faixaParaExcluir.estabelecimento ? `(${faixaParaExcluir.estabelecimento})` : ''}
            </p>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>
              <p style={{ margin: 0, color: '#991b1b', fontSize: '0.875rem', fontWeight: '500' }}>
                🔴 Esta ação é <strong>irreversível</strong>. O registro será removido permanentemente do banco de dados e não poderá ser recuperado.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setFaixaParaExcluir(null)}
                style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                style={{ background: '#dc2626', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >
                Sim, excluir permanentemente
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
