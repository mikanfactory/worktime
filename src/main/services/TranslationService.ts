import OpenAI from 'openai'
import { ApiKeyService } from './ApiKeyService'

export interface TranslationResult {
  success: boolean
  translatedText?: string
  error?: string
}

export class TranslationService {
  constructor(private apiKeyService: ApiKeyService) {}

  async translateText(text: string, prompt: string): Promise<TranslationResult> {
    try {
      // Get the saved API key, fall back to environment variable if not available
      const apiKeyResult = this.apiKeyService.getApiKey()
      let apiKey = ''

      if (apiKeyResult.success && apiKeyResult.apiKey) {
        apiKey = apiKeyResult.apiKey
      } else {
        apiKey = import.meta.env.MAIN_VITE_OPENAI_API_KEY || ''
      }

      if (!apiKey) {
        throw new Error('APIキーが設定されていません。設定画面からAPIキーを設定してください。')
      }

      // Initialize OpenAI client with the API key
      const openai = new OpenAI({
        apiKey
      })

      // Call OpenAI API to translate the text
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3
      })

      const translatedContent = response.choices[0]?.message?.content || '翻訳エラーが発生しました'
      return { success: true, translatedText: translatedContent }
    } catch (error) {
      console.error('Translation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: errorMessage,
        translatedText: '翻訳中にエラーが発生しました。APIキーが設定されているか確認してください。'
      }
    }
  }
}
