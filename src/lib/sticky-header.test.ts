import { describe, it, expect } from 'vitest'
import { computeStickyHeaderOffset, canSkipStickyHeaderSync } from './sticky-header'
import type { StickyHeaderMetrics } from './sticky-header'

/** Tabla típica de desktop: 20 filas de 45px + thead 43 + tfoot 49. */
const BASE: StickyHeaderMetrics = {
  tableTop: 0,
  tableHeight: 992,
  theadHeight: 43,
  tfootHeight: 49,
}

/** El tope real del desplazamiento con BASE: 992 - 43 - 49. */
const BASE_MAX = BASE.tableHeight - BASE.theadHeight - BASE.tfootHeight // 900

function offsetAt(tableTop: number, overrides: Partial<StickyHeaderMetrics> = {}) {
  return computeStickyHeaderOffset({ ...BASE, tableTop, ...overrides })
}

describe('computeStickyHeaderOffset', () => {
  it('devuelve 0 con la tabla por debajo del top del viewport', () => {
    expect(offsetAt(300)).toBe(0)
  })

  it('devuelve 0 justo en el top del viewport', () => {
    expect(offsetAt(0)).toBe(0)
  })

  it('empuja el thead exactamente -tableTop dentro de rango', () => {
    expect(offsetAt(-100)).toBe(100)
  })

  it('clampea al tope cuando el scroll se va muy por debajo', () => {
    expect(offsetAt(-100000)).toBe(BASE_MAX)
  })

  // Test 5 — el que falla con la fórmula ingenua `tableHeight - theadHeight`.
  it('el tope descuenta tfootHeight: el header no llega a tapar la fila de totales', () => {
    const naive = BASE.tableHeight - BASE.theadHeight // 949, la fórmula que tapa el tfoot
    const clamped = offsetAt(-100000, { tfootHeight: 60 })

    expect(clamped).toBe(BASE.tableHeight - BASE.theadHeight - 60)
    // estrictamente 60px por encima de donde lo dejaría la fórmula sin tfoot
    expect(naive - clamped).toBe(60)
  })

  it('con tfootHeight 0 se comporta como una tabla sin footer', () => {
    expect(offsetAt(-100000, { tfootHeight: 0 })).toBe(BASE.tableHeight - BASE.theadHeight)
  })

  it('devuelve 0 en el caso degenerado tableHeight < theadHeight + tfootHeight', () => {
    expect(offsetAt(-500, { tableHeight: 60 })).toBe(0)
  })

  // Test 8 — ancla el "inerte por construcción" cuando no se puede medir (jsdom).
  it('devuelve 0 con todas las métricas a cero', () => {
    expect(
      computeStickyHeaderOffset({ tableTop: 0, tableHeight: 0, theadHeight: 0, tfootHeight: 0 })
    ).toBe(0)
  })

  it('redondea a entero: un transform fraccionario deja el texto borroso', () => {
    expect(offsetAt(-100.6)).toBe(101)
    expect(offsetAt(-100.4)).toBe(100)
    expect(Number.isInteger(offsetAt(-100.5))).toBe(true)
  })

  // Test 10 — continuidad en la frontera, en los dos sentidos (§6.2 propiedad 2).
  it('cruza la frontera sin escalón en ambos sentidos', () => {
    expect(offsetAt(0.5)).toBe(0)
    expect(offsetAt(0)).toBe(0)
    expect(offsetAt(-1)).toBe(1)
    expect(offsetAt(-2)).toBe(2)
  })
})

describe('canSkipStickyHeaderSync', () => {
  it('salta con la tabla por debajo del top y nada pendiente', () => {
    expect(canSkipStickyHeaderSync(10, 0)).toBe(true)
  })

  it('salta justo en la frontera sin nada pendiente', () => {
    expect(canSkipStickyHeaderSync(0, 0)).toBe(true)
  })

  it('no salta cuando la tabla pasó el top: hay que fijar el header', () => {
    expect(canSkipStickyHeaderSync(-10, 0)).toBe(false)
  })

  // Test 14 — falla si alguien reduce la condición a `tableTop >= 0`.
  it('no salta si la tabla volvió arriba pero el thead arrastra un transform', () => {
    expect(canSkipStickyHeaderSync(10, 50)).toBe(false)
  })

  it('no salta mientras el header está fijado y sigue el scroll', () => {
    expect(canSkipStickyHeaderSync(-10, 50)).toBe(false)
  })
})
