/**
 * consistenciaValidator.js
 * Para adicionar nova regra por linha: crie validarXxx(row, ctx) e inclua em REGRAS.
 */

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Pré-processamento: detecta pares (CPF, PROCEDIMENTO_PRINCIPAL) duplicados
function buildContexto(dados) {
  const contPares = {}
  for (const row of dados) {
    const cpf  = String(row['CPF DO INDIVIDUO']      || '').trim()
    const proc = String(row['PROCEDIMENTO_PRINCIPAL'] || '').trim()
    if (!cpf || !proc) continue
    const key = `${cpf}||${proc}`
    contPares[key] = (contPares[key] || 0) + 1
  }
  const paresdup = new Set(Object.keys(contPares).filter(k => contPares[k] > 1))
  return { paresdup }
}

// ─── Regras ───────────────────────────────────────────────────────────────────

function validarEmail(row) {
  const email = String(row['EMAIL DO PACIENTE'] || '').trim()
  if (email === '') return null
  if (!REGEX_EMAIL.test(email)) return 'EMAIL DO PACIENTE INVÁLIDO'
  return null
}

function validarProfissionaisDistintos(row) {
  const aut = String(row['NOME PROFISSIONAL AUTORIZADOR'] || '').trim().toUpperCase()
  const res = String(row['NOME DO MÉDICO RESPONSÁVEL']    || '').trim().toUpperCase()
  if (!aut || !res) return null
  if (aut === res) return 'PROFISSIONAL AUTORIZADOR E PROFISSIONAL RESPONSÁVEL PELO ATENDIMENTO NÃO DEVEM SER O MESMO'
  return null
}

function validarDuplicidade(row, ctx) {
  const cpf  = String(row['CPF DO INDIVIDUO']      || '').trim()
  const proc = String(row['PROCEDIMENTO_PRINCIPAL'] || '').trim()
  if (!cpf || !proc) return null
  if (ctx.paresdup.has(`${cpf}||${proc}`)) return 'PACIENTE E PROCEDIMENTO EM DUPLICIDADE'
  return null
}

const REGRAS = [
  { fn: validarEmail },
  { fn: validarProfissionaisDistintos },
  { fn: validarDuplicidade },
]

// ─── Runner ───────────────────────────────────────────────────────────────────

export function executarConsistencia(dados, nomeArquivo) {
  const ctx = buildContexto(dados)

  // Agrupa erros por CPF (chave única por paciente)
  const porPaciente = new Map()

  for (const row of dados) {
    const cdRecepcao = String(row['CD_RECEPCAO']      || '').trim()
    const cpf        = String(row['CPF DO INDIVIDUO'] || '').trim()
    const chave      = cpf || cdRecepcao || JSON.stringify(row)

    const errosLinha = REGRAS.map(r => r.fn(row, ctx)).filter(Boolean)
    if (errosLinha.length === 0) continue

    if (!porPaciente.has(chave)) {
      porPaciente.set(chave, { cdRecepcao, cpf, erros: new Set() })
    }
    errosLinha.forEach(e => porPaciente.get(chave).erros.add(e))
  }

  // Totalizador por tipo
  const contadores = {}
  for (const { erros } of porPaciente.values()) {
    for (const e of erros) contadores[e] = (contadores[e] || 0) + 1
  }
  const totalErros = Object.values(contadores).reduce((a, b) => a + b, 0)

  const agora = new Date()
  const dataHora = agora.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })

  const L = []
  const SEP  = '='.repeat(80)
  const SEP2 = '-'.repeat(80)

  L.push(SEP)
  L.push('RELATÓRIO DE CONSISTÊNCIA - APAC')
  L.push(`Data/Hora: ${dataHora}`)
  L.push(`Arquivo  : ${nomeArquivo}`)
  L.push(`Registros analisados: ${dados.length}`)
  L.push(SEP)
  L.push('')
  L.push('RESUMO')
  L.push('-'.repeat(40))
  L.push(`Total de erros encontrados: ${totalErros}`)
  L.push('')

  if (totalErros === 0) {
    L.push('  Nenhum erro encontrado. Planilha consistente!')
  } else {
    for (const [desc, qtd] of Object.entries(contadores)) {
      L.push(`  [${qtd}] ${desc}`)
    }
  }

  L.push('')
  L.push(SEP)
  L.push('DETALHAMENTO (agrupado por paciente)')
  L.push('-'.repeat(40))

  if (totalErros === 0) {
    L.push('  Sem erros para detalhar.')
  } else {
    let primeiro = true
    for (const { cdRecepcao, cpf, erros } of porPaciente.values()) {
      if (!primeiro) L.push(SEP2)
      primeiro = false
      L.push([cdRecepcao, cpf].filter(Boolean).join(' - '))
      for (const e of erros) L.push(`  - ${e}`)
    }
  }

  L.push('')
  L.push(SEP)
  L.push(`FIM DO RELATÓRIO - ${totalErros} erro(s) encontrado(s)`)
  L.push(SEP)

  return L.join('\r\n')
}
