import { useState } from 'react'
import styles from '../App.module.css'

const SECOES = [
  {
    id: 'consistencia',
    icone: '🔍',
    titulo: 'Regras de Consistência',
    descricao: 'Verificações aplicadas ao realizar a consistência da planilha.',
    cor: '#f97316',
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
    icone: '📋',
    titulo: 'Regra de Documento do Paciente',
    descricao: 'Prioridade de preenchimento dos campos de identificação na linha 14 do arquivo.',
    cor: '#0ea5e9',
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
    icone: '🔢',
    titulo: 'Regras de Numeração APAC',
    descricao: 'Como os números de APAC são gerados ou lidos.',
    cor: '#0ea5e9',
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
    icone: '⚙️',
    titulo: 'Regras de Procedimentos (Linhas 13)',
    descricao: 'Para cada atendimento, as linhas 13 do arquivo TXT são geradas na seguinte ordem fixa.',
    cor: '#0ea5e9',
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
    icone: '🗺️',
    titulo: 'Mapeamento de Procedimentos OCI',
    descricao: 'Procedimentos secundários gerados automaticamente nas linhas 13 com base no procedimento principal.',
    cor: '#008E7B',
    regras: [
      { id: 'R10', titulo: 'Cirurgia / Risco Cirúrgico (0902010018)', descricao: 'Gera secundário: 0211020036. CBO: 225120.', tipo: 'mapa' },
      { id: 'R11', titulo: 'Cardiologia (0902010026)', descricao: 'Gera secundário: 0211020036. CBO: 225120.', tipo: 'mapa' },
      { id: 'R12', titulo: 'ORL – Nasofaringe e Orofaringe (0904010031)', descricao: 'Gera secundários: 0209040041, 0209040025. CBO: 225275.', tipo: 'mapa' },
      { id: 'R13', titulo: 'Oftalmologia – 0 a 8 anos (0905010019)', descricao: 'Gera secundários: 0211060232, 0211060127, 0211060020. CBO: 225265.', tipo: 'mapa' },
      { id: 'R14', titulo: 'Oftalmologia – Estrabismo (0905010027)', descricao: 'Gera secundários: 0211060232, 0211060127, 0211060259, 0211060020. CBO: 225265.', tipo: 'mapa' },
      { id: 'R15', titulo: 'Oftalmologia – a partir de 9 anos (0905010035)', descricao: 'Gera secundários: 0211060259, 0211060127, 0211060020. CBO: 225265.', tipo: 'mapa' },
      { id: 'R16', titulo: 'Oftalmologia – Retinopatia Diabética (0905010043)', descricao: 'Gera secundários: 0211060127, 0211060178, 0211060020, 0211060259. CBO: 225265.', tipo: 'mapa' },
      { id: 'R17', titulo: 'Câncer de Mama – Progressão I (0901010090)', descricao: 'Gera secundários: 0201010585, 0203010043. CBO: 225250.', tipo: 'mapa' },
      { id: 'R18', titulo: 'Câncer de Mama – Progressão II (0901010103)', descricao: 'Gera secundários: 0201010607, 0203020065. CBO: 225250.', tipo: 'mapa' },
      { id: 'R19', titulo: 'Câncer de Colo do Útero – Investigação (0901010057)', descricao: 'Gera secundários: 0201010666, 0203020081. CBO: 225280.', tipo: 'mapa' },
      { id: 'R20', titulo: 'Câncer de Colo do Útero – Aval. Terapêutica I (0901010111)', descricao: 'Gera secundários: 0409060089, 0203020022. CBO: 225280.', tipo: 'mapa' },
      { id: 'R21', titulo: 'Câncer de Colo do Útero – Aval. Terapêutica II (0901010120)', descricao: 'Gera secundários: 0409060305, 0203020022. CBO: 225280.', tipo: 'mapa' },
      { id: 'R22', titulo: 'Ortopedia com Radiologia e Ultrassonografia (0903010020)', descricao: 'Gera secundário: 0205020062. CBO: 225270.', tipo: 'mapa' },
      { id: 'R23', titulo: 'Síndrome Coronariana Crônica (0902010034)', descricao: 'Gera secundários: 0211020036, 0211020060. CBO: 225120.', tipo: 'mapa' },
      { id: 'R24', titulo: 'Câncer Gástrico (0901010073)', descricao: 'Gera secundário: 0209010037. CBO: 225165.', tipo: 'mapa' },
      { id: 'R25', titulo: 'Saúde da Mulher – Ginecologia I (0906010012)', descricao: 'Gera secundário: 0205020186. CBO: 225250.', tipo: 'mapa' },
      { id: 'R26', titulo: 'Saúde da Mulher – Ginecologia II (0906010020)', descricao: 'Gera secundário: 0205020160. CBO: 225250.', tipo: 'mapa' },
      { id: 'R27', titulo: 'Neuro Oftalmologia (0905010060)', descricao: 'Gera secundários: 0211060020, 0211060038, 0211060127, 0211060178, 0211060224, 0211060259. CBO: 225265.', tipo: 'mapa' },
      { id: 'R28', titulo: 'Oncologia Oftalmológica (0905010051)', descricao: 'Gera secundários: 0205020089, 0211060020, 0211060127, 0211060259. CBO: 225265.', tipo: 'mapa' },
      { id: 'R29', titulo: 'Gestão do Pré-Operatório (0902010077)', descricao: 'Nenhum procedimento secundário além do fixo 0301010072. CBO: 225120.', tipo: 'mapa' },
      { id: 'R30', titulo: 'Câncer de Mama Inicial (0901010014) — Dinâmico', descricao: 'Procedimentos secundários lidos da coluna PROCEDIMENTO_SECUNDARIO da planilha. CBO: 225250.', tipo: 'destaque' },
      { id: 'R31', titulo: 'Ortopedia (0903010011) — Dinâmico', descricao: 'Procedimentos secundários lidos da coluna PROCEDIMENTO_SECUNDARIO da planilha. CBO: 225270.', tipo: 'destaque' },
    ],
  },
  {
    id: 'controle',
    icone: '🧮',
    titulo: 'Cálculo do Campo de Controle',
    descricao: 'Regra para o valor de controle do arquivo (linha 01).',
    cor: '#0ea5e9',
    regras: [
      {
        id: 'R27',
        titulo: 'Soma de Controle',
        descricao: 'Para cada atendimento, soma-se: código do proc. principal + 1, código 0301010072 + 1, código de cada proc. mapeado + 1, e o número APAC (linha 06). O valor final é: (somaTotal mod 1111) + 1111, resultando em um valor entre 1111 e 2221.',
        tipo: 'info',
      },
    ],
  },
  {
    id: 'arquivo',
    icone: '📄',
    titulo: 'Regras do Arquivo TXT',
    descricao: 'Regras gerais de geração e formatação do arquivo de saída.',
    cor: '#0ea5e9',
    regras: [
      {
        id: 'R28',
        titulo: 'Nome do Arquivo',
        descricao: 'O arquivo é nomeado como AP{CNES}.{EXT}, onde EXT é a sigla do mês da competência (JAN, FEV, MAR, ABR, MAI, JUN, JUL, AGO, SET, OUT, NOV, DEZ).',
        tipo: 'info',
      },
      {
        id: 'R29',
        titulo: 'Remoção de Acentos',
        descricao: 'Todos os campos de texto são normalizados: acentos e caracteres diacríticos são removidos antes de gravação no arquivo (Á→A, Ã→A, Ó→O, ç→c, etc.).',
        tipo: 'info',
      },
      {
        id: 'R30',
        titulo: 'Número de Residência vazio',
        descricao: 'Quando o campo "NÚMERO CORRESPONDENTE A RESIDÊNCIA DO PACIENTE" estiver vazio, o valor "S/N" é gravado automaticamente no arquivo.',
        tipo: 'info',
      },
      {
        id: 'R31',
        titulo: 'Profissional por Linha (modo Planilha)',
        descricao: 'No modo "Usar Dados da Planilha", os campos NOME PROFISSIONAL AUTORIZADOR, CNS DO AUTORIZADOR e CBO DO AUTORIZADOR são lidos linha a linha da planilha, permitindo autorizadores diferentes por atendimento.',
        tipo: 'info',
      },
    ],
  },
]

