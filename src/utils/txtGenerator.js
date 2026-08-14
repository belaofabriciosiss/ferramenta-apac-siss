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

// Formata data para AAAAMMDD, tratando tanto strings quanto objetos Date do Excel
function formatarDataAAAAMMDD(valor) {
  if (!valor) return '00000000'
  // Se o Excel converteu para objeto Date
  if (valor instanceof Date) {
    const y = valor.getFullYear()
    const m = String(valor.getMonth() + 1).padStart(2, '0')
    const d = String(valor.getDate()).padStart(2, '0')
    return `${y}${m}${d}`
  }
  // Se vier como string ou número, pega só os dígitos
  const s = String(valor).replace(/\D/g, '')
  return s.padStart(8, '0').slice(0, 8)
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

/**
 * Regra CPF x Cartão SUS:
 * - Prioridade para CPF. Se existir, preenche CPF e deixa Cartão SUS em branco.
 * - Se não houver CPF, preenche Cartão SUS e deixa CPF em branco.
 */
function resolverDocumentoPaciente(linhaExcel) {
  const cpf = String(linhaExcel['CPF DO INDIVIDUO'] || '').replace(/\D/g, '')
  const cns = String(linhaExcel['CART\u00c3O SUS DO PACIENTE'] || '').replace(/\D/g, '')

  if (cpf.length > 0) {
    return {
      cartaoSus: ''.padStart(15, ' '), // branco
      cpf: cpf.padStart(11, '0').slice(0, 11)
    }
  } else {
    return {
      cartaoSus: cns.padStart(15, '0').slice(0, 15),
      cpf: ''.padStart(11, ' ') // branco
    }
  }
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
  const _numResidencia = String(linhaExcel['NÚMERO CORRESPONDENTE A RESIDÊNCIA DO PACIENTE'] || '').trim()
  linha += padText(_numResidencia || 'S/N', 5) // NUMERO (S/N quando vazio)
  linha += padText(linhaExcel['COMPLEMENTO DO LOGRADOURO DO PACIENTE'], 10) // COMPLEMENTO
  linha += padNum(linhaExcel['CEP (8 DÍGITOS)'], 8) // CEP
  linha += padText(linhaExcel['CÓDIGO DO MUNICIPIO (CÓD. IBGE)'], 7) // MUNICIPIO (pode ser " " caso nao tenha DV)
  linha += formatarDataAAAAMMDD(linhaExcel['DATA DE NASCIMENTO 8 DIGITOS']) // DATA DE NASCIMENTO (AAAAMMDD)
  linha += padText(linhaExcel['SEXO DO PACIENTE'], 1) // SEXO
  linha += padText(linhaExcel['NOME DO MÉDICO RESPONSÁVEL'], 30) // MÉDICO RESPONSÁVEL
  linha += padNum(linhaExcel['PROCEDIMENTO_PRINCIPAL'], 10) // PROCEDIMENTO PRINCIPAL
  linha += padNum(linhaExcel['CÓDIGO DO MOTIVO DE SAÍDA/PERMANENCIA - PORTARIA Nº 719, DE 28 DEZEMBRO DE 2007'], 2) // MOTIVO SAÍDA
  linha += padText(linhaExcel['DATA (AAAAMMDD) DA OCORRÊNCIA NO CASO DE ALTA, TRANSFERENCIA OU ÓBITO'], 8) // DATA SAÍDA
  linha += padText(cabecalho.nomeAutorizador, 30) // PROFISSIONAL AUTORIZADOR DO FORMULÁRIO (30)
  const docPaciente = resolverDocumentoPaciente(linhaExcel)
  linha += docPaciente.cartaoSus // CARTÃO SUS (15) - branco se tiver CPF
  linha += padNum(linhaExcel['CNS MÉDICO RESPONSÁVEL'], 15) // CNS MÉDICO
  linha += padNum(cabecalho.cnsAutorizador, 15) // CNS AUTORIZADOR DO FORMULÁRIO (15)
  linha += padText(linhaExcel['CID CAUSAS ASSOCIADAS'], 4) // CID
  linha += padText(linhaExcel['NUMERO DO PRONTUÁRIO'], 10) // PRONTUÁRIO
  linha += padText(linhaExcel['CÓDIGO CNES DO SOLICITANTE (7 DÍGITOS)'], 7) // CNES SOLICITANTE
  linha += formatarDataAAAAMMDD(linhaExcel['DATA DA SOLICITAÇÃO (YYYYMMDD) (8 DÍGITOS)']) // DATA SOLICITAÇÃO
  linha += formatarDataAAAAMMDD(linhaExcel['DATA DA AUTORIZAÇÃO (YYYYMMDD)']) // DATA AUTORIZAÇÃO
  linha += padText(cabecalho.codigoEmissor, 10) // CÓDIGO DO EMISSOR (da tela)
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
  linha += docPaciente.cpf // CPF DO INDIVIDUO (11) - branco se tiver Cartão SUS
  linha += padText(linhaExcel['IDENTIFICAÇÃO NACIONAL DE EQUIPE'], 10) // EQUIPE
  linha += padText(linhaExcel['PESSOA EM SITUAÇÃO DE RUA'], 1) // PESSOA EM SITUAÇÃO DE RUA (N ou S ou branco) - Ops, truncou na msg usuário "PESSOA EM SITUAÇÃO DE 81" -> vou usar padText
  
  const fonteOrc = String(linhaExcel['FONTE ORÇAMENTÁRIA'] || '').trim()
  linha += fonteOrc ? padNum(fonteOrc, 2) : padText('', 2) // FONTE ORÇAMENTÁRIA (2) - NUM
  
  linha += padText(linhaExcel['EMENDAS PARLAMENTARES'], 1) // EMENDAS PARLAMENTARES (1) - CHAR
  linha += padText(linhaExcel['PESSOA SEM CPF'], 1) // PESSOA SEM CPF (1) - CHAR
  
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
  // Cirurgia / Risco Cirúrgico
  '0902010018': ['0211020036'],
  // Cardiologia
  '0902010026': ['0211020036'],
  // ORL - Nasofaringe e Orofaringe
  '0904010031': ['0209040041', '0209040025'],
  // Oftalmologia - 0 a 8 anos
  '0905010019': ['0211060232', '0211060127', '0211060020'],
  // Oftalmologia - Estrabismo
  '0905010027': ['0211060232', '0211060127', '0211060259', '0211060020'],
  // Oftalmologia - a partir de 9 anos
  '0905010035': ['0211060259', '0211060127', '0211060020'],
  // Oftalmologia - Retinopatia Diabética
  '0905010043': ['0211060127', '0211060178', '0211060020', '0211060259'],
  // Câncer de Mama - Progressão I
  '0901010090': ['0201010585', '0203010043'],
  // Câncer de Mama - Progressão II
  '0901010103': ['0201010607', '0203020065'],
  // Câncer de Colo do Útero - Investigação
  '0901010057': ['0201010666', '0203020081'],
  // Câncer de Colo do Útero - Avaliação Terapêutica I
  '0901010111': ['0409060089', '0203020022'],
  // Câncer de Colo do Útero - Avaliação Terapêutica II
  '0901010120': ['0409060305', '0203020022'],
  // Ortopedia com Radiologia e Ultrassonografia
  '0903010020': ['0205020062'],
  // Síndrome Coronariana Crônica
  '0902010034': ['0211020036', '0211020060'],
  // Câncer Gástrico
  '0901010073': ['0209010037'],
  // Saúde da Mulher (Ginecologia) I
  '0906010012': ['0205020186'],
  // Saúde da Mulher (Ginecologia) II
  '0906010020': ['0205020160'],
  // Neuro Oftalmologia
  '0905010060': ['0211060020', '0211060038', '0211060127', '0211060178', '0211060224', '0211060259'],
  // Oncologia Oftalmológica
  '0905010051': ['0205020089', '0211060020', '0211060127', '0211060259'],
  // Gestão do Pré-Operatório (sem procedimentos secundários além do fixo)
  '0902010077': [],
}
// Nota: 0901010014 (Câncer de Mama Inicial) e 0903010011 (Ortopedia) usam
// PROCEDIMENTO_SECUNDARIO dinâmico — veja PROCS_DINAMICOS abaixo.

// CBO fixo por procedimento principal (todas as linhas 13 do atendimento usam o mesmo CBO)
const MAPA_CBO_PROCEDIMENTO = {
  '0902010018': '225120', // OCI Avaliação de Risco Cirúrgico
  '0902010026': '225120', // OCI Avaliação Cardiológica
  '0903010011': '225270', // OCI Avaliação Diagnóstica em Ortopedia com Radiologia
  '0904010031': '225275', // OCI Avaliação Diagnóstica de Nasofaringe e Orofaringe
  '0905010019': '225265', // OCI Oftalmologia - 0 a 8 anos
  '0905010027': '225265', // OCI Avaliação de Estrabismo
  '0905010035': '225265', // OCI Oftalmologia - a partir de 9 anos
  '0905010043': '225265', // OCI Avaliação de Retinopatia Diabética
  '0901010014': '225250', // OCI Avaliação Diagnóstica Inicial de Câncer de Mama
  '0901010090': '225250', // OCI Progressão da Avaliação de Câncer de Mama - I
  '0901010103': '225250', // OCI Progressão da Avaliação de Câncer de Mama - II
  '0901010057': '225280', // OCI Investigação Diagnóstica de Câncer de Colo do Útero
  '0901010111': '225280', // OCI Avaliação Diagnóstica e Terapêutica de Câncer de Colo do Útero - I
  '0901010120': '225280', // OCI Avaliação Diagnóstica e Terapêutica de Câncer de Colo do Útero - II
  '0903010020': '225270', // OCI Avaliação Diagnóstica em Ortopedia com Radiologia e Ultrassonografia
  '0902010034': '225120', // OCI Avaliação Diagnóstica Inicial - Síndrome Coronariana Crônica
  '0901010073': '225165', // OCI Avaliação Diagnóstica de Câncer Gástrico
  '0906010012': '225250', // OCI Avaliação Diagnóstica Inicial de Saúde da Mulher (Ginecologia) I
  '0906010020': '225250', // OCI Avaliação Diagnóstica Inicial de Saúde da Mulher (Ginecologia) II
  '0905010060': '225265', // OCI Avaliação Diagnóstica em Neuro Oftalmologia
  '0905010051': '225265', // OCI Avaliação Inicial para Oncologia Oftalmológica
  '0902010077': '225120', // OCI Gestão do Pré-Operatório
}

// Parseia a coluna PROCEDIMENTO_SECUNDARIO (códigos separados por vírgula)
// Normaliza cada código para 10 dígitos com zero à esquerda
function parseProcedimentosSecundarios(valorColuna) {
  const raw = String(valorColuna || '')
  return raw
    .split(',')
    .map(s => normalizarProcedimento(s.trim()))
    .filter(s => s.replace(/0/g, '').length > 0) // remove entradas vazias
}

// Normaliza o código do procedimento vindo do Excel (sem o zero à esquerda)
export function normalizarProcedimento(valorExcel) {
  const cleaned = String(valorExcel || '').replace(/\D/g, '')
  return cleaned.padStart(10, '0')
}

// Retorna os procedimentos mapeados para as linhas 13 (estáticos ou dinâmicos)
export function getProcedimentos13(valorExcel) {
  const procNorm = normalizarProcedimento(valorExcel)
  return MAPA_PROCEDIMENTOS_13[procNorm] || []
}

// Procedimentos que leem procs secundários dinamicamente da coluna PROCEDIMENTO_SECUNDARIO
const PROCS_DINAMICOS = new Set(['0903010011', '0901010014'])

// Versão completa: retorna procs dinâmicos (PROCEDIMENTO_SECUNDARIO) ou estáticos (MAPA)
export function getProcedimentos13Completo(procPrincipal, linhaExcel) {
  if (PROCS_DINAMICOS.has(procPrincipal)) {
    return parseProcedimentosSecundarios(String(linhaExcel['PROCEDIMENTO_SECUNDARIO'] || '').trim())
  }
  return MAPA_PROCEDIMENTOS_13[procPrincipal] || []
}

// Gera UMA linha 13 para um procedimento específico com CBO e quantidade variáveis
function gerarUmaLinha13(codigoProc, quantidade, cbo, numeroApac, cabecalho) {
  let linha = ''
  linha += '13'               // Indicador 13
  linha += padNum(cabecalho.competencia, 6)  // ANO/MÊS PRODUÇÃO
  linha += padNum(numeroApac, 13)            // NÚMERO APAC
  linha += padNum(codigoProc, 10)            // CÓDIGO DO PROCEDIMENTO
  linha += padNum(cbo, 6)                    // CBO fixo do procedimento
  linha += padNum(String(quantidade), 7)     // QUANTIDADE
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

/**
 * Retorna ARRAY de linhas 13 para cada atendimento na ordem:
 * 1. Proc. principal da OCI (da planilha)         → qty 1
 * 2. Código fixo 0301010072                       → qty qty0301 (padrão 1, lido da coluna QUANTIDADE 0301010072)
 * 3. Procs mapeados (fixos ou dinâmicos)          → qty 1 cada
 *
 * Para 0903010011 (Ortopedia), os procs da etapa 3 são lidos
 * da coluna PROCEDIMENTO_SECUNDARIO da planilha.
 */
export function gerarLinhas13(linhaExcel, numeroApac, cabecalho, qty0301 = 1) {
  // procPrincipal vem sempre da coluna PROCEDIMENTO_PRINCIPAL da planilha.
  // Para Ortopedia (0903010011), os procedimentos secundarios vem de PROCEDIMENTO_SECUNDARIO.
  const procPrincipal = normalizarProcedimento(linhaExcel['PROCEDIMENTO_PRINCIPAL'])
  const procsMapeados = getProcedimentos13Completo(procPrincipal, linhaExcel)

  // CBO fixo do procedimento; fallback para o CBO do autorizador caso não mapeado
  const cbo = MAPA_CBO_PROCEDIMENTO[procPrincipal] || cabecalho.cboAutorizador

  const linhas = []

  // 1. Linha com o procedimento principal
  linhas.push(gerarUmaLinha13(procPrincipal, 1, cbo, numeroApac, cabecalho))

  // 2. Linha fixa 0301010072 — quantidade lida da planilha ou padrão 1
  linhas.push(gerarUmaLinha13('0301010072', qty0301, cbo, numeroApac, cabecalho))

  // 3. Linhas com cada procedimento mapeado para o OCI
  for (const proc of procsMapeados) {
    linhas.push(gerarUmaLinha13(proc, 1, cbo, numeroApac, cabecalho))
  }

  // 4. Linhas com procedimentos compatíveis (coluna PROCEDIMENTO_COMPATIVEL — separados por vírgula)
  const procsCompativeis = parseProcedimentosSecundarios(String(linhaExcel['PROCEDIMENTO_COMPATIVEL'] || ''))
  for (const proc of procsCompativeis) {
    linhas.push(gerarUmaLinha13(proc, 1, cbo, numeroApac, cabecalho))
  }

  return linhas
}
