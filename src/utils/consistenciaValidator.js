/**
 * consistenciaValidator.js
 * Para adicionar nova regra por linha: crie validarXxx(row, ctx) e inclua em REGRAS.
 */

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizarCPF(v)  { return String(v || '').replace(/\D/g, '') }
function normalizarProc(v)  { return String(v || '').replace(/\D/g, '').padStart(10, '0') }

// Identifica o paciente usando CPF (preferêncial) → Cartão SUS → CD_RECEPCAO
function resolverIdPaciente(row) {
  const cpf = normalizarCPF(row['CPF DO INDIVIDUO'])
  if (cpf) return cpf
  const cns = String(row['CART\u00c3O SUS DO PACIENTE'] || '').replace(/\D/g, '')
  if (cns) return cns
  return String(row['CD_RECEPCAO'] || '').trim()
}

// Pré-processamento: detecta pares (ID_PACIENTE, PROCEDIMENTO_PRINCIPAL) duplicados e registra as linhas do Excel
function buildContexto(dados) {
  const paresLinhas = {}
  dados.forEach((row, idx) => {
    const idPaciente = resolverIdPaciente(row)
    const proc       = normalizarProc(row['PROCEDIMENTO_PRINCIPAL'])
    if (!idPaciente || !proc.replace(/0/g, '')) return
    const key = `${idPaciente}||${proc}`
    if (!paresLinhas[key]) paresLinhas[key] = []
    // Linha do Excel: índice 0 corresponde à linha 2 do Excel (linha 1 é cabeçalho)
    paresLinhas[key].push(idx + 2)
  })

  const paresdup = new Map()
  for (const [key, linhas] of Object.entries(paresLinhas)) {
    if (linhas.length > 1) {
      paresdup.set(key, linhas)
    }
  }

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
  const idPaciente = resolverIdPaciente(row)
  const proc       = normalizarProc(row['PROCEDIMENTO_PRINCIPAL'])
  if (!idPaciente || !proc.replace(/0/g, '')) return null
  const key = `${idPaciente}||${proc}`
  const linhas = ctx.paresdup.get(key)
  if (linhas) {
    return {
      tipo: 'PACIENTE E PROCEDIMENTO EM DUPLICIDADE',
      detalhe: `Procedimento: ${proc} | Linhas no Excel: ${linhas.join(', ')}`
    }
  }
  return null
}

function validarLogradouro(row) {
  const logradouro = String(row['IDENTIFICAÇÃO DO LOGRADOURO DE RESIDÊNCIA DO PACIENTE'] || '').trim()
  if (!logradouro) return 'Endereço do paciente inválido'
  return null
}

function validarPacienteSemCpf(row) {
  const val = String(row['PACIENTE SEM CPF'] !== undefined ? row['PACIENTE SEM CPF'] : (row['PESSOA SEM CPF'] || '')).trim().toUpperCase()
  if (val === 'S') return 'Paciente sem CPF'
  return null
}

function validarCid(row) {
  const cid = String(row['CID CAUSAS ASSOCIADAS'] || '').trim().toUpperCase()
  if (!cid || cid === 'NULL') return 'Atendimento sem CID válido'
  return null
}

const REGRAS = [
  { fn: validarEmail },
  { fn: validarProfissionaisDistintos },
  { fn: validarDuplicidade },
  { fn: validarLogradouro },
  { fn: validarPacienteSemCpf },
  { fn: validarCid },
]

// ─── Runner ───────────────────────────────────────────────────────────────────

export function executarConsistencia(dados, nomeArquivo) {
  const ctx = buildContexto(dados)

  // Agrupa erros por CPF/ID único do paciente
  const porPaciente = new Map()

  dados.forEach((row, idx) => {
    const linhaExcel = idx + 2
    const cdRecepcao = String(row['CD_RECEPCAO'] || '').trim()
    const cpf        = normalizarCPF(row['CPF DO INDIVIDUO'])
    const chave      = resolverIdPaciente(row) || JSON.stringify(row)

    const errosLinha = REGRAS.map(r => r.fn(row, ctx)).filter(Boolean)
    if (errosLinha.length === 0) return

    if (!porPaciente.has(chave)) {
      porPaciente.set(chave, { cdRecepcao, cpf, erros: new Map() })
    }

    const reg = porPaciente.get(chave)
    errosLinha.forEach(e => {
      if (typeof e === 'string') {
        // Erros simples: agrupa as linhas onde ocorreram
        if (!reg.erros.has(e)) {
          reg.erros.set(e, new Set())
        }
        reg.erros.get(e).add(linhaExcel)
      } else if (e && e.tipo) {
        // Erros complexos (ex: duplicidade com lista completa de linhas já calculada)
        if (!reg.erros.has(e.tipo)) {
          reg.erros.set(e.tipo, e.detalhe)
        }
      }
    })
  })

  // Totalizador por tipo
  const contadores = {}
  for (const { erros } of porPaciente.values()) {
    for (const [tipo] of erros.entries()) {
      contadores[tipo] = (contadores[tipo] || 0) + 1
    }
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
      for (const [tipo, val] of erros.entries()) {
        if (typeof val === 'string') {
          // Já formatado (duplicidade)
          L.push(`  - ${tipo} (${val})`)
        } else if (val instanceof Set) {
          // Set de linhas do Excel
          const linhasStr = Array.from(val).join(', ')
          L.push(`  - ${tipo} (Linha(s) no Excel: ${linhasStr})`)
        } else {
          L.push(`  - ${tipo}`)
        }
      }
    }
  }

  L.push('')
  L.push(SEP)
  L.push(`FIM DO RELATÓRIO - ${totalErros} erro(s) encontrado(s)`)
  L.push(SEP)

  return L.join('\r\n')
}

/**
 * Remove registros duplicados de paciente + procedimento principal,
 * mantendo a primeira ocorrência encontrada de cada par.
 * Retorna { dadosLimpos, totalRemovidos }
 */
export function removerDuplicidades(dados) {
  const vistos = new Set()
  const dadosLimpos = []
  let totalRemovidos = 0

  for (const row of dados) {
    const idPaciente = resolverIdPaciente(row)
    const proc       = normalizarProc(row['PROCEDIMENTO_PRINCIPAL'])

    if (idPaciente && proc.replace(/0/g, '')) {
      const key = `${idPaciente}||${proc}`
      if (vistos.has(key)) {
        totalRemovidos++
        continue // Pula linhas duplicadas (descarta)
      }
      vistos.add(key)
    }

    dadosLimpos.push(row)
  }

  return { dadosLimpos, totalRemovidos }
}