const BADGE = {
  alerta:   { label: '⚠ Consistência', bg: '#fed7aa', color: '#9a3412' },
  info:     { label: 'ℹ Regra',        bg: '#bae6fd', color: '#0c4a6e' },
  destaque: { label: '★ Atenção',      bg: '#e9d5ff', color: '#581c87' },
  mapa:     { label: '→ Mapeamento',   bg: '#bbf7d0', color: '#14532d' },
}

const BG = {
  alerta:   '#fff7ed',
  info:     '#f0f9ff',
  destaque: '#faf5ff',
  mapa:     '#f0fdf9',
}

const BORDA = {
  alerta:   '#f97316',
  info:     '#0ea5e9',
  destaque: '#a855f7',
  mapa:     '#008E7B',
}

const totalRegras = SECOES.reduce((t, s) => t + s.regras.length, 0)

export default function Regras() {
  const [secaoAberta, setSecaoAberta] = useState(null)

  const toggle = (id) => setSecaoAberta(prev => prev === id ? null : id)

  return (
    <div style={{ marginLeft: '260px', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerText}>
            <h1 className={styles.headerTitle}>Regras Aplicadas</h1>
            <p className={styles.headerSub}>
              Resumo de todas as {totalRegras} regras de negócio aplicadas nesta ferramenta.
            </p>
          </div>
        </div>
      </header>

      <main className={styles.main} style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className={styles.card}>
          {SECOES.map((secao, idx) => {
            const aberta = secaoAberta === secao.id
            return (
              <div key={secao.id}>
                {/* Separador entre seções */}
                {idx > 0 && <div className={styles.divider} />}

                <section className={styles.section}>
                  {/* Cabeçalho clicável da seção */}
                  <button
                    onClick={() => toggle(secao.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: aberta ? '#f0fdf9' : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.875rem 1rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.2s',
                      gap: '1rem',
                    }}
                    aria-expanded={aberta}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1 }}>
                      {/* Número da seção */}
                      <span className={styles.sectionNumber} style={{ flexShrink: 0 }}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h2 className={styles.sectionTitle} style={{ color: aberta ? '#008E7B' : undefined }}>
                          {secao.icone} {secao.titulo}
                        </h2>
                        <p className={styles.sectionDesc}>{secao.descricao}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: '700', background: '#e5e7eb',
                        color: '#6b7280', borderRadius: '999px', padding: '0.2rem 0.6rem',
                        whiteSpace: 'nowrap',
                      }}>
                        {secao.regras.length} regra{secao.regras.length > 1 ? 's' : ''}
                      </span>
                      <span style={{
                        fontSize: '1rem', color: aberta ? '#008E7B' : '#9ca3af',
                        transform: aberta ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s, color 0.2s',
                        display: 'inline-block',
                      }}>▾</span>
                    </div>
                  </button>

                  {/* Conteúdo expandido */}
                  {aberta && (
                    <div style={{
                      marginTop: '0.75rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                      gap: '0.75rem',
                      padding: '0 0.25rem 0.5rem',
                    }}>
                      {secao.regras.map(regra => (
                        <div
                          key={regra.id}
                          style={{
                            background: BG[regra.tipo],
                            borderLeft: `3px solid ${BORDA[regra.tipo]}`,
                            borderRadius: '8px',
                            padding: '0.875rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{
                              fontSize: '0.65rem', fontWeight: '700',
                              padding: '0.125rem 0.5rem', borderRadius: '999px',
                              background: BADGE[regra.tipo].bg,
                              color: BADGE[regra.tipo].color,
                              textTransform: 'uppercase', letterSpacing: '0.03em',
                            }}>
                              {BADGE[regra.tipo].label}
                            </span>
                            <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#9ca3af', fontFamily: 'monospace' }}>
                              {regra.id}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#1e293b', margin: '0 0 0.375rem' }}>
                            {regra.titulo}
                          </p>
                          <p style={{ fontSize: '0.775rem', color: '#4b5563', margin: 0, lineHeight: '1.55' }}>
                            {regra.descricao}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )
          })}
        </div>

        {/* Rodapé informativo */}
        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#9ca3af', fontSize: '0.8rem' }}>
          Ferramenta de Exportação APAC — {totalRegras} regras ativas · v1.0.0
        </div>
      </main>
    </div>
  )
}
