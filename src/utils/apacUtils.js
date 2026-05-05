export function calcularDV(numero12) {
  const resto = Number(BigInt(numero12) % 11n)
  return resto === 10 ? 0 : resto
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
