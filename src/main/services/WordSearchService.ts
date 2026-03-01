import OpenAI from 'openai'
import { ApiKeyService } from './ApiKeyService'

export interface WordSearchApiResult {
  success: boolean
  results?: Array<{
    englishWord: string
    meaning: string
    examples: string[]
  }>
  error?: string
}

export class WordSearchService {
  constructor(private apiKeyService: ApiKeyService) {}

  async searchWord(japaneseWord: string): Promise<WordSearchApiResult> {
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

      const prompt = `あなたは和英辞書アシスタントです。日本語の単語「${japaneseWord}」に対して以下の情報を提供してください：

1. 最適な英単語・英語表現（3つまで）
2. それぞれの意味・定義（日本語）
3. 例文（英語・日本語対訳、各単語につき2つまで）

以下のJSON形式で返してください：
{
  "results": [
    {
      "englishWord": "英単語",
      "meaning": "日本語での意味・定義",
      "examples": [
        "English example sentence. (日本語訳)",
        "Another English example. (別の日本語訳)"
      ]
    }
  ]
}

必ずJSON形式で回答してください。`

      // Call OpenAI API to search for word
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('APIからの応答が空です')
      }

      // Parse JSON response
      try {
        // OpenAI might wrap response in markdown code blocks, let's clean it
        let cleanContent = content.trim()
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
        }

        const parsed = JSON.parse(cleanContent)

        if (!parsed.results || !Array.isArray(parsed.results)) {
          throw new Error('Invalid response format')
        }

        return {
          success: true,
          results: parsed.results
        }
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError)
        return {
          success: false,
          error: 'APIからの応答の解析に失敗しました'
        }
      }
    } catch (error) {
      console.error('Word search error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: errorMessage
      }
    }
  }
}
