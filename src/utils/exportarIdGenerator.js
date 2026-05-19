/**
 * exportarIdGenerator.js
 *
 * Gera o script SQL UPDATE com todos os CD_RECEPCAO da planilha
 * dividido em lotes de TAMANHO_LOTE registros por IN().
 * Todos os lotes ficam no mesmo arquivo .txt separados por uma linha em branco.
 */

const TAMANHO_LOTE = 500

const SQL_TEMPLATE = `UPDATE PD
SET PD.CD_COMPETENCIA = (select  MIN(CD_COMPETENCIA) from tb_PR_COMPETENCIA  where IC_ATIVO = 1), IC_FATURA = 2, PD.DS_OBSERVACAO = 'FATURADO APAC'
from 
TB_AT_ATENDIMENTO T
INNER JOIN TB_AT_PRESCRICAO P on P.CD_RECEPCAO = T.CD_RECEPCAO
inner join TB_AT_PRESCRICAO_DETALHE PD on PD.CD_PRESCRICAO = P.CD_PRESCRICAO and PD.IC_TIPO_ITEM_PRESCRITO = 10
where 
T.CD_RECEPCAO IN(<<IDS>>)`

/**
 * Divide um array em lotes de tamanho máximo.
 */
function chunkar(arr, tamanho) {
  const lotes = []
  for (let i = 0; i < arr.length; i += tamanho) {
    lotes.push(arr.slice(i, i + tamanho))
  }
  return lotes
}

/**
 * Gera o script SQL com os IDs da planilha, em lotes de TAMANHO_LOTE.
 * @param {Array<Object>} dados - Linhas da planilha
 * @returns {{ sql: string, total: number, totalLotes: number }}
 */
export function gerarScriptExportarId(dados) {
  const ids = dados
    .map(row => String(row['CD_RECEPCAO'] || '').trim())
    .filter(id => id.length > 0)
    .filter((id, idx, arr) => arr.indexOf(id) === idx) // remove duplicatas

  const lotes = chunkar(ids, TAMANHO_LOTE)

  const blocos = lotes.map((lote, idx) => {
    const idsFormatados = lote.map(id => `'${id}'`).join(',')
    const header = lotes.length > 1
      ? `-- Lote ${idx + 1} de ${lotes.length} (${lote.length} registro(s))\r\n`
      : ''
    return header + SQL_TEMPLATE.replace('<<IDS>>', idsFormatados)
  })

  const sql = blocos.join('\r\n\r\n')

  return { sql, total: ids.length, totalLotes: lotes.length }
}
