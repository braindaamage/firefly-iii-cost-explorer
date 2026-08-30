export interface StickyHeaderMetrics {
  /** table.getBoundingClientRect().top — negativo cuando la tabla pasó el top del viewport */
  tableTop: number
  tableHeight: number
  theadHeight: number
  tfootHeight: number
}

/**
 * Desplazamiento vertical (px, ≥ 0) que hay que aplicarle al <thead> para que quede pegado
 * al top del viewport, sin pasar de la fila de totales.
 *
 * El tope descuenta tfootHeight a propósito: con solo `tableHeight - theadHeight` el header
 * se estacionaría sobre el borde inferior de la tabla y taparía la fila de totales.
 *
 * Se redondea a entero: un transform con fracción de píxel compone el texto del header en
 * offset subpíxel y lo deja borroso. El error máximo introducido es de medio píxel.
 */
export function computeStickyHeaderOffset(m: StickyHeaderMetrics): number {
  const max = m.tableHeight - m.theadHeight - m.tfootHeight
  if (max <= 0) return 0
  return Math.round(Math.min(Math.max(0, -m.tableTop), max))
}

/**
 * Fast path del listener de scroll: true cuando no hay absolutamente nada que hacer y se
 * pueden evitar las tres lecturas de offsetHeight y toda escritura al DOM.
 *
 * `lastOffset === 0` NO es redundante: si la tabla vuelve por encima del top del viewport
 * (tableTop >= 0) pero el <thead> todavía arrastra un transform de cuando estaba fijado,
 * hay que entrar a limpiarlo. Simplificar esto a `tableTop >= 0` deja el header pegado.
 */
export function canSkipStickyHeaderSync(tableTop: number, lastOffset: number): boolean {
  return tableTop >= 0 && lastOffset === 0
}
