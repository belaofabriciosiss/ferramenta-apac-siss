// Remove acentos e caracteres especiais (Á→A, Ã→A, Ó→O, ç→c, etc.)
function removerAcentos(texto) {
  return String(texto || '')
    .normalize('NFD')               // decompõe em letra + marca diacrítica
    .replace(/[\u0300-\u036f]/g, '') // remove as marcas diacríticas
}

export function padText(texto, tamanho) {
  if (!texto) texto = ''
  const t = removerAcentos(String(texto))
  if (t.length > tamanho) {
    return t.substring(0, tamanho)
  }
  return t.padEnd(tamanho, ' ')
}

export function padNum(numero, tamanho) {
  if (!numero) numero = ''
  let cleaned = String(numero).replace(/\D/g, '')
  if (cleaned.length > tamanho) {
    cleaned = cleaned.substring(0, tamanho)
  }
  return cleaned.padStart(tamanho, '0')
}

// Retorna Mês com 3 letras (Ex: "202501" -> "JAN")
export function getExtensaoMes(aaaamm) {
  const mes = String(aaaamm).substring(4, 6)
  const meses = {
    '01': 'JAN', '02': 'FEV', '03': 'MAR', '04': 'ABR',
    '05': 'MAI', '06': 'JUN', '07': 'JUL', '08': 'AGO',
    '09': 'SET', '10': 'OUT', '11': 'NOV', '12': 'DEZ'
  }
  return meses[mes] || 'TXT'
}

export function gerarLinha01(cabecalho, qtdRegistros, valorControle) {
  let linha = ''
  linha += '01' // 2 (Indicador)
  linha += '#APAC' // 5 (Tipo)
  linha += padNum(cabecalho.competencia, 6) // 6 (AAAAMM)
  linha += padNum(qtdRegistros, 6) // 6 (Qtd APACs - Qtd Atendimentos)
  linha += padNum(valorControle, 4) // 4 (Campo Controle Mín 1111 - Máx 2221)
  linha += padText(cabecalho.orgaoOrigem, 30) // 30 (Nome Origem)
  linha += padText(cabecalho.cnes, 6) // 6 (Sigla/CNES)
  linha += padNum(cabecalho.cnpj, 14) // 14 (CNPJ do Prestador)
  linha += padText(cabecalho.orgaoDestino, 40) // 40 (Nome Destino)
  linha += padText(cabecalho.indicadorDestino, 1) // 1 (M ou E)
  linha += padNum(cabecalho.dataGeracao, 8) // 8 (AAAAMMDD)
  linha += padText('Versao 03.11', 15) // 15 (Versão Livre)
  return linha
}

