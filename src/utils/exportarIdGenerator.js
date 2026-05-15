/**
 * exportarIdGenerator.js
 *
 * Gera o script SQL UPDATE com todos os CD_RECEPCAO da planilha
 * inseridos no IN() do WHERE.
 */

const SQL_TEMPLATE = `UPDATE PD
SET PD.CD_COMPETENCIA = (select  MIN(CD_COMPETENCIA) from tb_PR_COMPETENCIA  where IC_ATIVO = 1), IC_FATURA = 2, PD.DS_OBSERVACAO = 'FATURADO APAC'
from 
TB_AT_ATENDIMENTO T
INNER JOIN TB_AT_PRESCRICAO P on P.CD_RECEPCAO = T.CD_RECEPCAO
inner join TB_AT_PRESCRICAO_DETALHE PD on PD.CD_PRESCRICAO = P.CD_PRESCRICAO and PD.IC_TIPO_ITEM_PRESCRITO = 10
where 
T.CD_RECEPCAO IN(<<IDS>>)`

/**
 * Gera o script SQL com os IDs da planilha.
 * @param {Array<Object>} dados - Linhas da planilha
 * @returns {{ sql: string, total: number }}
 */
export function gerarScriptExportarId(dados) {
  const ids = dados
    .map(row => String(row['CD_RECEPCAO'] || '').trim())
    .filter(id => id.length > 0)
    // Remove duplicatas mantendo a ordem
    .filter((id, idx, arr) => arr.indexOf(id) === idx)

  const idsFormatados = ids.map(id => `'${id}'`).join(',')
  const sql = SQL_TEMPLATE.replace('<<IDS>>', idsFormatados)

  return { sql, total: ids.length }
}
