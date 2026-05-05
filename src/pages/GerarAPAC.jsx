import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'
import { calcularDV, validarCNS } from '../utils/apacUtils'
import { gerarLinha01, gerarLinha14, gerarLinha06, gerarLinhas13, getProcedimentos13, normalizarProcedimento, getExtensaoMes } from '../utils/txtGenerator'
import styles from '../App.module.css'

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
  
  const [competencia, setCompetencia] = useState('')
  const [dataGeracao, setDataGeracao] = useState('')
  const [orgaoOrigem, setOrgaoOrigem] = useState('')
  const [cnes, setCnes] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [orgaoDestino, setOrgaoDestino] = useState('')
  const [indicadorDestino, setIndicadorDestino] = useState('M')

  const [profissional, setProfissional] = useState('')
  const [cnsAutorizador, setCnsAutorizador] = useState('')
  const [cboProfissional, setCboProfissional] = useState('')
  
  const [faixas, setFaixas] = useState([])
  const [faixaSelecionadaId, setFaixaSelecionadaId] = useState('')

  const [erros, setErros] = useState({})
  const [mensagem, setMensagem] = useState(null)
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    carregarFaixas()
  }, [])

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

    if (!faixaSelecionadaId) {
      novosErros.faixa = 'Selecione um lote de numeração.'
    } else {
      const faixa = faixas.find(f => f.id === faixaSelecionadaId)
      if (planilha && faixa.numeros_restantes < planilha.qtdLinhas) {
        novosErros.faixa = `O lote tem apenas ${faixa.numeros_restantes} números disponíveis. A planilha tem ${planilha.qtdLinhas} linhas.`
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
      const faixa = faixas.find(f => f.id === faixaSelecionadaId)
      let baseAtual = BigInt(faixa.proximo_numero)

      const cabecalho = {
        competencia,
        orgaoOrigem,
        cnes,
        cnpj,
        orgaoDestino,
        indicadorDestino,
        dataGeracao,
        nomeAutorizador: profissional.trim(),
        cnsAutorizador: cnsAutorizador.replace(/\s/g, ''),
        cboAutorizador: cboProfissional
      }

      let somaControle = BigInt(0)
      const atendimentos = []
      let curBase = baseAtual
      
      for (const linhaExcel of planilha.dados) {
        const base12 = String(curBase).padStart(12, '0')
        const dv = calcularDV(base12)
        const numeroApac = base12 + dv // 13 digitos s/ hífen

        // Soma todos os procedimentos das linhas 13 conforme nova estrutura
        const proc14Norm  = normalizarProcedimento(linhaExcel['PROCEDIMENTOS'])
        const procs13     = getProcedimentos13(linhaExcel['PROCEDIMENTOS'])
        const qtdMapeados = BigInt(procs13.length)

        // 1. Proc. principal (linha 13 qty 1)
        somaControle += BigInt(proc14Norm) + 1n

        // 2. Código fixo 0301010072 (qty = número de procs mapeados)
        somaControle += 301010072n + qtdMapeados

        // 3. Cada proc. mapeado (qty 1 cada)
        for (const proc of procs13) {
          somaControle += BigInt(normalizarProcedimento(proc)) + 1n
        }

        somaControle += BigInt(numeroApac) // APAC number uma vez por atendimento

        atendimentos.push({ linhaExcel, numeroApac })
        curBase++
      }

      const qtdRegistros = atendimentos.length
      const valorControle = Number((somaControle % 1111n) + 1111n)

      let txt = ''
      txt += gerarLinha01(cabecalho, qtdRegistros, valorControle) + '\r\n'

      for (const item of atendimentos) {
        txt += gerarLinha14(item.linhaExcel, item.numeroApac, cabecalho) + '\r\n'
        txt += gerarLinha06(item.linhaExcel, item.numeroApac, cabecalho) + '\r\n'
        const linhas13 = gerarLinhas13(item.linhaExcel, item.numeroApac, cabecalho)
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

      // Atualiza banco
      const novoRestantes = faixa.numeros_restantes - qtdRegistros

      await supabase.from('faixas_apac').update({
        proximo_numero: String(curBase),
        numeros_restantes: novoRestantes,
        ativo: novoRestantes > 0
      }).eq('id', faixa.id)

      setMensagem({
        tipo: 'success',
        texto: `Arquivo "${nomeArquivo}" exportado com sucesso! ${qtdRegistros} registro(s) descontado(s) do lote.`
      })
      
      carregarFaixas()
      
      if(novoRestantes <= 0) {
         setFaixaSelecionadaId('')
      }
      
    } catch (err) {
      setMensagem({ tipo: 'error', texto: `Erro ao gerar arquivo TXT: ${err.message}` })
    } finally {
      setGerando(false)
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
                  <div className={styles.dropzoneContent}>
                    <span className={styles.dropzoneIcon}>✓</span>
                    <div>
                      <p className={styles.dropzoneName}>{planilha.nome}</p>
                      <p className={styles.dropzoneInfo}>{planilha.qtdLinhas} registro(s) encontrado(s)</p>
                    </div>
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
                <input id="competencia" type="text" className={`${styles.input} ${styles.inputMono} ${erros.competencia ? styles.inputError : ''}`} placeholder="Ex: 202603" maxLength={6} value={competencia} onChange={e => { setCompetencia(e.target.value.replace(/\D/g, '').slice(0, 6)); setErros(prev => ({ ...prev, competencia: null })) }} />
              </InputField>
              <InputField label="Data Geração Remessa" sublabel="(AAAAMMDD)" id="dataGen" error={erros.dataGeracao}>
                <input id="dataGen" type="text" className={`${styles.input} ${styles.inputMono} ${erros.dataGeracao ? styles.inputError : ''}`} placeholder="Ex: 20260301" maxLength={8} value={dataGeracao} onChange={e => { setDataGeracao(e.target.value.replace(/\D/g, '').slice(0, 8)); setErros(prev => ({ ...prev, dataGeracao: null })) }} />
              </InputField>
              <InputField label="CNES" sublabel="(6 dígitos numéricos)" id="cnes" error={erros.cnes}>
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
          </section>

          <div className={styles.divider} />

          {/* Seção 4 — Faixa APAC */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>04</span>
              <div>
                <h2 className={styles.sectionTitle}>Numeração da APAC (Lote)</h2>
                <p className={styles.sectionDesc}>Selecione uma faixa ativa previamente cadastrada no banco.</p>
              </div>
            </div>

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
          </section>

          <div className={styles.divider} />

          {mensagem && (
            <div className={`${styles.mensagem} ${styles[`mensagem_${mensagem.tipo}`]}`}>
              <span className={styles.mensagemIcon}>{mensagem.tipo === 'success' ? '✓' : '✕'}</span>
              {mensagem.texto}
            </div>
          )}

          <div className={styles.actions}>
            <button className={`${styles.btnGerar} ${gerando ? styles.btnGerando : ''}`} onClick={handleGerar} disabled={gerando || faixas.length === 0}>
              {gerando ? (<><span className={styles.spinner} /> Gerando Arquivo...</>) : (<><span className={styles.btnIcon}>⬇</span> Exportar .TXT (SIA)</>)}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
