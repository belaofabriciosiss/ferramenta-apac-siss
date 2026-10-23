import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { validarCNS } from '../utils/apacUtils'
import { EMISSORES } from '../constants/emissores'
import { CLIENTES } from '../constants/clientes'
import styles from '../App.module.css'

export default function CadastrarEstabelecimento() {
  const [cliente, setCliente] = useState('')
  const [cnes, setCnes] = useState('')
  const [estabelecimentoOrigem, setEstabelecimentoOrigem] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [orgaoDestino, setOrgaoDestino] = useState('')
  const [indicadorDestino, setIndicadorDestino] = useState('M')
  const [codigoEmissor, setCodigoEmissor] = useState(EMISSORES[0]?.codigo || '')
  
  const [profissional, setProfissional] = useState('')
  const [cnsAutorizador, setCnsAutorizador] = useState('')
  const [cboProfissional, setCboProfissional] = useState('')

  const [estabelecimentos, setEstabelecimentos] = useState([])
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState(null)
  const [editandoId, setEditandoId] = useState(null)
  const [itemParaExcluir, setItemParaExcluir] = useState(null)

  useEffect(() => {
    carregarEstabelecimentos()
  }, [])

  async function carregarEstabelecimentos() {
    const { data, error } = await supabase
      .from('estabelecimentos')
      .select('*')
      .order('cliente', { ascending: true })
      .order('estabelecimento_origem', { ascending: true })

    if (!error && data) {
      setEstabelecimentos(data)
    }
  }

  function limparFormulario() {
    setCliente('')
    setCnes('')
    setEstabelecimentoOrigem('')
    setCnpj('')
    setOrgaoDestino('')
    setIndicadorDestino('M')
    setCodigoEmissor(EMISSORES[0]?.codigo || '')
    setProfissional('')
    setCnsAutorizador('')
    setCboProfissional('')
    setEditandoId(null)
  }

  function handleEditar(item) {
    setEditandoId(item.id)
    setCliente(item.cliente || '')
    setCnes(item.cnes || '')
    setEstabelecimentoOrigem(item.estabelecimento_origem || '')
    setCnpj(item.cnpj || '')
    setOrgaoDestino(item.orgao_destino || '')
    setIndicadorDestino(item.indicador_destino || 'M')
    setCodigoEmissor(item.codigo_emissor || EMISSORES[0]?.codigo || '')
    setProfissional(item.profissional_nome || '')
    setCnsAutorizador(item.profissional_cns || '')
    setCboProfissional(item.profissional_cbo || '')
    setMensagem(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMensagem(null)

    if (!cliente) {
      setMensagem({ tipo: 'error', texto: 'Selecione o Cliente / Município.' })
      return
    }

    const cnesClean = cnes.replace(/\D/g, '')
    if (cnesClean.length !== 6) {
      setMensagem({ tipo: 'error', texto: 'CNES deve conter exatamente 6 dígitos numéricos (sem o último dígito verificador).' })
      return
    }

    if (!estabelecimentoOrigem.trim()) {
      setMensagem({ tipo: 'error', texto: 'Informe o Estabelecimento Origem.' })
      return
    }

    const cnpjClean = cnpj.replace(/\D/g, '')
    if (cnpjClean.length !== 14) {
      setMensagem({ tipo: 'error', texto: 'CNPJ deve conter 14 dígitos numéricos.' })
      return
    }

    if (!orgaoDestino.trim()) {
      setMensagem({ tipo: 'error', texto: 'Informe a Secretaria de Saúde (Órgão Destino).' })
      return
    }

    if (!codigoEmissor) {
      setMensagem({ tipo: 'error', texto: 'Selecione o Código do Emissor.' })
      return
    }

    if (!profissional.trim()) {
      setMensagem({ tipo: 'error', texto: 'Informe o Nome Completo do Profissional Autorizador.' })
      return
    }

    const cnsClean = cnsAutorizador.replace(/\D/g, '')
    if (cnsClean.length !== 15 || !validarCNS(cnsClean)) {
      setMensagem({ tipo: 'error', texto: 'CNS do Profissional deve conter exatamente 15 dígitos numéricos válidos.' })
      return
    }

    const cboClean = cboProfissional.replace(/\D/g, '')
    if (cboClean.length !== 6) {
      setMensagem({ tipo: 'error', texto: 'CBO do Profissional deve conter exatamente 6 dígitos numéricos.' })
      return
    }

    setLoading(true)

    const registro = {
      cliente,
      cnes: cnesClean,
      estabelecimento_origem: estabelecimentoOrigem.trim(),
      cnpj: cnpjClean,
      orgao_destino: orgaoDestino.trim(),
      indicador_destino: indicadorDestino,
      codigo_emissor: codigoEmissor,
      profissional_nome: profissional.trim().toUpperCase(),
      profissional_cns: cnsClean,
      profissional_cbo: cboClean
    }

    let error
    if (editandoId) {
      const res = await supabase.from('estabelecimentos').update(registro).eq('id', editandoId)
      error = res.error
    } else {
      const res = await supabase.from('estabelecimentos').insert([registro])
      error = res.error
    }

    if (error) {
      setMensagem({ tipo: 'error', texto: 'Erro ao salvar estabelecimento: ' + error.message })
    } else {
      setMensagem({
        tipo: 'success',
        texto: editandoId ? 'Estabelecimento atualizado com sucesso!' : 'Estabelecimento cadastrado com sucesso!'
      })
      limparFormulario()
      carregarEstabelecimentos()
    }

    setLoading(false)
  }

  async function confirmarExclusao() {
    if (!itemParaExcluir) return
    const { error } = await supabase.from('estabelecimentos').delete().eq('id', itemParaExcluir.id)
    if (error) {
      setMensagem({ tipo: 'error', texto: 'Erro ao excluir: ' + error.message })
    } else {
      setMensagem({ tipo: 'success', texto: 'Estabelecimento removido com sucesso!' })
      if (editandoId === itemParaExcluir.id) limparFormulario()
      carregarEstabelecimentos()
    }
    setItemParaExcluir(null)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerText}>
            <h1 className={styles.headerTitle}>Cadastro de Estabelecimento</h1>
            <p className={styles.headerSub}>Cadastre os dados de cabeçalho e autorizador vinculados a cada Cliente para preenchimento automático.</p>
          </div>
        </div>
      </header>

      <main className={styles.main} style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div className={styles.card}>
          <section className={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className={styles.sectionTitle}>
                {editandoId ? 'Editar Estabelecimento' : 'Novo Estabelecimento'}
              </h2>
              {editandoId && (
                <button
                  type="button"
                  onClick={limparFormulario}
                  style={{
                    background: 'transparent',
                    border: '1px solid #D8E3EB',
                    color: '#657D93',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Linha 1: Cliente, CNES e Estabelecimento Origem */}
              <div className={styles.fieldsRow}>
                <div className={styles.fieldGroup} style={{ flex: '0 0 240px' }}>
                  <label className={styles.fieldLabel}>Cliente *</label>
                  <select
                    className={styles.input}
                    value={cliente}
                    onChange={e => setCliente(e.target.value)}
                    style={{ fontWeight: '600' }}
                  >
                    <option value="">-- Selecione o Cliente --</option>
                    {CLIENTES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.fieldGroup} style={{ flex: '0 0 160px' }}>
                  <label className={styles.fieldLabel}>CNES (6 dígitos) *</label>
                  <input
                    type="text"
                    maxLength={6}
                    className={`${styles.input} ${styles.inputMono}`}
                    value={cnes}
                    onChange={e => setCnes(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Ex: 278500"
                  />
                  <span className={styles.fieldSublabel}>Sem o DV</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Estabelecimento Origem *</label>
                  <input
                    type="text"
                    maxLength={30}
                    className={styles.input}
                    value={estabelecimentoOrigem}
                    onChange={e => setEstabelecimentoOrigem(e.target.value)}
                    placeholder="Ex: CENTRO CLINICO GUARULHOS"
                  />
                </div>
              </div>

              {/* Linha 2: CNPJ, Órgão Destino, Tipo e Emissor */}
              <div className={styles.fieldsRow}>
                <div className={styles.fieldGroup} style={{ flex: '0 0 220px' }}>
                  <label className={styles.fieldLabel}>CNPJ do Prestador *</label>
                  <input
                    type="text"
                    maxLength={14}
                    className={`${styles.input} ${styles.inputMono}`}
                    value={cnpj}
                    onChange={e => setCnpj(e.target.value.replace(/\D/g, '').slice(0, 14))}
                    placeholder="Apenas 14 números"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Secretaria de Saúde (Órgão Destino) *</label>
                  <input
                    type="text"
                    maxLength={40}
                    className={styles.input}
                    value={orgaoDestino}
                    onChange={e => setOrgaoDestino(e.target.value)}
                    placeholder="Ex: SECRETARIA MUNICIPAL DE SAUDE"
                  />
                </div>
              </div>

              <div className={styles.fieldsRow}>
                <div className={styles.fieldGroup} style={{ flex: '0 0 220px' }}>
                  <label className={styles.fieldLabel}>Órgão Destino (M/E) *</label>
                  <select
                    className={styles.input}
                    value={indicadorDestino}
                    onChange={e => setIndicadorDestino(e.target.value)}
                  >
                    <option value="M">M - Municipal</option>
                    <option value="E">E - Estadual</option>
                  </select>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Código do Emissor *</label>
                  <select
                    className={styles.input}
                    value={codigoEmissor}
                    onChange={e => setCodigoEmissor(e.target.value)}
                  >
                    {EMISSORES.map(e => (
                      <option key={e.codigo} value={e.codigo}>
                        {e.municipio} - {e.codigo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ margin: '0.5rem 0', borderTop: '1px dashed #E6EFF3', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#008E7B', letterSpacing: '0.02em' }}>
                  DADOS DO PROFISSIONAL AUTORIZADOR
                </span>
              </div>

              {/* Linha 3: Profissional */}
              <div className={styles.fieldsRow}>
                <div className={styles.fieldGroup} style={{ flex: 2 }}>
                  <label className={styles.fieldLabel}>Profissional Autorizador Nome Completo *</label>
                  <input
                    type="text"
                    maxLength={30}
                    className={styles.input}
                    value={profissional}
                    onChange={e => setProfissional(e.target.value)}
                    placeholder="Ex: LUIZ FERNANDO DE CASTRO"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>CNS do Autorizador (15 dígitos) *</label>
                  <input
                    type="text"
                    maxLength={15}
                    className={`${styles.input} ${styles.inputMono}`}
                    value={cnsAutorizador}
                    onChange={e => setCnsAutorizador(e.target.value.replace(/\D/g, '').slice(0, 15))}
                    placeholder="705189832461140"
                  />
                </div>
                <div className={styles.fieldGroup} style={{ flex: '0 0 160px' }}>
                  <label className={styles.fieldLabel}>CBO (6 dígitos) *</label>
                  <input
                    type="text"
                    maxLength={6}
                    className={`${styles.input} ${styles.inputMono}`}
                    value={cboProfissional}
                    onChange={e => setCboProfissional(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="225120"
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

              <div className={styles.actions} style={{ marginTop: '0.5rem' }}>
                <button type="submit" className={styles.btnGerar} disabled={loading}>
                  {loading ? 'Salvando...' : editandoId ? 'Atualizar Estabelecimento' : 'Salvar Estabelecimento'}
                </button>
              </div>
            </form>
          </section>

          <div className={styles.divider} />

          {/* Tabela de Estabelecimentos */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Estabelecimentos Cadastrados ({estabelecimentos.length})</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E6EFF3', color: '#657D93' }}>
                    <th style={{ padding: '0.75rem' }}>Cliente</th>
                    <th style={{ padding: '0.75rem' }}>CNES</th>
                    <th style={{ padding: '0.75rem' }}>Estabelecimento Origem</th>
                    <th style={{ padding: '0.75rem' }}>CNPJ</th>
                    <th style={{ padding: '0.75rem' }}>Destino / Emissor</th>
                    <th style={{ padding: '0.75rem' }}>Profissional</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {estabelecimentos.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #E6EFF3' }}>
                      <td style={{ padding: '0.75rem', fontWeight: '700', color: '#17324D' }}>
                        <span style={{ background: '#E6EFF3', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                          {item.cliente || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: '700', color: '#008E7B' }}>
                        {item.cnes}
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: '600', color: '#17324D' }}>
                        {item.estabelecimento_origem}
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>
                        {item.cnpj}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                        <div>{item.orgao_destino} ({item.indicador_destino})</div>
                        <div style={{ color: '#657D93' }}>Emissor: {item.codigo_emissor}</div>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                        <div style={{ fontWeight: '600' }}>{item.profissional_nome}</div>
                        <div style={{ color: '#657D93', fontFamily: 'monospace' }}>
                          CNS: {item.profissional_cns} • CBO: {item.profissional_cbo}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => handleEditar(item)}
                            title="Editar estabelecimento"
                            style={{
                              background: '#EFFFF6',
                              border: '1px solid #008E7B',
                              color: '#008E7B',
                              padding: '0.3rem 0.55rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemParaExcluir(item)}
                            title="Excluir estabelecimento"
                            style={{
                              background: '#FEF2F2',
                              border: '1px solid #FECACA',
                              color: '#DC2626',
                              padding: '0.3rem 0.55rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {estabelecimentos.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#657D93' }}>
                        Nenhum estabelecimento cadastrado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {/* Modal de confirmação de exclusão */}
      {itemParaExcluir && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '440px' }}>
            <h3 style={{ marginTop: 0, color: '#17324D' }}>Confirmar Exclusão</h3>
            <p style={{ color: '#657D93', fontSize: '0.9rem' }}>
              Deseja realmente excluir o cadastro do estabelecimento <strong>{itemParaExcluir.estabelecimento_origem}</strong> ({itemParaExcluir.cliente} - CNES: {itemParaExcluir.cnes})?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setItemParaExcluir(null)}
                style={{ background: '#E6EFF3', color: '#17324D', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExclusao}
                style={{ background: '#DC2626', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
