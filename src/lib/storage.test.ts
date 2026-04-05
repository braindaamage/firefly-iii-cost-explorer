import { describe, it, expect, beforeEach } from 'vitest'
import { getStorageItem, setStorageItem, removeStorageItem } from './storage'

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getStorageItem', () => {
    it('returns null when key does not exist', () => {
      expect(getStorageItem('nonexistent')).toBeNull()
    })

    it('returns parsed string value', () => {
      localStorage.setItem('key', JSON.stringify('hello'))
      expect(getStorageItem<string>('key')).toBe('hello')
    })

    it('returns parsed number value', () => {
      localStorage.setItem('key', JSON.stringify(42))
      expect(getStorageItem<number>('key')).toBe(42)
    })

    it('returns parsed object value', () => {
      const obj = { baseUrl: 'https://example.com', apiToken: 'abc123' }
      localStorage.setItem('key', JSON.stringify(obj))
      expect(getStorageItem<typeof obj>('key')).toEqual(obj)
    })

    it('returns null when value is invalid JSON', () => {
      localStorage.setItem('key', 'not-valid-json{')
      expect(getStorageItem('key')).toBeNull()
    })
  })

  describe('setStorageItem', () => {
    it('stores a string value', () => {
      setStorageItem('key', 'hello')
      expect(localStorage.getItem('key')).toBe(JSON.stringify('hello'))
    })

    it('stores a number value', () => {
      setStorageItem('key', 99)
      expect(localStorage.getItem('key')).toBe(JSON.stringify(99))
    })

    it('stores an object value', () => {
      const obj = { baseUrl: 'https://example.com', apiToken: 'token123' }
      setStorageItem('key', obj)
      expect(JSON.parse(localStorage.getItem('key')!)).toEqual(obj)
    })

    it('overwrites existing value', () => {
      setStorageItem('key', 'first')
      setStorageItem('key', 'second')
      expect(getStorageItem<string>('key')).toBe('second')
    })
  })

  describe('removeStorageItem', () => {
    it('removes an existing key', () => {
      setStorageItem('key', 'value')
      removeStorageItem('key')
      expect(getStorageItem('key')).toBeNull()
    })

    it('does not throw when key does not exist', () => {
      expect(() => removeStorageItem('nonexistent')).not.toThrow()
    })
  })
})
