import { useState, useEffect } from 'react'

type Breakpoint = 'desktop' | 'tablet' | 'mobile'

function getBreakpoint(): Breakpoint {
  if (window.matchMedia('(min-width: 1024px)').matches) return 'desktop'
  if (window.matchMedia('(min-width: 768px)').matches) return 'tablet'
  return 'mobile'
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(getBreakpoint)

  useEffect(() => {
    const desktopMq = window.matchMedia('(min-width: 1024px)')
    const tabletMq = window.matchMedia('(min-width: 768px)')

    function handleChange() {
      if (desktopMq.matches) setBreakpoint('desktop')
      else if (tabletMq.matches) setBreakpoint('tablet')
      else setBreakpoint('mobile')
    }

    desktopMq.addEventListener('change', handleChange)
    tabletMq.addEventListener('change', handleChange)

    return () => {
      desktopMq.removeEventListener('change', handleChange)
      tabletMq.removeEventListener('change', handleChange)
    }
  }, [])

  return breakpoint
}