export function gerarLinha14(linhaExcel, numeroApac, cabecalho) {
  let linha = ''
  linha += '14' // 2 (Identificador de linha corpo APAC)
  linha += padNum(cabecalho.competencia, 6) // ANO/MÊS PRODUÇÃO
  linha += padNum(numeroApac, 13) // NÚMERO APAC (12 + 1 DV)
  linha += padNum(linhaExcel['CODIGO DA UNIDADE DE FEDERAÇÃO (IBGE)'], 2) // IBGE
  linha += padNum(linhaExcel['CÓDIGO DA PRESTADORA DE SERVIÇOS (7 DÍGITOS)'], 7) // CNES C/ DV (7 dígitos)
  linha += padNum(linhaExcel['DATA (YYYYMMDD) DO PROCESSAMENTO DA APAC II (8 DÍGITOS)'], 8) // PROCESSAMENTO
  linha += padNum(linhaExcel['DATA (YYYYMMDD) INICIAL DA VALIDADE DA APAC (8 DÍGITOS)'], 8) // VALIDADE INICIAL
  linha += padNum(linhaExcel['DATA (YYYYMMDD) FINAL DA VALIDADE DA APAC (8 DÍGITOS)'], 8) // VALIDADE FINAL
  linha += padNum(linhaExcel['TIPO DE ATENDIMENTO'], 2) // TIPO DE ATENDIMENTO
  linha += padText(linhaExcel['TIPO DE APAC'], 1) // TIPO DE APAC
  linha += padText(linhaExcel['NOME PACIENTE'], 30) // NOME PACIENTE
  linha += padText(linhaExcel['NOME DA MÃE'], 30) // NOME DA MÃE
  linha += padText(linhaExcel['IDENTIFICAÇÃO DO LOGRADOURO DE RESIDÊNCIA DO PACIENTE'], 30) // LOGRADOURO RESIDENCIA
  linha += padText(linhaExcel['NÚMERO CORRESPONDENTE A RESIDÊNCIA DO PACIENTE'], 5) // NUMERO
  linha += padText(linhaExcel['COMPLEMENTO DO LOGRADOURO DO PACIENTE'], 10) // COMPLEMENTO
  linha += padNum(linhaExcel['CEP (8 DÍGITOS)'], 8) // CEP
  linha += padText(linhaExcel['CÓDIGO DO MUNICIPIO (CÓD. IBGE)'], 7) // MUNICIPIO (pode ser " " caso nao tenha DV)
  linha += padNum(linhaExcel['DATA DE NASCIMENTO 8 DIGITOS'], 8) // DATA DE NASCIMENTO
  linha += padText(linhaExcel['SEXO DO PACIENTE'], 1) // SEXO
  linha += padText(linhaExcel['NOME DO MÉDICO RESPONSÁVEL'], 30) // MÉDICO RESPONSÁVEL
  linha += padNum(linhaExcel['PROCEDIMENTOS'], 10) // PROCEDIMENTO PRINCIPAL
  linha += padNum(linhaExcel['CÓDIGO DO MOTIVO DE SAÍDA/PERMANENCIA - PORTARIA Nº 719, DE 28 DEZEMBRO DE 2007'], 2) // MOTIVO SAÍDA
  linha += padText(linhaExcel['DATA (AAMMDD) DA OCORRÊNCIA NO CASO DE ALTA, TRANSFERENCIA OU ÓBITO'], 8) // DATA SAÍDA
  linha += padText(cabecalho.nomeAutorizador, 30) // PROFISSIONAL AUTORIZADOR DO FORMULÁRIO (30)
  linha += padNum(linhaExcel['CARTÃO SUS DO PACIENTE'], 15) // CARTÃO SUS
  linha += padNum(linhaExcel['CNS MÉDICO RESPONSÁVEL'], 15) // CNS MÉDICO
  linha += padNum(cabecalho.cnsAutorizador, 15) // CNS AUTORIZADOR DO FORMULÁRIO (15)
  linha += padText(linhaExcel['CID CAUSAS ASSOCIADAS'], 4) // CID
  linha += padText(linhaExcel['NUMERO DO PRONTUÁRIO'], 10) // PRONTUÁRIO
  linha += padText(linhaExcel['CÓDIGO CNES DO SOLICITANTE (7 DÍGITOS)'], 7) // CNES SOLICITANTE
  linha += padText(linhaExcel['DATA DA SOLICITAÇÃO (YYYMMDD) (8 DÍGITOS)'], 8) // DATA SOLICITAÇÃO
  linha += padText(linhaExcel['DATA DA AUTORIZAÇÃO'], 8) // DATA AUTORIZAÇÃO
  linha += padText(linhaExcel['CÓDIGO DO EMISSOR'], 10) // CÓDIGO DO EMISSOR
  linha += padNum(linhaExcel['CARATÉR DO ATENDIMENTO'], 2) // CARÁTER DO ATENDIMENTO
  linha += padText(linhaExcel['NUMERO DA APAC ANTERIOR (OPCIONAL)'], 13) // NUMERO ANTERIOR
  linha += padNum(linhaExcel['RAÇA/COR'], 2) // RAÇA/COR
  linha += padText(linhaExcel['NOME DO RESPONSÁVEL'], 30) // NOME DO RESPONSÁVEL
  linha += padNum(linhaExcel['CÓDIGO DA NACIONALIDADE'], 3) // NACIONALIDADE
  linha += padText(linhaExcel['CÓDIGO DA ETNIA'], 4) // ETNIA
  linha += padNum(linhaExcel['CÓDIGO DO LOGRADOURO'], 3) // CÓDIGO LOGRADOURO
  linha += padText(linhaExcel['BAIRRO DO PACIENTE'], 30) // BAIRRO
  linha += padNum(linhaExcel['DDD DO TELEFONE DE CONTATO'], 2) // DDD
  linha += padNum(linhaExcel['TELEFONE DE CONTATO'], 9) // TELEFONE
  linha += padText(linhaExcel['EMAIL DO PACIENTE'], 40) // EMAIL
  linha += padNum(linhaExcel['CNS MÉDICO EXECUTANTE DO PROCEDIMENTO'], 15) // CNS MÉDICO EXECUTANTE
  linha += padNum(linhaExcel['CPF DO INDIVIDUO'], 11) // CPF DO INDIVIDUO
  linha += padText(linhaExcel['IDENTIFICAÇÃO NACIONAL DE EQUIPE'], 10) // EQUIPE
  linha += padText(linhaExcel['PESSOA EM SITUAÇÃO DE RUA'], 1) // PESSOA EM SITUAÇÃO DE RUA (N ou S ou branco) - Ops, truncou na msg usuário "PESSOA EM SITUAÇÃO DE 81" -> vou usar padText
  return linha
}

