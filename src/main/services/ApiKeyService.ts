import { app, safeStorage } from 'electron'
import fs from 'fs'
import path from 'path'

export interface ApiKeyResult {
  success: boolean
  apiKey?: string
  error?: string
}

export interface SaveApiKeyResult {
  success: boolean
  error?: string
}

export class ApiKeyService {
  private readonly apiKeyFilePath: string

  constructor() {
    this.apiKeyFilePath = path.join(app.getPath('userData'), 'api-key.enc')
  }

  async saveApiKey(apiKey: string): Promise<SaveApiKeyResult> {
    try {
      if (!apiKey) {
        // If empty, delete the file if it exists
        if (fs.existsSync(this.apiKeyFilePath)) {
          fs.unlinkSync(this.apiKeyFilePath)
        }
        return { success: true }
      }

      // Encrypt the API key
      const encryptedData = safeStorage.encryptString(apiKey)

      // Save to file
      fs.writeFileSync(this.apiKeyFilePath, encryptedData)
      return { success: true }
    } catch (error) {
      console.error('Error saving API key:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  getApiKey(): ApiKeyResult {
    try {
      // Check if file exists
      if (!fs.existsSync(this.apiKeyFilePath)) {
        return { success: true, apiKey: '' }
      }

      // Read and decrypt
      const encryptedData = fs.readFileSync(this.apiKeyFilePath)
      if (encryptedData.length === 0) {
        return { success: true, apiKey: '' }
      }

      const apiKey = safeStorage.decryptString(encryptedData)
      return { success: true, apiKey }
    } catch (error) {
      console.error('Error reading API key:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
