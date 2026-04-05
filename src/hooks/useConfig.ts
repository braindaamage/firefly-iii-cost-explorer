import { useState } from 'react'
import { getStorageItem, setStorageItem, removeStorageItem } from '../lib/storage'

export interface FireflyConfig {
  baseUrl: string
  apiToken: string
}

const BASE_URL_KEY = 'ff3_base_url'
const API_TOKEN_KEY = 'ff3_api_token'

function readConfig(): FireflyConfig | null {
  const baseUrl = getStorageItem<string>(BASE_URL_KEY)
  const apiToken = getStorageItem<string>(API_TOKEN_KEY)
  if (baseUrl && apiToken) {
    return { baseUrl, apiToken }
  }
  return null
}

export function useConfig() {
  const [config, setConfig] = useState<FireflyConfig | null>(readConfig)

  function saveConfig(newConfig: FireflyConfig): void {
    setStorageItem(BASE_URL_KEY, newConfig.baseUrl)
    setStorageItem(API_TOKEN_KEY, newConfig.apiToken)
    setConfig(newConfig)
  }

  function clearConfig(): void {
    removeStorageItem(BASE_URL_KEY)
    removeStorageItem(API_TOKEN_KEY)
    setConfig(null)
  }

  const isConfigured =
    config !== null &&
    config.baseUrl.trim() !== '' &&
    config.apiToken.trim() !== ''

  return { config, saveConfig, clearConfig, isConfigured }
}
