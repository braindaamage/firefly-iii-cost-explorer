import { format } from 'date-fns'

export function exportChartAsPNG(): void {
  const svg = document.querySelector('.recharts-wrapper svg') as SVGSVGElement | null
  if (!svg) return

  const svgData = new XMLSerializer().serializeToString(svg)
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = svg.clientWidth || 800
    canvas.height = svg.clientHeight || 400
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)

    const date = format(new Date(), 'yyyy-MM-dd')
    const link = document.createElement('a')
    link.download = `cost-explorer-chart-${date}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    URL.revokeObjectURL(svgUrl)
  }
  img.src = svgUrl
}
