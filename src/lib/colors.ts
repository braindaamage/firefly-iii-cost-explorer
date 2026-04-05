export const SERIES_COLORS = [
  '#4285f4', // azul Google
  '#34a853', // verde Google
  '#fbbc05', // amarillo Google
  '#a142f4', // morado
  '#ea4335', // rojo Google
  '#ff6d01', // naranja
  '#46bdc6', // teal
  '#e8710a', // dark orange
  '#7baaf7', // light blue
  '#f07b72', // salmon
]

export function getSeriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length]
}
