/**
 * consistenciaValidator.js
 *
 * Módulo de consistência da planilha de atendimentos APAC.
 * Para adicionar novas regras, crie uma nova função validarXxx(row)
 * que retorna null (sem erro) ou uma string com a descrição do erro,
 * e inclua-a no array REGRAS abaixo.
 */

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Regras individuais ──────────────────────────────────────────────────────

function validarEmail(row) {
  const email = String(row['EMAIL DO PACIENTE'] || '').trim()
  if (email === '') return null // campo vazio não é validado aqui
  if (!REGEX_EMAIL.test(email)) return 'EMAIL DO PACIENTE INVÁLIDO'
  return null
}

function validarProfissionaisDistintos(row) {
  const autorizador  = String(row['NOME PROFISSIONAL AUTORIZADOR'] || '').trim().toUpperCase()
  const responsavel  = String(row['NOME DO MÉDICO RESPONSÁVEL']    || '').trim().toUpperCase()
  if (autorizador === '' || responsavel === '') return null
  if (autorizador === responsavel)
    return 'PROFISSIONAL AUTORIZADOR E PROFISSIONAL RESPONSÁVEL PELO ATENDIMENTO NÃO DEVEM SER O MESMO'
  return null
}

// ─── Registro de regras ───────────────────────────────────────────────────────
// Cada entrada: { descricao, fn }
// Para adicionar nova regra: inclua um novo objeto aqui.
const REGRAS = [
  { descricao: 'EMAIL DO PACIENTE INVÁLIDO',                                                                          fn: validarEmail },
  { descricao: 'PROFISSIONAL AUTORIZADOR E PROFISSIONAL RESPONSÁVEL PELO ATENDIMENTO NÃO DEVEM SER O MESMO',         fn: validarProfissionaisDistintos },
]

// ─── Runner principal ─────────────────────────────────────────────────────────

/**
 * Executa todas as regras sobre a planilha e retorna o conteúdo .txt do relatório.
 * @param {Array<Object>} dados  - Array de linhas (objetos) lidos do xlsx
 * @param {string}        nomeArquivo - Nome do arquivo importado
 * @returns {string} Conteúdo do relatório em texto puro
 */
export function executarConsistencia(dados, nomeArquivo) {
  // Coleta erros por linha
  const erros = [] // { cdRecepcao, cpf, descricao }

  for (const row of dados) {
    const cdRecepcao = String(row['CD_RECEPCAO'] || '').trim()
    const cpf        = String(row['CPF DO INDIVIDUO'] || '').trim()

    for (const regra of REGRAS) {
      const resultado = regra.fn(row)
      if (resultado !== null) {
        erros.push({ cdRecepcao, cpf, descricao: resultado })
      }
    }
  }

  // Totalizador por tipo de erro
  const contadores = {}
  for (const e of erros) {
    contadores[e.descricao] = (contadores[e.descricao] || 0) + 1
  }

  // ─── Montagem do relatório ────────────────────────────────────────────────
  const agora = new Date()
  const dataHora = agora.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })

  const linhas = []

  linhas.push('='.repeat(80))
  linhas.push('RELATÓRIO DE CONSISTÊNCIA - APAC')
  linhas.push(`Data/Hora: ${dataHora}`)
  linhas.push(`Arquivo  : ${nomeArquivo}`)
  linhas.push(`Registros analisados: ${dados.length}`)
  linhas.push('='.repeat(80))
  linhas.push('')

  linhas.push('RESUMO')
  linhas.push('-'.repeat(40))
  linhas.push(`Total de erros encontrados: ${erros.length}`)
  linhas.push('')

  if (erros.length === 0) {
    linhas.push('  Nenhum erro encontrado. Planilha consistente!')
  } else {
    for (const [desc, qtd] of Object.entries(contadores)) {
      linhas.push(`  [${qtd}] ${desc}`)
    }
  }

  linhas.push('')
  linhas.push('='.repeat(80))
  linhas.push('DETALHAMENTO')
  linhas.push('-'.repeat(40))

  if (erros.length === 0) {
    linhas.push('  Sem erros para detalhar.')
  } else {
    for (const e of erros) {
      const ident = [e.cdRecepcao, e.cpf].filter(Boolean).join(' - ')
      linhas.push(`${ident}`)
      linhas.push(`  ${e.descricao}`)
      linhas.push('')
    }
  }

  linhas.push('='.repeat(80))
  linhas.push(`FIM DO RELATÓRIO - ${erros.length} erro(s) encontrado(s)`)
  linhas.push('='.repeat(80))

  return linhas.join('\r\n')
}
