import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'
import { calcularDV, validarCNS } from '../utils/apacUtils'
import { gerarLinha01, gerarLinha14, gerarLinha06, gerarLinhas13, getProcedimentos13Completo, normalizarProcedimento, getExtensaoMes, deveIncluirFixo0301 } from '../utils/txtGenerator'
import { executarConsistencia } from '../utils/consistenciaValidator'
import { gerarScriptExportarId } from '../utils/exportarIdGenerator'
import { EMISSORES } from '../constants/emissores'
import styles from '../App.module.css'

function getUltimosMeses() {
  const meses = []
  const hoje = new Date()
  for (let i = 0; i < 4; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const ano = d.getFullYear()
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    meses.push(`${ano}${mes}`)
  }
  return meses
}

function InputField({ label, sublabel, id, children, error }) {
  return (
    <div className={styles.fieldGroup}>
      <label className={styles.fieldLabel} htmlFor={id}>
        {label}
        {sublabel && <span className={styles.fieldSublabel}>{sublabel}</span>}
      </label>
      {children}
      {error && <span className={styles.fieldError}>{error}</span>}
    </div>
  )
}

export default function GerarAPAC() {
  const fileInputRef = useRef(null)

  const [planilha, setPlanilha] = useState(null)
  
  const mesesDisponiveis = getUltimosMeses()
  
  const [competencia, setCompetencia] = useState(mesesDisponiveis[0])
  const [dataGeracao, setDataGeracao] = useState(`${mesesDisponiveis[0]}01`)
  const [orgaoOrigem, setOrgaoOrigem] = useState('')
  const [cnes, setCnes] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [orgaoDestino, setOrgaoDestino] = useState('')
  const [indicadorDestino, setIndicadorDestino] = useState('M')
  const [codigoEmissor, setCodigoEmissor] = useState(EMISSORES[0]?.codigo || '')

  const [profissional, setProfissional] = useState('')
  const [cnsAutorizador, setCnsAutorizador] = useState('')
  const [cboProfissional, setCboProfissional] = useState('')
  
  const [faixas, setFaixas] = useState([])
  const [faixaSelecionadaId, setFaixaSelecionadaId] = useState('')
  const [modoNumeracao, setModoNumeracao] = useState('faixa') // 'faixa' | 'planilha'
  const [modoProfissional, setModoProfissional] = useState('manual') // 'manual' | 'planilha'

  const [erros, setErros] = useState({})
  const [mensagem, setMensagem] = useState(null)
  const [gerando, setGerando] = useState(false)
  const [consistindo, setConsistindo] = useState(false)
  const [exportandoId, setExportandoId] = useState(false)

  useEffect(() => {
    carregarFaixas()
    const saved = localStorage.getItem('apac_form_data')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.competencia && mesesDisponiveis.includes(data.competencia)) setCompetencia(data.competencia)
        if (data.dataGeracao) setDataGeracao(data.dataGeracao)
        if (data.orgaoOrigem) setOrgaoOrigem(data.orgaoOrigem)
        if (data.cnes) setCnes(data.cnes)
        if (data.cnpj) setCnpj(data.cnpj)
        if (data.orgaoDestino) setOrgaoDestino(data.orgaoDestino)
        if (data.indicadorDestino) setIndicadorDestino(data.indicadorDestino)
        if (data.codigoEmissor) setCodigoEmissor(data.codigoEmissor)
        if (data.profissional) setProfissional(data.profissional)
        if (data.cnsAutorizador) setCnsAutorizador(data.cnsAutorizador)
        if (data.cboProfissional) setCboProfissional(data.cboProfissional)
        if (data.modoNumeracao) setModoNumeracao(data.modoNumeracao)
        if (data.modoProfissional) setModoProfissional(data.modoProfissional)
      } catch (e) {
        console.error('Erro ao ler localStorage', e)
      }
    }
  }, [])

  useEffect(() => {
    const dataToSave = {
      competencia, dataGeracao, orgaoOrigem, cnes, cnpj,
      orgaoDestino, indicadorDestino, codigoEmissor, profissional, cnsAutorizador,
      cboProfissional, modoNumeracao, modoProfissional
    }
    localStorage.setItem('apac_form_data', JSON.stringify(dataToSave))
  }, [competencia, dataGeracao, orgaoOrigem, cnes, cnpj, orgaoDestino, indicadorDestino, codigoEmissor, profissional, cnsAutorizador, cboProfissional, modoNumeracao, modoProfissional])

  async function carregarFaixas() {
    const { data } = await supabase
      .from('faixas_apac')
      .select('*')
      .eq('ativo', true)
      .order('criado_em', { ascending: false })
      
    if (data) setFaixas(data)
  }

  function handleArquivoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setMensagem(null)
    setErros(prev => ({ ...prev, planilha: null }))

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array', cellDates: true, raw: false })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const dados = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (dados.length === 0) {
          setErros(prev => ({ ...prev, planilha: 'A planilha está vazia ou sem dados.' }))
          return
        }
        setPlanilha({ nome: file.name, dados, qtdLinhas: dados.length })
      } catch {
        setErros(prev => ({ ...prev, planilha: 'Erro ao ler o arquivo. Verifique se é um .xlsx válido.' }))
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function validarFormulario() {
    const novosErros = {}

    if (!planilha) novosErros.planilha = 'Importe a planilha de atendimentos.'
    
    if (!competencia || competencia.length !== 6) novosErros.competencia = 'Obrigatório 6 dígitos (AAAAMM).'
    if (!dataGeracao || dataGeracao.length !== 8) novosErros.dataGeracao = 'Obrigatório 8 dígitos (AAAAMMDD).'
    if (!orgaoOrigem.trim()) novosErros.orgaoOrigem = 'Informe o Estabelecimento Origem.'
    if (!cnes || cnes.length !== 6) novosErros.cnes = 'Obrigatório 6 dígitos numéricos.'
    if (!cnpj || cnpj.length !== 14) novosErros.cnpj = 'Obrigatório 14 dígitos numéricos.'
    if (!orgaoDestino.trim()) novosErros.orgaoDestino = 'Informe a Secretaria / Órgão Destino.'
    if (!codigoEmissor) novosErros.codigoEmissor = 'Selecione o Código do Emissor.'

    if (modoProfissional === 'manual') {
      if (!profissional.trim()) novosErros.profissional = 'Informe o nome.'
      if (!cnsAutorizador.trim()) {
        novosErros.cns = 'Informe o CNS.'
      } else if (!validarCNS(cnsAutorizador)) {
        novosErros.cns = 'Exatamente 15 dígitos numéricos.'
      }
      if (!cboProfissional.trim()) {
        novosErros.cbo = 'Informe o CBO.'
      } else if (!/^\d{6}$/.test(cboProfissional)) {
        novosErros.cbo = 'Exatamente 6 dígitos numéricos.'
      }
    }

    if (modoNumeracao === 'faixa') {
      if (!faixaSelecionadaId) {
        novosErros.faixa = 'Selecione um lote de numeração.'
      } else {
        const faixa = faixas.find(f => f.id === faixaSelecionadaId)
        if (planilha && faixa.numeros_restantes < planilha.qtdLinhas) {
          novosErros.faixa = `O lote tem apenas ${faixa.numeros_restantes} números disponíveis. A planilha tem ${planilha.qtdLinhas} linhas.`
        }
      }
    }

    if (modoNumeracao === 'planilha' && planilha) {
      const semNumero = planilha.dados.every(row => {
        const raw = String(row['NUMERO APAC (12 DIGITOS E 1 DIGITO VERIFICADOR)'] || '').replace(/\D/g, '')
        return raw.length === 0
      })
      if (semNumero) {
        novosErros.apacPlanilha = 'Nenhum número APAC encontrado na planilha. Verifique a coluna "NUMERO APAC (12 DIGITOS E 1 DIGITO VERIFICADOR)" e corrija antes de exportar.'
      }
    }

    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  async function handleGerar() {
    setMensagem(null)
    if (!validarFormulario()) return

    setGerando(true)

    try {
      const faixa = modoNumeracao === 'faixa' ? faixas.find(f => f.id === faixaSelecionadaId) : null
      let curBase = faixa ? BigInt(faixa.proximo_numero) : 0n

      const cabecalho = {
        competencia, orgaoOrigem, cnes, cnpj, orgaoDestino, indicadorDestino, dataGeracao,
        codigoEmissor,
        nomeAutorizador: profissional.trim(),
        cnsAutorizador: cnsAutorizador.replace(/\s/g, ''),
        cboAutorizador: cboProfissional
      }

      let somaControle = BigInt(0)
      const atendimentos = []

      for (const linhaExcel of planilha.dados) {
        let numeroApac
        if (modoNumeracao === 'faixa') {
          const base12 = String(curBase).padStart(12, '0')
          const dv = calcularDV(base12)
          numeroApac = base12 + dv
          curBase++
        } else {
          // Lê diretamente da planilha e normaliza para 13 dígitos sem hífen
          const raw = String(linhaExcel['NUMERO APAC (12 DIGITOS E 1 DIGITO VERIFICADOR)'] || '').replace(/\D/g, '')
          numeroApac = raw.padStart(13, '0').slice(0, 13)
        }

        const proc14Norm = normalizarProcedimento(linhaExcel['PROCEDIMENTO_PRINCIPAL'])
        const procs13    = getProcedimentos13Completo(proc14Norm, linhaExcel)

        // Quantidade do proc fixo 0301010072: lida da planilha ou padrão 1
        const qty0301 = Math.max(1, parseInt(String(linhaExcel['QUANTIDADE_CONSULTA'] || '').replace(/\D/g, '')) || 1)

        // Regra: Σ(código tipo 13) + Σ(quantidade tipo 13) + número APAC
        // Linha 13 - proc principal: código + qty 1
        somaControle += BigInt(proc14Norm) + 1n
        // Linha 13 - proc fixo 0301010072: código + qty real (omitido para APAC sem o fixo)
        if (deveIncluirFixo0301(proc14Norm)) somaControle += 301010072n + BigInt(qty0301)
        // Linhas 13 - procs mapeados/dinâmicos: código + qty 1 cada
        for (const proc of procs13) somaControle += BigInt(normalizarProcedimento(proc)) + 1n
        // Linhas 13 - procs compatíveis (PROCEDIMENTO_COMPATIVEL): código + qty 1 cada
        const procsCompativeis = String(linhaExcel['PROCEDIMENTO_COMPATIVEL'] || '')
          .split(',')
          .map(s => normalizarProcedimento(s.trim()))
          .filter(s => s.replace(/0/g, '').length > 0)
        for (const proc of procsCompativeis) somaControle += BigInt(proc) + 1n
        // Número da APAC (linha 06)
        somaControle += BigInt(numeroApac)

        // Cabecalho base (campos fixos)
        // Campos do profissional são sobrescritos por linha se modoProfissional='planilha'
        const cabecalhoLinha = modoProfissional === 'planilha' ? {
          ...cabecalho,
          nomeAutorizador: String(linhaExcel['NOME PROFISSIONAL AUTORIZADOR'] || '').toUpperCase(),
          cnsAutorizador:  String(linhaExcel['CNS DO AUTORIZADOR'] || '').replace(/\D/g, ''),
          cboAutorizador:  String(linhaExcel['CBO DO AUTORIZADOR'] || '').replace(/\D/g, '')
        } : cabecalho

        atendimentos.push({ linhaExcel, numeroApac, cabecalhoLinha, qty0301 })
      }

      const qtdRegistros = atendimentos.length
      const valorControle = Number((somaControle % 1111n) + 1111n)

      let txt = ''
      txt += gerarLinha01(cabecalho, qtdRegistros, valorControle) + '\r\n'

      for (const item of atendimentos) {
        txt += gerarLinha14(item.linhaExcel, item.numeroApac, item.cabecalhoLinha) + '\r\n'
        txt += gerarLinha06(item.linhaExcel, item.numeroApac, item.cabecalhoLinha) + '\r\n'
        const linhas13 = gerarLinhas13(item.linhaExcel, item.numeroApac, item.cabecalhoLinha, item.qty0301)
        for (const l13 of linhas13) {
          txt += l13 + '\r\n'
        }
      }

      const nomeArquivo = `AP${cnes}.${getExtensaoMes(competencia)}`
      
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = nomeArquivo
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Atualiza banco apenas no modo faixa
      if (modoNumeracao === 'faixa' && faixa) {
        const novoRestantes = faixa.numeros_restantes - qtdRegistros
        await supabase.from('faixas_apac').update({
          proximo_numero: String(curBase),
          numeros_restantes: novoRestantes,
          ativo: novoRestantes > 0
        }).eq('id', faixa.id)
        carregarFaixas()
        if (novoRestantes <= 0) setFaixaSelecionadaId('')
      }

      setMensagem({
        tipo: 'success',
        texto: `Arquivo "${nomeArquivo}" exportado com sucesso! ${qtdRegistros} registro(s) processado(s).`
      })
      
    } catch (err) {
      setMensagem({ tipo: 'error', texto: `Erro ao gerar arquivo TXT: ${err.message}` })
    } finally {
      setGerando(false)
    }
  }

  function handleConsistencia() {
    if (!planilha) return
    setConsistindo(true)
    try {
      const relatorio = executarConsistencia(planilha.dados, planilha.nome)
      const blob = new Blob([relatorio], { type: 'text/plain;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `consistencia_${planilha.nome.replace(/\.xlsx$/i, '')}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } finally {
      setConsistindo(false)
    }
  }

  function handleExportarId() {
    if (!planilha) return
    setExportandoId(true)
    try {
      const { sql, total } = gerarScriptExportarId(planilha.dados)
      const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `script_update_${planilha.nome.replace(/\.xlsx$/i, '')}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } finally {
      setExportandoId(false)
    }
  }

  return (
    <div className={styles.page} style={{ marginLeft: '260px', width: 'auto', minHeight: '100vh' }}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerText}>
            <h1 className={styles.headerTitle}>Geração do Arquivo APAC</h1>
            <p className={styles.headerSub}>Preencha os dados e escolha um lote ativo para gerar o arquivo TXT de exportação.</p>
          </div>
        </div>
      </header>

      <main className={styles.main} style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div className={styles.card}>
          
          {/* Seção 1 — Planilha */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>01</span>
              <div>
                <h2 className={styles.sectionTitle}>Planilha de Atendimentos</h2>
                <p className={styles.sectionDesc}>Importe o arquivo exportado do sistema SISS (.xlsx)</p>
              </div>
            </div>

            <InputField label="Arquivo de atendimentos" id="arquivo" error={erros.planilha}>
              <div
                className={`${styles.dropzone} ${planilha ? styles.dropzoneSuccess : ''} ${erros.planilha ? styles.dropzoneError : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const file = e.dataTransfer.files[0]
                  if (file) handleArquivoChange({ target: { files: [file] } })
                }}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className={styles.fileInputHidden} onChange={handleArquivoChange} />
                {planilha ? (
                  <div className={styles.dropzoneContent} style={{ width: '100%', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className={styles.dropzoneIcon}>✓</span>
                      <div>
                        <p className={styles.dropzoneName}>{planilha.nome}</p>
                        <p className={styles.dropzoneInfo}>{planilha.qtdLinhas} registro(s) encontrado(s)</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        setPlanilha(null)
                        setErros(prev => ({ ...prev, planilha: null }))
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      title="Remover planilha"
                      style={{
                        flexShrink: 0,
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#ef4444',
                        fontSize: '0.9rem',
                        fontWeight: '700',
                        lineHeight: 1,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className={styles.dropzoneContent}>
                    <span className={styles.dropzoneIconIdle}>⬆</span>
                    <div>
                      <p className={styles.dropzonePrompt}>Clique para selecionar ou arraste aqui</p>
                      <p className={styles.dropzoneHint}>Formato aceito: .xlsx</p>
                    </div>
                  </div>
                )}
              </div>
            </InputField>
          </section>

          {/* Botões de ação da planilha */}
          {planilha && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '0 0 0.5rem 0' }}>
              <button
                type="button"
                onClick={handleExportarId}
                disabled={exportandoId}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.65rem 1.4rem', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: '600', fontSize: '0.875rem', border: '2px solid #3b82f6',
                  background: exportandoId ? '#e5e7eb' : '#eff6ff', color: '#3b82f6',
                  transition: 'all 0.2s'
                }}
              >
                <span>🗂️</span>
                {exportandoId ? 'Gerando...' : 'EXPORTAR ID'}
              </button>
              <button
                type="button"
                onClick={handleConsistencia}
                disabled={consistindo}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.65rem 1.4rem', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: '600', fontSize: '0.875rem', border: '2px solid #008E7B',
                  background: consistindo ? '#e5e7eb' : '#f0fdf9', color: '#008E7B',
                  transition: 'all 0.2s'
                }}
              >
                <span>🔍</span>
                {consistindo ? 'Analisando...' : 'REALIZAR CONSISTÊNCIA'}
              </button>
            </div>
          )}

          <div className={styles.divider} />

          {/* Seção 2 — Cabeçalho */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>02</span>
              <div>
                <h2 className={styles.sectionTitle}>Dados do Cabeçalho DATASUS</h2>
                <p className={styles.sectionDesc}>Informações fixas exportadas no início do arquivo.</p>
              </div>
            </div>

            <div className={styles.fieldsRow}>
              <InputField label="Ano/Mês da Produção" sublabel="(AAAAMM)" id="competencia" error={erros.competencia}>
                <select 
                  id="competencia" 
                  className={styles.input} 
                  value={competencia} 
                  onChange={e => { 
                    const novaCompetencia = e.target.value;
                    setCompetencia(novaCompetencia); 
                    setDataGeracao(`${novaCompetencia}01`);
                    setErros(prev => ({ ...prev, competencia: null, dataGeracao: null }));
                  }}
                >
                  {mesesDisponiveis.map(mes => (
                    <option key={mes} value={mes}>{mes}</option>
                  ))}
                </select>
              </InputField>
              <InputField label="Data Geração Remessa" sublabel="(Primeiro dia do mês)" id="dataGen" error={erros.dataGeracao}>
                <input id="dataGen" type="text" className={`${styles.input} ${styles.inputMono} ${erros.dataGeracao ? styles.inputError : ''}`} placeholder="Ex: 20260301" maxLength={8} value={dataGeracao} readOnly style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280' }} />
              </InputField>
              <InputField label="CNES" sublabel="(6 dígitos numéricos sem último dígito)" id="cnes" error={erros.cnes}>
                <input id="cnes" type="text" className={`${styles.input} ${styles.inputMono} ${erros.cnes ? styles.inputError : ''}`} placeholder="443604" maxLength={6} value={cnes} onChange={e => { setCnes(e.target.value.replace(/\D/g, '').slice(0, 6)); setErros(prev => ({ ...prev, cnes: null })) }} />
              </InputField>
            </div>

            <div className={styles.fieldsRow} style={{ marginTop: '1rem' }}>
              <InputField label="Estabelecimento Origem" id="orgOrigem" error={erros.orgaoOrigem}>
                <input id="orgOrigem" type="text" className={`${styles.input} ${erros.orgaoOrigem ? styles.inputError : ''}`} placeholder="POUPA TEMPO DA SAUDE" value={orgaoOrigem} onChange={e => { setOrgaoOrigem(e.target.value.toUpperCase()); setErros(prev => ({ ...prev, orgaoOrigem: null })) }} />
              </InputField>
              <InputField label="CNPJ do Prestador" sublabel="(14 dígitos)" id="cnpj" error={erros.cnpj}>
                <input id="cnpj" type="text" className={`${styles.input} ${styles.inputMono} ${erros.cnpj ? styles.inputError : ''}`} placeholder="Somente números" maxLength={14} value={cnpj} onChange={e => { setCnpj(e.target.value.replace(/\D/g, '').slice(0, 14)); setErros(prev => ({ ...prev, cnpj: null })) }} />
              </InputField>
            </div>

            <div className={styles.fieldsRow} style={{ marginTop: '1rem' }}>
              <InputField label="Secretaria de Saúde" sublabel="(Órgão Destino)" id="orgDestino" error={erros.orgaoDestino}>
                <input id="orgDestino" type="text" className={`${styles.input} ${erros.orgaoDestino ? styles.inputError : ''}`} placeholder="SECRETARIA MUNICIPAL DE SAUDE" value={orgaoDestino} onChange={e => { setOrgaoDestino(e.target.value.toUpperCase()); setErros(prev => ({ ...prev, orgaoDestino: null })) }} />
              </InputField>
              <InputField label="Órgão Destino (M/E)" id="indDestino">
                <select className={styles.input} value={indicadorDestino} onChange={e => setIndicadorDestino(e.target.value)}>
                  <option value="M">M - Municipal</option>
                  <option value="E">E - Estadual</option>
                </select>
              </InputField>
              <InputField label="Código do Emissor" id="codigoEmissor" error={erros.codigoEmissor}>
                <select
                  id="codigoEmissor"
                  className={`${styles.input} ${erros.codigoEmissor ? styles.inputError : ''}`}
                  value={codigoEmissor}
                  onChange={e => { setCodigoEmissor(e.target.value); setErros(prev => ({ ...prev, codigoEmissor: null })) }}
                >
                  {EMISSORES.map(e => (
                    <option key={e.codigo} value={e.codigo}>{e.municipio} - {e.codigo}</option>
                  ))}
                </select>
              </InputField>
            </div>
          </section>

          <div className={styles.divider} />

          {/* Seção 3 — Profissional */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>03</span>
              <div>
                <h2 className={styles.sectionTitle}>Profissional Autorizador</h2>
                <p className={styles.sectionDesc}>Dados do profissional responsável pela autorização</p>
              </div>
            </div>

            {/* Seletor de modo */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setModoProfissional('manual')}
                style={{
                  flex: 1, padding: '1rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                  border: modoProfissional === 'manual' ? '2px solid #008E7B' : '2px solid #e5e7eb',
                  background: modoProfissional === 'manual' ? '#f0fdf9' : '#f9fafb',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontWeight: '700', color: modoProfissional === 'manual' ? '#008E7B' : '#374151', marginBottom: '0.25rem' }}>✏️ Digitar Manualmente</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Preencha os dados do profissional autorizador nos campos abaixo.</div>
              </button>
              <button
                type="button"
                onClick={() => setModoProfissional('planilha')}
                style={{
                  flex: 1, padding: '1rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                  border: modoProfissional === 'planilha' ? '2px solid #008E7B' : '2px solid #e5e7eb',
                  background: modoProfissional === 'planilha' ? '#f0fdf9' : '#f9fafb',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontWeight: '700', color: modoProfissional === 'planilha' ? '#008E7B' : '#374151', marginBottom: '0.25rem' }}>📄 Usar Dados da Planilha</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Os dados do autorizador serão lidos por linha das colunas da planilha.</div>
              </button>
            </div>

            {/* Campos manuais */}
            {modoProfissional === 'manual' && (
              <div className={styles.fieldsRow}>
                <InputField label="Nome completo" id="profissional" error={erros.profissional}>
                  <input id="profissional" type="text" className={`${styles.input} ${erros.profissional ? styles.inputError : ''}`} placeholder="Ex.: DRA. MARIA SILVA" value={profissional} onChange={e => { setProfissional(e.target.value.toUpperCase()); setErros(prev => ({ ...prev, profissional: null })) }} />
                </InputField>
                <InputField label="CNS do autorizador" sublabel="(15 dígitos)" id="cns" error={erros.cns}>
                  <input id="cns" type="text" className={`${styles.input} ${styles.inputMono} ${erros.cns ? styles.inputError : ''}`} placeholder="000000000000000" maxLength={15} value={cnsAutorizador} onChange={e => { setCnsAutorizador(e.target.value.replace(/\D/g, '').slice(0, 15)); setErros(prev => ({ ...prev, cns: null })) }} />
                </InputField>
                <InputField label="CBO" sublabel="(6 dígitos)" id="cbo" error={erros.cbo}>
                  <input id="cbo" type="text" className={`${styles.input} ${styles.inputMono} ${erros.cbo ? styles.inputError : ''}`} placeholder="000000" maxLength={6} value={cboProfissional} onChange={e => { setCboProfissional(e.target.value.replace(/\D/g, '').slice(0, 6)); setErros(prev => ({ ...prev, cbo: null })) }} />
                </InputField>
              </div>
            )}

            {/* Informação modo planilha */}
            {modoProfissional === 'planilha' && (
              <div style={{ background: '#f0fdf9', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem' }}>
                <p style={{ margin: 0, color: '#166534', fontSize: '0.875rem' }}>
                  ✓ Os dados do autorizador serão lidos por atendimento das colunas: <strong>NOME PROFISSIONAL AUTORIZADOR</strong>, <strong>CNS DO AUTORIZADOR</strong> e <strong>CBO DO AUTORIZADOR</strong>.
                </p>
              </div>
            )}
          </section>

          <div className={styles.divider} />

          {/* Seção 4 — Numeração APAC */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>04</span>
              <div>
                <h2 className={styles.sectionTitle}>Origem da Numeração APAC</h2>
                <p className={styles.sectionDesc}>Escolha como os números de APAC serão atribuídos neste arquivo.</p>
              </div>
            </div>

            {/* Seletor de modo */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => { setModoNumeracao('faixa'); setErros(prev => ({ ...prev, faixa: null })) }}
                style={{
                  flex: 1, padding: '1rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                  border: modoNumeracao === 'faixa' ? '2px solid #008E7B' : '2px solid #e5e7eb',
                  background: modoNumeracao === 'faixa' ? '#f0fdf9' : '#f9fafb',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontWeight: '700', color: modoNumeracao === 'faixa' ? '#008E7B' : '#374151', marginBottom: '0.25rem' }}>📋 Lote Cadastrado</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Usar uma faixa de numeração previamente cadastrada no sistema.</div>
              </button>
              <button
                type="button"
                onClick={() => { setModoNumeracao('planilha'); setErros(prev => ({ ...prev, faixa: null })) }}
                style={{
                  flex: 1, padding: '1rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                  border: modoNumeracao === 'planilha' ? '2px solid #008E7B' : '2px solid #e5e7eb',
                  background: modoNumeracao === 'planilha' ? '#f0fdf9' : '#f9fafb',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontWeight: '700', color: modoNumeracao === 'planilha' ? '#008E7B' : '#374151', marginBottom: '0.25rem' }}>📄 Numeração da Planilha</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Os números de APAC já estão preenchidos na coluna da planilha.</div>
              </button>
            </div>

            {/* Conteúdo condicional */}
            {modoNumeracao === 'faixa' && (
              <>
                <InputField label="Selecione o Lote" id="lote" error={erros.faixa}>
                  <select
                    className={`${styles.input} ${erros.faixa ? styles.inputError : ''}`}
                    value={faixaSelecionadaId}
                    onChange={e => { setFaixaSelecionadaId(e.target.value); setErros(prev => ({ ...prev, faixa: null })) }}
                  >
                    <option value="">-- Selecione uma faixa disponível --</option>
                    {faixas.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.lote} {f.estabelecimento ? `(${f.estabelecimento})` : ''} - Restam {f.numeros_restantes}
                      </option>
                    ))}
                  </select>
                </InputField>
                {faixas.length === 0 && (
                  <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>Nenhum lote ativo. Cadastre uma faixa no menu lateral.</p>
                )}
                {erros.faixa && (
                  <div className={styles.alertBox} style={{ marginTop: '1rem' }}>
                    <span className={styles.alertIcon}>⚠</span>
                    {erros.faixa}
                  </div>
                )}
              </>
            )}

            {modoNumeracao === 'planilha' && (
              <div>
                <div style={{ background: '#f0fdf9', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem' }}>
                  <p style={{ margin: 0, color: '#166534', fontSize: '0.875rem' }}>
                    ✓ Os números de APAC serão lidos diretamente da coluna <strong>NUMERO APAC (12 DIGITOS E 1 DIGITO VERIFICADOR)</strong> da planilha. Nenhum lote será debitado.
                  </p>
                </div>
                {erros.apacPlanilha && (
                  <div className={styles.alertBox} style={{ marginTop: '0.75rem' }}>
                    <span className={styles.alertIcon}>⚠</span>
                    {erros.apacPlanilha}
                  </div>
                )}
              </div>
            )}
          </section>

          <div className={styles.divider} />

          {mensagem && (
            <div className={`${styles.mensagem} ${styles[`mensagem_${mensagem.tipo}`]}`}>
              <span className={styles.mensagemIcon}>{mensagem.tipo === 'success' ? '✓' : '✕'}</span>
              {mensagem.texto}
            </div>
          )}

          <div className={styles.actions}>
            <button className={`${styles.btnGerar} ${gerando ? styles.btnGerando : ''}`} onClick={handleGerar} disabled={gerando || (modoNumeracao === 'faixa' && faixas.length === 0)}>
              {gerando ? (<><span className={styles.spinner} /> Gerando Arquivo...</>) : (<><span className={styles.btnIcon}>⬇</span> Exportar .TXT (SIA)</>)}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