export function gerarLinha06(linhaExcel, numeroApac, cabecalho) {
  let linha = ''
  linha += '06' // Indicador 06
  linha += padNum(cabecalho.competencia, 6) // ANO/MÊS PRODUÇÃO
  linha += padNum(numeroApac, 13) // NÚMERO APAC
  linha += padText(linhaExcel['CID CAUSAS ASSOCIADAS'], 4) // CID PRINCIPAL (mesmo da causa associada no exemplo do usuário)
  linha += padText('', 4) // CID SECUNDARIO ESPAÇO EM BRANCO (4)
  linha += padText('', 8) // Data da identificação patológica ESPAÇO EM BRANCO (8)
  return linha
}

// Mapeamento: procedimento da linha 14 → lista de procedimentos para as linhas 13
const MAPA_PROCEDIMENTOS_13 = {
  '0902010018': ['0211020036'],
  '0902010026': ['0211020036'],
  '0904010031': ['0209040041', '0209040025'],
}

// Normaliza o código do procedimento vindo do Excel (sem o zero à esquerda)
export function normalizarProcedimento(valorExcel) {
  const cleaned = String(valorExcel || '').replace(/\D/g, '')
  return cleaned.padStart(10, '0')
}

// Retorna os procedimentos mapeados para as linhas 13 com base no proc. da linha 14
export function getProcedimentos13(valorExcel) {
  const procNorm = normalizarProcedimento(valorExcel)
  return MAPA_PROCEDIMENTOS_13[procNorm] || []
}

// Gera UM bloco de linha 13 para um procedimento específico
function gerarUmaLinha13(codigoProc, numeroApac, cabecalho) {
  let linha = ''
  linha += '13'               // Indicador 13
  linha += padNum(cabecalho.competencia, 6)  // ANO/MÊS PRODUÇÃO
  linha += padNum(numeroApac, 13)            // NÚMERO APAC
  linha += padNum(codigoProc, 10)            // CÓDIGO DO PROCEDIMENTO
  linha += padNum(cabecalho.cboAutorizador, 6) // CBO
  linha += padNum('1', 7)                    // Quantidade fixo 0000001
  linha += padText('', 14)                   // CNPJ Cessão
  linha += padText('', 6)                    // Nota Fiscal
  linha += padText('', 4)                    // CID Principal
  linha += padText('', 4)                    // CID Secundário
  linha += padText('', 3)                    // Código do Serviço
  linha += padText('', 3)                    // Código da Classificação
  linha += padText('', 8)                    // Sequencia da Equipe
  linha += padText('', 4)                    // Área da Equipe
  return linha
}

// Retorna ARRAY de linhas 13 com base no mapeamento do proc. da linha 14
export function gerarLinhas13(linhaExcel, numeroApac, cabecalho) {
  const procs13 = getProcedimentos13(linhaExcel['PROCEDIMENTOS'])
  return procs13.map(proc => gerarUmaLinha13(proc, numeroApac, cabecalho))
}
