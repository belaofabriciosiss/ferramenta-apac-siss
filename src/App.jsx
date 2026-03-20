import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import styles from './App.module.css'

// ─── Utilitários ────────────────────────────────────────────────────────────

/**
 * Calcula o dígito verificador de um número APAC de 12 dígitos.
 * Algoritmo: módulo 11, pesos 2 a 9 da direita para a esquerda.
 * Resto 0 ou 1 → DV = 0, caso contrário DV = 11 - resto.
 */
function calcularDV(numero12) {
  const digits = String(numero12).padStart(12, '0').split('').map(Number)
  let soma = 0
  let peso = 2
  for (let i = digits.length - 1; i >= 0; i--) {
    soma += digits[i] * peso
    peso = peso === 9 ? 2 : peso + 1
  }
  const resto = soma % 11
  return resto === 0 || resto === 1 ? 0 : 11 - resto
}

/**
 * Recebe "123456789012-3" ou "1234567890123" e retorna { base12, dv } ou null.
 */
function parsearAPAC(valor) {
  const limpo = valor.replace(/\s/g, '')
  const comHifen = /^(\d{12})-(\d)$/
  const semHifen = /^(\d{13})$/
  let base12, dvInformado

  if (comHifen.test(limpo)) {
    const m = limpo.match(comHifen)
    base12 = m[1]
    dvInformado = parseInt(m[2])
  } else if (semHifen.test(limpo)) {
    base12 = limpo.slice(0, 12)
    dvInformado = parseInt(limpo[12])
  } else {
    return null
  }

  return { base12, dvInformado }
}

/**
 * Valida CNS: deve ter exatamente 15 dígitos numéricos.
 */
function validarCNS(cns) {
  return /^\d{15}$/.test(cns.replace(/\s/g, ''))
}

/**
 * Formata número APAC exibindo com hífen: "123456789012-3"
 */
function formatarAPAC(base12, dv) {
  return `${base12}-${dv}`
}

// ─── Componentes auxiliares ──────────────────────────────────────────────────

