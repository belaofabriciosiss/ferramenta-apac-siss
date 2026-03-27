import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'
import { calcularDV, formatarAPAC, validarCNS } from '../utils/apacUtils'
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

      const dadosPreenchidos = planilha.dados.map((linha) => {
        const base12 = String(baseAtual).padStart(12, '0')
        const dv = calcularDV(base12)
        const numeroAPAC = formatarAPAC(base12, dv)
        baseAtual++

        return {
          ...linha,
          'NUMERO APAC (12 DIGITOS E 1 DIGITO VERIFICADOR)': numeroAPAC,
          'NOME PROFISSIONAL AUTORIZADOR': profissional.trim(),
          'CNS DO AUTORIZADOR': cnsAutorizador.replace(/\s/g, ''),
          'CBO DO PROFISSIONAL AUTORIZADOR': cboProfissional,
        }
      })

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(dadosPreenchidos)

      const colunas = Object.keys(dadosPreenchidos[0] || {})
      ws['!cols'] = colunas.map(col => ({ wch: Math.min(Math.max(col.length, 15), 50) }))
      XLSX.utils.book_append_sheet(wb, ws, 'APAC')

      const mesAno = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }).replace('/', '_')
      const nomeArquivo = `APAC_${mesAno}.xlsx`
      XLSX.writeFile(wb, nomeArquivo)

      // Atualiza banco
      const numerosUsados = planilha.qtdLinhas
      const novoRestantes = faixa.numeros_restantes - numerosUsados

      await supabase.from('faixas_apac').update({
        proximo_numero: String(baseAtual),
        numeros_restantes: novoRestantes,
        ativo: novoRestantes > 0
      }).eq('id', faixa.id)

      setMensagem({
        tipo: 'success',
        texto: `Arquivo "${nomeArquivo}" gerado com sucesso! ${numerosUsados} registro(s) descontado(s) do lote.`
      })
      
      carregarFaixas()
      
      if(novoRestantes <= 0) {
         setFaixaSelecionadaId('')
      }
      
    } catch (err) {
      setMensagem({ tipo: 'error', texto: `Erro ao gerar o arquivo: ${err.message}` })
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
            <p className={styles.headerSub}>Preencha a planilha e escolha um lote ativo para gerar a numeração.</p>
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

          {/* Seção 2 — Profissional */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>02</span>
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

          {/* Seção 3 — Faixa APAC */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>03</span>
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
              {gerando ? (<><span className={styles.spinner} /> Gerando...</>) : (<><span className={styles.btnIcon}>⬇</span> Gerar Arquivo APAC</>)}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
