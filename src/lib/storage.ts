export function getStorageItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key)
    if (item === null) return null
    return JSON.parse(item) as T
  } catch {
    return null
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function removeStorageItem(key: string): void {
  localStorage.removeItem(key)
}
