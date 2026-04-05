import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useConfig } from './useConfig'

describe('useConfig', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null config when nothing is stored', () => {
    const { result } = renderHook(() => useConfig())
    expect(result.current.config).toBeNull()
    expect(result.current.isConfigured).toBe(false)
  })

  it('reads existing config from localStorage', () => {
    localStorage.setItem('ff3_base_url', JSON.stringify('https://example.com'))
    localStorage.setItem('ff3_api_token', JSON.stringify('mytoken'))

    const { result } = renderHook(() => useConfig())
    expect(result.current.config).toEqual({
      baseUrl: 'https://example.com',
      apiToken: 'mytoken',
    })
    expect(result.current.isConfigured).toBe(true)
  })

  it('returns isConfigured false when only baseUrl is set', () => {
    localStorage.setItem('ff3_base_url', JSON.stringify('https://example.com'))

    const { result } = renderHook(() => useConfig())
    expect(result.current.isConfigured).toBe(false)
  })

  it('returns isConfigured false when only apiToken is set', () => {
    localStorage.setItem('ff3_api_token', JSON.stringify('mytoken'))

    const { result } = renderHook(() => useConfig())
    expect(result.current.isConfigured).toBe(false)
  })

  it('saveConfig persists both values and updates state', () => {
    const { result } = renderHook(() => useConfig())

    act(() => {
      result.current.saveConfig({
        baseUrl: 'https://firefly.example.com',
        apiToken: 'secret-token',
      })
    })

    expect(result.current.config).toEqual({
      baseUrl: 'https://firefly.example.com',
      apiToken: 'secret-token',
    })
    expect(result.current.isConfigured).toBe(true)
    expect(JSON.parse(localStorage.getItem('ff3_base_url')!)).toBe(
      'https://firefly.example.com'
    )
    expect(JSON.parse(localStorage.getItem('ff3_api_token')!)).toBe('secret-token')
  })

  it('clearConfig removes values from localStorage and resets state', () => {
    localStorage.setItem('ff3_base_url', JSON.stringify('https://example.com'))
    localStorage.setItem('ff3_api_token', JSON.stringify('mytoken'))

    const { result } = renderHook(() => useConfig())

    act(() => {
      result.current.clearConfig()
    })

    expect(result.current.config).toBeNull()
    expect(result.current.isConfigured).toBe(false)
    expect(localStorage.getItem('ff3_base_url')).toBeNull()
    expect(localStorage.getItem('ff3_api_token')).toBeNull()
  })
})