function StatusBadge({ type, children }) {
  return (
    <div className={`${styles.statusBadge} ${styles[`badge_${type}`]}`}>
      <span className={styles.badgeDot} />
      {children}
    </div>
  )
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

// ─── Componente principal ────────────────────────────────────────────────────

export default function App() {
  const fileInputRef = useRef(null)

  const [planilha, setPlanilha] = useState(null) // { nome, dados, qtdLinhas }
  const [profissional, setProfissional] = useState('')
  const [cnsAutorizador, setCnsAutorizador] = useState('')
  const [apacDe, setApacDe] = useState('')
  const [apacAte, setApacAte] = useState('')

  const [erros, setErros] = useState({})
  const [mensagem, setMensagem] = useState(null) // { tipo, texto }
  const [gerando, setGerando] = useState(false)

  // ── Importação da planilha ────────────────────────────────────────────────

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

  // ── Validação geral ───────────────────────────────────────────────────────

  function validarFormulario() {
    const novosErros = {}

    if (!planilha) {
      novosErros.planilha = 'Importe a planilha de atendimentos.'
    }

    if (!profissional.trim()) {
      novosErros.profissional = 'Informe o nome do profissional autorizador.'
    }

    if (!cnsAutorizador.trim()) {
      novosErros.cns = 'Informe o CNS do autorizador.'
    } else if (!validarCNS(cnsAutorizador)) {
      novosErros.cns = 'O CNS deve conter exatamente 15 dígitos numéricos.'
    }

    const parseDe = apacDe.trim() ? parsearAPAC(apacDe.trim()) : null
    const parseAte = apacAte.trim() ? parsearAPAC(apacAte.trim()) : null

    if (!apacDe.trim()) {
      novosErros.apacDe = 'Informe o número APAC inicial.'
    } else if (!parseDe) {
      novosErros.apacDe = 'Formato inválido. Use 13 dígitos (ex: 123456789012-3 ou 1234567890123).'
    }

    if (!apacAte.trim()) {
      novosErros.apacAte = 'Informe o número APAC final.'
    } else if (!parseAte) {
      novosErros.apacAte = 'Formato inválido. Use 13 dígitos (ex: 123456789012-3 ou 1234567890123).'
    }

    if (parseDe && parseAte && !novosErros.apacDe && !novosErros.apacAte) {
      const inicio = BigInt(parseDe.base12)
      const fim = BigInt(parseAte.base12)

      if (fim < inicio) {
        novosErros.apacAte = 'O número final deve ser maior ou igual ao número inicial.'
      } else if (planilha) {
        const qtdFaixa = Number(fim - inicio) + 1
        if (qtdFaixa < planilha.qtdLinhas) {
          novosErros.apacFaixa = `A faixa informada tem ${qtdFaixa} número(s), mas a planilha tem ${planilha.qtdLinhas} linha(s). Amplie a faixa ou reduza a planilha.`
        }
      }
    }

    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  // ── Geração do arquivo ────────────────────────────────────────────────────

  async function handleGerar() {
    setMensagem(null)
    if (!validarFormulario()) return

    setGerando(true)

    try {
      const parseDe = parsearAPAC(apacDe.trim())
      let baseAtual = BigInt(parseDe.base12)

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
        }
      })

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(dadosPreenchidos)

      // Largura automática das colunas
      const colunas = Object.keys(dadosPreenchidos[0] || {})
      ws['!cols'] = colunas.map(col => ({
        wch: Math.min(Math.max(col.length, 15), 50)
      }))

      XLSX.utils.book_append_sheet(wb, ws, 'APAC')

      const mesAno = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }).replace('/', '_')
      const nomeArquivo = `APAC_${mesAno}.xlsx`

      XLSX.writeFile(wb, nomeArquivo)

      setMensagem({
        tipo: 'success',
        texto: `Arquivo "${nomeArquivo}" gerado com sucesso! ${planilha.qtdLinhas} registro(s) preenchido(s).`
      })
    } catch (err) {
      setMensagem({
        tipo: 'error',
        texto: `Erro ao gerar o arquivo: ${err.message}`
      })
    } finally {
      setGerando(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logoArea}>
            <img
              src="/logo.png"
              alt="Logo"
              className={styles.logo}
              onError={e => { e.target.style.display = 'none' }}
            />
          </div>
          <div className={styles.headerText}>
            <h1 className={styles.headerTitle}>Ferramenta para Geração do Arquivo APAC</h1>
            <p className={styles.headerSub}>
              Ferramenta para geração do arquivo APAC com dados extraídos do sistema SISS.
            </p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className={styles.main}>
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
                  if (file) {
                    const fakeEvent = { target: { files: [file] } }
                    handleArquivoChange(fakeEvent)
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className={styles.fileInputHidden}
                  onChange={handleArquivoChange}
                />
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
                      <p className={styles.dropzonePrompt}>Clique para selecionar ou arraste o arquivo aqui</p>
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
              <InputField label="Nome completo do profissional autorizador" id="profissional" error={erros.profissional}>
                <input
                  id="profissional"
                  type="text"
                  className={`${styles.input} ${erros.profissional ? styles.inputError : ''}`}
                  placeholder="Ex.: DRA. MARIA SILVA"
                  value={profissional}
                  onChange={e => {
                    setProfissional(e.target.value.toUpperCase())
                    setErros(prev => ({ ...prev, profissional: null }))
                  }}
                />
              </InputField>

              <InputField
                label="CNS do autorizador"
                sublabel="(15 dígitos)"
                id="cns"
                error={erros.cns}
              >
                <input
                  id="cns"
                  type="text"
                  className={`${styles.input} ${styles.inputMono} ${erros.cns ? styles.inputError : ''}`}
                  placeholder="000000000000000"
                  maxLength={15}
                  value={cnsAutorizador}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 15)
                    setCnsAutorizador(val)
                    setErros(prev => ({ ...prev, cns: null }))
                  }}
                />
              </InputField>
            </div>
          </section>

          <div className={styles.divider} />

          {/* Seção 3 — Faixa APAC */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>03</span>
              <div>
                <h2 className={styles.sectionTitle}>Faixa Numérica de APAC</h2>
                <p className={styles.sectionDesc}>Informe o intervalo de números APAC (13 dígitos: 12 + dígito verificador)</p>
              </div>
            </div>

            <div className={styles.faixaRow}>
              <InputField label="DE" id="apacDe" error={erros.apacDe}>
                <input
                  id="apacDe"
                  type="text"
                  className={`${styles.input} ${styles.inputMono} ${erros.apacDe ? styles.inputError : ''}`}
                  placeholder="123456789012-3"
                  maxLength={14}
                  value={apacDe}
                  onChange={e => {
                    setApacDe(e.target.value)
                    setErros(prev => ({ ...prev, apacDe: null, apacFaixa: null }))
                  }}
                />
              </InputField>

              <div className={styles.faixaSep}>até</div>

              <InputField label="ATÉ" id="apacAte" error={erros.apacAte}>
                <input
                  id="apacAte"
                  type="text"
                  className={`${styles.input} ${styles.inputMono} ${erros.apacAte ? styles.inputError : ''}`}
                  placeholder="123456789012-9"
                  maxLength={14}
                  value={apacAte}
                  onChange={e => {
                    setApacAte(e.target.value)
                    setErros(prev => ({ ...prev, apacAte: null, apacFaixa: null }))
                  }}
                />
              </InputField>
            </div>

            {erros.apacFaixa && (
              <div className={styles.alertBox}>
                <span className={styles.alertIcon}>⚠</span>
                {erros.apacFaixa}
              </div>
            )}

            <div className={styles.apacHelp}>
              <span className={styles.helpIcon}>ℹ</span>
              O dígito verificador após o hífen é calculado automaticamente pelo sistema.
              Você pode inserir com hífen (<code>123456789012-3</code>) ou sem (<code>1234567890123</code>).
            </div>
          </section>

          <div className={styles.divider} />

          {/* Mensagem de retorno */}
          {mensagem && (
            <div className={`${styles.mensagem} ${styles[`mensagem_${mensagem.tipo}`]}`}>
              <span className={styles.mensagemIcon}>
                {mensagem.tipo === 'success' ? '✓' : '✕'}
              </span>
              {mensagem.texto}
            </div>
          )}

          {/* Botão */}
          <div className={styles.actions}>
            <button
              className={`${styles.btnGerar} ${gerando ? styles.btnGerando : ''}`}
              onClick={handleGerar}
              disabled={gerando}
            >
              {gerando ? (
                <>
                  <span className={styles.spinner} />
                  Gerando arquivo...
                </>
              ) : (
                <>
                  <span className={styles.btnIcon}>⬇</span>
                  Gerar Arquivo APAC
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Exportação Arquivo APAC · Uso interno · SIA/DATASUS</p>
      </footer>
    </div>
  )
}
