import '@testing-library/jest-dom'

// Mock Electron APIs for testing
global.window = Object.create(window)

// Mock the API object that would normally be provided by preload
Object.defineProperty(window, 'api', {
  value: {
    translate: vi.fn(),
    saveApiKey: vi.fn(),
    getApiKey: vi.fn(),
    updatePrompt: vi.fn(),
    getPrompt: vi.fn(),
    getTranslationLogs: vi.fn(),
    searchWord: vi.fn(),
    getWordSearchLogs: vi.fn()
  },
  writable: true
})
