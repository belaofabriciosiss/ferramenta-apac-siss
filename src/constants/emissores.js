/**
 * Lista de emissores disponíveis para seleção na tela de Gerar APAC.
 *
 * Para adicionar um novo município, basta incluir um novo objeto no array:
 *   { municipio: 'Nome do Município', codigo: 'MXXXXXXXXX' } 
 *
 * O campo `codigo` é o valor que será gravado no arquivo APAC (tamanho 10, tipo CHAR).
 */
export const EMISSORES = [
  { municipio: 'Guarulhos',    codigo: 'M351880001' },
  { municipio: 'Mauá',  codigo: 'M352940001' },
  { municipio: 'Piracicaba',   codigo: 'M353870001' },
  { municipio: 'Santo André', codigo: 'M354780001' },
  { municipio: 'Itu', codigo: 'M3523909990' },
  { municipio: 'Osasco', codigo: 'M353440001' },
  { municipio: 'Campos dos Goytacazes', codigo: 'M330100001' },
  { municipio: 'Jundiaí', codigo: 'M352590001' },
]
