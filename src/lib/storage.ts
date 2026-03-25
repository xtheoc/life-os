// Storage abstraction layer.
//
// All persistence goes through this interface — never call localStorage directly
// elsewhere. To add cloud sync, implement StorageAdapter and swap the exported
// `storage` singleton without touching any other file.

export interface StorageAdapter {
  get<T>(key: string): T | null
  set<T>(key: string, value: T): void
  remove(key: string): void
  clear(): void
}

class LocalStorageAdapter implements StorageAdapter {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return null
      return JSON.parse(raw) as T
    } catch {
      console.warn('[storage] Failed to parse key:', key)
      return null
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (err) {
      console.warn('[storage] Failed to write key:', key, err)
    }
  }

  remove(key: string): void {
    localStorage.removeItem(key)
  }

  clear(): void {
    localStorage.clear()
  }
}

export const storage: StorageAdapter = new LocalStorageAdapter()
