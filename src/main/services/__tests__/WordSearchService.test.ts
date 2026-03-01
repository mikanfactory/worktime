import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WordSearchService } from '../WordSearchService'
import { ApiKeyService } from '../ApiKeyService'

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    }))
  }
})

// Mock import.meta.env
vi.mock('import.meta.env', () => ({
  MAIN_VITE_OPENAI_API_KEY: 'test-api-key'
}))

describe('WordSearchService', () => {
  let wordSearchService: WordSearchService
  let mockApiKeyService: ApiKeyService
  let mockOpenAI: any

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()

    // Mock ApiKeyService
    mockApiKeyService = {
      getApiKey: vi.fn(),
      saveApiKey: vi.fn()
    } as any

    wordSearchService = new WordSearchService(mockApiKeyService)

    // Get reference to the mocked OpenAI instance
    const OpenAI = vi.mocked(await import('openai')).default
    mockOpenAI = new OpenAI()
  })

  describe('searchWord', () => {
    it('should successfully search for a word with API key from service', async () => {
      // Arrange
      const japaneseWord = '猫'
      const mockApiResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                results: [
                  {
                    englishWord: 'cat',
                    meaning: '猫科の動物',
                    examples: [
                      'The cat is sleeping. (猫が眠っている)',
                      'I have a pet cat. (私はペットの猫を飼っている)'
                    ]
                  }
                ]
              })
            }
          }
        ]
      }

      mockApiKeyService.getApiKey = vi.fn().mockReturnValue({
        success: true,
        apiKey: 'saved-api-key'
      })

      mockOpenAI.chat.completions.create.mockResolvedValue(mockApiResponse)

      // Act
      const result = await wordSearchService.searchWord(japaneseWord)

      // Assert
      expect(result.success).toBe(true)
      expect(result.results).toBeDefined()
      expect(result.results![0].englishWord).toBe('cat')
      expect(result.results![0].meaning).toBe('猫科の動物')
      expect(result.results![0].examples).toHaveLength(2)
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('猫')
          }
        ],
        temperature: 0.3
      })
    })

    it('should handle OpenAI response wrapped in markdown code blocks', async () => {
      // Arrange
      const japaneseWord = '本'
      const mockApiResponse = {
        choices: [
          {
            message: {
              content:
                '```json\n{\n  "results": [{\n    "englishWord": "book",\n    "meaning": "書籍",\n    "examples": ["This is a good book. (これは良い本です)"]\n  }]\n}\n```'
            }
          }
        ]
      }

      mockApiKeyService.getApiKey = vi.fn().mockReturnValue({
        success: true,
        apiKey: 'test-key'
      })

      mockOpenAI.chat.completions.create.mockResolvedValue(mockApiResponse)

      // Act
      const result = await wordSearchService.searchWord(japaneseWord)

      // Assert
      expect(result.success).toBe(true)
      expect(result.results![0].englishWord).toBe('book')
    })

    it('should return error when no API key is available', async () => {
      // Arrange
      mockApiKeyService.getApiKey = vi.fn().mockReturnValue({
        success: false,
        error: 'No API key'
      })

      // Mock import.meta.env to return empty string
      vi.doMock('import.meta.env', () => ({
        MAIN_VITE_OPENAI_API_KEY: ''
      }))

      // Act
      const result = await wordSearchService.searchWord('テスト')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('APIキーが設定されていません')
    })

    it('should return error when OpenAI API returns empty content', async () => {
      // Arrange
      const mockApiResponse = {
        choices: [
          {
            message: {
              content: null
            }
          }
        ]
      }

      mockApiKeyService.getApiKey = vi.fn().mockReturnValue({
        success: true,
        apiKey: 'test-key'
      })

      mockOpenAI.chat.completions.create.mockResolvedValue(mockApiResponse)

      // Act
      const result = await wordSearchService.searchWord('テスト')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('APIからの応答が空です')
    })

    it('should return error when OpenAI response cannot be parsed as JSON', async () => {
      // Arrange
      const mockApiResponse = {
        choices: [
          {
            message: {
              content: 'This is not valid JSON'
            }
          }
        ]
      }

      mockApiKeyService.getApiKey = vi.fn().mockReturnValue({
        success: true,
        apiKey: 'test-key'
      })

      mockOpenAI.chat.completions.create.mockResolvedValue(mockApiResponse)

      // Act
      const result = await wordSearchService.searchWord('テスト')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('APIからの応答の解析に失敗しました')
    })

    it('should return error when OpenAI response has invalid format', async () => {
      // Arrange
      const mockApiResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                // Missing results array
                data: 'invalid'
              })
            }
          }
        ]
      }

      mockApiKeyService.getApiKey = vi.fn().mockReturnValue({
        success: true,
        apiKey: 'test-key'
      })

      mockOpenAI.chat.completions.create.mockResolvedValue(mockApiResponse)

      // Act
      const result = await wordSearchService.searchWord('テスト')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('APIからの応答の解析に失敗しました')
    })

    it('should handle OpenAI API errors', async () => {
      // Arrange
      mockApiKeyService.getApiKey = vi.fn().mockReturnValue({
        success: true,
        apiKey: 'test-key'
      })

      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'))

      // Act
      const result = await wordSearchService.searchWord('テスト')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('API Error')
    })
  })
})
