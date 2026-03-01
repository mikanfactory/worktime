# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BeaverLog is an Electron-based attendance management application. It features a modern React + TypeScript frontend with Tailwind CSS, and SQLite database for storing attendance logs.

## Commands

### Development

- `npm run dev` - Start development server with hot reload
- `npm run typecheck` - Run TypeScript type checking for both Node and web targets
- `npm run lint` - Run ESLint with cache
- `npm run format` - Format code with Prettier

### Building

- `npm run build` - Full build with type checking
- `npm run build:mac` - Build macOS app
- `npm run build:win` - Build Windows app
- `npm run build:linux` - Build Linux app

### Testing & Linting

- `npm run typecheck:node` - Type check main/preload processes
- `npm run typecheck:web` - Type check renderer process

## Architecture

### Multi-Process Structure

- **Main Process** (`src/main/index.ts`): Handles app lifecycle, window management, IPC handlers for OpenAI API calls, API key encryption/storage, and database operations
- **Preload Script** (`src/preload/index.ts`): Secure bridge between renderer and main processes via contextBridge
- **Renderer Process** (`src/renderer/src/`): React frontend with translation UI, history management, and settings

### Key Components

- **Database Layer** (`src/main/database/`): SQLite database with migration system for translation history storage
- **API Integration**: OpenAI GPT-4o-mini integration with encrypted API key storage using Electron's safeStorage
- **UI Components**: Modern component architecture using Radix UI primitives and Tailwind CSS

### IPC Communication

The app uses secure IPC handlers for:

- `translate-text`: OpenAI API translation requests
- `save-api-key`/`get-api-key`: Encrypted API key management
- `save-translation-log`/`get-translation-logs`: Translation history persistence

### State Management

React state management handles:

- Active tab navigation (translate/history/settings)
- Translation input/output text
- API key and custom prompt configuration
- Translation history with database synchronization

## Development Notes

- Uses electron-vite for build tooling with separate configurations for main, preload, and renderer processes
- Environment variables: `MAIN_VITE_OPENAI_API_KEY` for fallback API key, `RENDERER_VITE_OPENAI_API_KEY` for renderer fallback
- Database migrations are automatically applied on app startup
- API keys are encrypted using Electron's safeStorage and stored in user data directory
