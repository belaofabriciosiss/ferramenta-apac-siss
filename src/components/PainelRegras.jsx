import { useState } from 'react'
import styles from './PainelRegras.module.css'

const SECOES = [
  {
    id: 'consistencia',
    titulo: '🔍 Regras de Consistência',
    descricao: 'Verificações aplicadas ao realizar a consistência da planilha.',
    regras: [
      {
        id: 'R01',
        titulo: 'Validação de E-mail',
        descricao: 'O campo "EMAIL DO PACIENTE" é validado quando preenchido. Se o valor não corresponder ao formato de um e-mail válido, o registro é apontado como erro.',
        tipo: 'alerta',
      },
      {
        id: 'R02',
        titulo: 'Profissionais Distintos',
        descricao: 'O "NOME PROFISSIONAL AUTORIZADOR" e o "NOME DO MÉDICO RESPONSÁVEL" não podem ser idênticos. Quando os dois campos estão preenchidos e são iguais, o registro é apontado como erro.',
        tipo: 'alerta',
      },
      {
        id: 'R03',
        titulo: 'Duplicidade de Paciente + Procedimento',
        descricao: 'A combinação de Paciente (identificado por CPF, Cartão SUS ou CD_RECEPCAO, nessa ordem de prioridade) e PROCEDIMENTO_PRINCIPAL não pode aparecer mais de uma vez na mesma planilha. Registros duplicados são apontados como erro.',
        tipo: 'alerta',
      },
    ],
  },
  {
    id: 'documentos',
    titulo: '📋 Regra de Documento do Paciente',
    descricao: 'Prioridade de preenchimento dos campos de identificação na linha 14 do arquivo.',
    regras: [
      {
        id: 'R04',
        titulo: 'CPF tem prioridade sobre Cartão SUS',
        descricao: 'Se o campo "CPF DO INDIVIDUO" estiver preenchido, ele é usado e o campo Cartão SUS é enviado em branco. Caso contrário, o "CARTÃO SUS DO PACIENTE" é usado e o CPF é enviado em branco. Nunca os dois são preenchidos simultaneamente.',
        tipo: 'info',
      },
    ],
  },
  {
    id: 'numeracao',
    titulo: '🔢 Regras de Numeração APAC',
    descricao: 'Como os números de APAC são gerados ou lidos.',
    regras: [
      {
        id: 'R05',
        titulo: 'Modo: Lote Cadastrado',
        descricao: 'Os números são gerados sequencialmente a partir do "próximo número" do lote selecionado. Um Dígito Verificador (DV) é calculado e concatenado para cada número. Ao exportar, o lote é decrementado no banco de dados.',
        tipo: 'info',
      },
      {
        id: 'R06',
        titulo: 'Modo: Numeração da Planilha',
        descricao: 'Os números são lidos diretamente da coluna "NUMERO APAC (12 DIGITOS E 1 DIGITO VERIFICADOR)" da planilha. Apenas dígitos são considerados; o valor é normalizado para 13 caracteres. Nenhum lote é debitado.',
        tipo: 'info',
      },
    ],
  },
  {
    id: 'procedimentos',
    titulo: '⚙️ Regras de Procedimentos (Linhas 13)',
    descricao: 'Para cada atendimento, as linhas 13 do arquivo TXT são geradas na seguinte ordem fixa.',
    regras: [
      {
        id: 'R07',
        titulo: 'Ordem das Linhas 13',
        descricao: '1ª linha: Procedimento principal (da coluna PROCEDIMENTO_PRINCIPAL). 2ª linha: Código fixo 0301010072 (quantidade 1). 3ª linha em diante: Procedimentos mapeados/secundários do OCI (quantidade 1 cada).',
        tipo: 'info',
      },
      {
        id: 'R08',
        titulo: 'CBO das Linhas 13',
        descricao: 'O CBO utilizado nas linhas 13 é determinado pelo procedimento principal. Se não houver mapeamento, o CBO do autorizador informado na tela é usado como fallback.',
        tipo: 'info',
      },
      {
        id: 'R09',
        titulo: 'Procedimentos Dinâmicos (Ortopedia e Câncer de Mama Inicial)',
        descricao: 'Para os procedimentos 0903010011 (Ortopedia) e 0901010014 (Câncer de Mama Inicial), os procedimentos secundários são lidos dinamicamente da coluna "PROCEDIMENTO_SECUNDARIO" da planilha (separados por vírgula).',
        tipo: 'destaque',
      },
    ],
  },
  {
    id: 'mapeamento',
    titulo: '🗺️ Mapeamento de Procedimentos OCI',
    descricao: 'Procedimentos secundários gerados automaticamente nas linhas 13 com base no procedimento principal.',
    regras: [
      {
        id: 'R10',
        titulo: 'Cirurgia / Risco Cirúrgico (0902010018)',
        descricao: 'Gera secundário: 0211020036. CBO: 225120.',
        tipo: 'mapa',
      },
      {
        id: 'R11',
        titulo: 'Cardiologia (0902010026)',
        descricao: 'Gera secundário: 0211020036. CBO: 225120.',
        tipo: 'mapa',
      },
      {
        id: 'R12',
        titulo: 'ORL – Nasofaringe e Orofaringe (0904010031)',
        descricao: 'Gera secundários: 0209040041, 0209040025. CBO: 225275.',
        tipo: 'mapa',
      },
      {
        id: 'R13',
        titulo: 'Oftalmologia – 0 a 8 anos (0905010019)',
        descricao: 'Gera secundários: 0211060232, 0211060127, 0211060020. CBO: 225265.',
        tipo: 'mapa',
      },
      {
        id: 'R14',
        titulo: 'Oftalmologia – Estrabismo (0905010027)',
        descricao: 'Gera secundários: 0211060232, 0211060127, 0211060259, 0211060020. CBO: 225265.',
        tipo: 'mapa',
      },
      {
        id: 'R15',
        titulo: 'Oftalmologia – a partir de 9 anos (0905010035)',
        descricao: 'Gera secundários: 0211060259, 0211060127, 0211060020. CBO: 225265.',
        tipo: 'mapa',
      },
      {
        id: 'R16',
        titulo: 'Oftalmologia – Retinopatia Diabética (0905010043)',
        descricao: 'Gera secundários: 0211060127, 0211060178, 0211060020, 0211060259. CBO: 225265.',
        tipo: 'mapa',
      },
      {
        id: 'R17',
        titulo: 'Câncer de Mama – Progressão I (0901010090)',
        descricao: 'Gera secundários: 0201010585, 0203010043. CBO: 225250.',
        tipo: 'mapa',
      },
      {
        id: 'R18',
        titulo: 'Câncer de Mama – Progressão II (0901010103)',
        descricao: 'Gera secundários: 0201010607, 0203020065. CBO: 225250.',
        tipo: 'mapa',
      },
      {
        id: 'R19',
        titulo: 'Câncer de Colo do Útero – Investigação (0901010057)',
        descricao: 'Gera secundários: 0201010666, 0203020081. CBO: 225280.',
        tipo: 'mapa',
      },
      {
        id: 'R20',
        titulo: 'Câncer de Colo do Útero – Aval. Terapêutica I (0901010111)',
        descricao: 'Gera secundários: 0409060089, 0203020022. CBO: 225280.',
        tipo: 'mapa',
      },
      {
        id: 'R21',
        titulo: 'Câncer de Colo do Útero – Aval. Terapêutica II (0901010120)',
        descricao: 'Gera secundários: 0409060305, 0203020022. CBO: 225280.',
        tipo: 'mapa',
      },
      {
        id: 'R22',
        titulo: 'Câncer de Mama Inicial (0901010014) — Dinâmico',
        descricao: 'Procedimentos secundários lidos da coluna PROCEDIMENTO_SECUNDARIO da planilha. CBO: 225250.',
        tipo: 'destaque',
      },
      {
        id: 'R23',
        titulo: 'Ortopedia (0903010011) — Dinâmico',
        descricao: 'Procedimentos secundários lidos da coluna PROCEDIMENTO_SECUNDARIO da planilha. CBO: 225270.',
        tipo: 'destaque',
      },
    ],
  },
  {
    id: 'controle',
    titulo: '🧮 Cálculo do Campo de Controle',
    descricao: 'Regra para o valor de controle do arquivo (linha 01).',
    regras: [
      {
        id: 'R24',
        titulo: 'Soma de Controle',
        descricao: 'Para cada atendimento, soma-se: código do proc. principal + 1, código 0301010072 + 1, código de cada proc. mapeado + 1, e o número APAC (linha 06). O valor final é: (somaTotal mod 1111) + 1111, resultando em um valor entre 1111 e 2221.',
        tipo: 'info',
      },
    ],
  },
  {
    id: 'cabecalho',
    titulo: '📄 Regras do Arquivo TXT',
    descricao: 'Regras gerais de geração e formatação do arquivo de saída.',
    regras: [
      {
        id: 'R25',
        titulo: 'Nome do Arquivo',
        descricao: 'O arquivo é nomeado como AP{CNES}.{EXT}, onde EXT é a sigla do mês da competência (JAN, FEV, MAR, ABR, MAI, JUN, JUL, AGO, SET, OUT, NOV, DEZ).',
        tipo: 'info',
      },
      {
        id: 'R26',
        titulo: 'Remoção de Acentos',
        descricao: 'Todos os campos de texto são normalizados: acentos e caracteres diacríticos são removidos antes de gravação no arquivo (Á→A, Ã→A, Ó→O, ç→c, etc.).',
        tipo: 'info',
      },
      {
        id: 'R27',
        titulo: 'Número de Residência vazio',
        descricao: 'Quando o campo "NÚMERO CORRESPONDENTE A RESIDÊNCIA DO PACIENTE" estiver vazio, o valor "S/N" é gravado automaticamente no arquivo.',
        tipo: 'info',
      },
      {
        id: 'R28',
        titulo: 'Profissional por Linha (modo Planilha)',
        descricao: 'No modo "Usar Dados da Planilha", os campos NOME PROFISSIONAL AUTORIZADOR, CNS DO AUTORIZADOR e CBO DO AUTORIZADOR são lidos linha a linha da planilha, permitindo autorizadores diferentes por atendimento.',
        tipo: 'info',
      },
    ],
  },
]

