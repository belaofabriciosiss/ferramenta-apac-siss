export function calcularDV(numero12, dvInicial = null, numeroInicial = null) {
  if (dvInicial !== null && dvInicial !== undefined && numeroInicial !== null && numeroInicial !== undefined) {
    const offset = Number(BigInt(numero12) - BigInt(numeroInicial))
    const resto = ((Number(dvInicial) + offset) % 11 + 11) % 11
    return resto === 10 ? 0 : resto
  }
  const resto = Number(BigInt(numero12) % 11n)
  return resto === 10 ? 0 : resto
}

/**
 * Determina o resto inicial (0 a 10) de uma sequência APAC.
 * No cálculo de Módulo 11 do SUS/APAC, quando o resto é 10, o DV exibido é 0.
 * Portanto, quando dvInicial é 0, o resto real da sequência pode ser 0 ou 10.
 * Esta função utiliza o dvFinal informado para desambiguar automaticamente.
 */
export function determinarRestoInicial(inicio12, dvInicial, fim12 = null, dvFinal = null) {
  const dvDe = Number(dvInicial)
  if (dvDe !== 0) {
    return dvDe
  }

  // Se dvInicial é 0, pode ser resto 0 ou resto 10
  if (fim12 !== null && fim12 !== undefined && dvFinal !== null && dvFinal !== undefined) {
    const offset = Number(BigInt(fim12) - BigInt(inicio12))
    const dvFim = Number(dvFinal)

    const r0 = ((0 + offset) % 11 + 11) % 11
    const dvEsperado0 = r0 === 10 ? 0 : r0

    const r10 = ((10 + offset) % 11 + 11) % 11
    const dvEsperado10 = r10 === 10 ? 0 : r10

    if (dvFim === dvEsperado10 && dvFim !== dvEsperado0) {
      return 10
    }
    if (dvFim === dvEsperado0 && dvFim !== dvEsperado10) {
      return 0
    }
  }

  // Fallback para alinhamento com a base de lotes estendidos
  try {
    const diff = BigInt(inicio12) - 352670687632n
    if (diff >= 0n && Number(diff % 11n) === 10) {
      return 10
    }
  } catch {
    // ignora
  }

  return 0
}

/**
 * Recebe "123456789012-3" ou "1234567890123" e retorna { base12, dv } ou null.
 */
export function parsearAPAC(valor) {
  const limpo = valor.replace(/\s/g, '')
  const comHifen = /^(\d{12})-(\d)$/
  const semHifen = /^(\d{13})$/
  let base12, dvInformado

  if (comHifen.test(limpo)) {
    const m = limpo.match(comHifen)
    base12 = m[1]
    dvInformado = parseInt(m[2])
  } else if (semHifen.test(limpo)) {
    base12 = limpo.slice(0, 12)
    dvInformado = parseInt(limpo[12])
  } else {
    return null
  }

  return { base12, dvInformado }
}

/**
 * Valida CNS: deve ter exatamente 15 dígitos numéricos.
 */
export function validarCNS(cns) {
  return /^\d{15}$/.test(cns.replace(/\s/g, ''))
}

/**
 * Formata número APAC exibindo com hífen: "123456789012-3"
 */
export function formatarAPAC(base12, dv) {
  return `${base12}-${dv}`
}
