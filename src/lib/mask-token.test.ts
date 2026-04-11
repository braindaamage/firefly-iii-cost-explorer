import { describe, it, expect } from 'vitest'
import { maskToken } from './mask-token'

describe('maskToken', () => {
  it('masks all but the last 4 characters with 8 bullet chars', () => {
    expect(maskToken('my-secret-token-8a3f')).toBe('••••••••8a3f')
  })

  it('returns 8 bullets when the token is 4 chars or shorter', () => {
    expect(maskToken('ab3f')).toBe('••••••••')
    expect(maskToken('abc')).toBe('••••••••')
    expect(maskToken('')).toBe('••••••••')
  })

  it('always shows exactly the last 4 chars regardless of token length', () => {
    const token = 'abcdefghij1234'
    const result = maskToken(token)
    expect(result.endsWith('1234')).toBe(true)
    expect(result.startsWith('••••••••')).toBe(true)
  })

  it('mask prefix is always 8 bullet chars', () => {
    const result = maskToken('this-is-a-long-token-xyz9')
    const bullets = result.slice(0, 8)
    expect(bullets).toBe('••••••••')
    expect(result.slice(8)).toBe('xyz9')
  })
})