const BADGE_LABEL = {
  alerta: '⚠ Consistência',
  info: 'ℹ Regra',
  destaque: '★ Atenção',
  mapa: '→ Mapeamento',
}

export default function PainelRegras({ aberto, onFechar }) {
  const [secaoAberta, setSecaoAberta] = useState(null)

  const toggleSecao = (id) => setSecaoAberta(prev => prev === id ? null : id)

  return (
    <>
      {/* Overlay */}
      {aberto && (
        <div
          className={styles.overlay}
          onClick={onFechar}
          aria-hidden="true"
        />
      )}

      {/* Painel lateral */}
      <aside className={`${styles.painel} ${aberto ? styles.painelAberto : ''}`} role="dialog" aria-label="Painel de Regras">
        <div className={styles.cabecalho}>
          <div className={styles.cabecalhoTitulo}>
            <span className={styles.cabecalhoIcone}>📖</span>
            <div>
              <h2 className={styles.titulo}>Regras Aplicadas</h2>
              <p className={styles.subtitulo}>{SECOES.reduce((t, s) => t + s.regras.length, 0)} regras ativas nesta versão</p>
            </div>
          </div>
          <button className={styles.btnFechar} onClick={onFechar} aria-label="Fechar painel">✕</button>
        </div>

        <div className={styles.corpo}>
          {SECOES.map(secao => (
            <div key={secao.id} className={styles.secao}>
              <button
                className={`${styles.secaoHeader} ${secaoAberta === secao.id ? styles.secaoHeaderAberta : ''}`}
                onClick={() => toggleSecao(secao.id)}
                aria-expanded={secaoAberta === secao.id}
              >
                <span className={styles.secaoTitulo}>{secao.titulo}</span>
                <span className={`${styles.secaoChevron} ${secaoAberta === secao.id ? styles.secaoChevronAberto : ''}`}>▾</span>
              </button>

              {secaoAberta === secao.id && (
                <div className={styles.secaoCorpo}>
                  <p className={styles.secaoDescricao}>{secao.descricao}</p>
                  <div className={styles.listaRegras}>
                    {secao.regras.map(regra => (
                      <div key={regra.id} className={`${styles.regra} ${styles[`regra_${regra.tipo}`]}`}>
                        <div className={styles.regraHeader}>
                          <span className={`${styles.badge} ${styles[`badge_${regra.tipo}`]}`}>
                            {BADGE_LABEL[regra.tipo]}
                          </span>
                          <span className={styles.regraId}>{regra.id}</span>
                        </div>
                        <p className={styles.regraTitulo}>{regra.titulo}</p>
                        <p className={styles.regraDescricao}>{regra.descricao}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={styles.rodape}>
          <span>Ferramenta de Exportação APAC</span>
          <span className={styles.rodapeVersao}>v1.0.0</span>
        </div>
      </aside>
    </>
  )
}
