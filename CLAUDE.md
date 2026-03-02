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
- `npm test` - Run tests with vitest (watch mode)
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Run tests with coverage report

### Building

- `npm run build` - Full build with type checking
- `npm run build:mac` - Build macOS app
- `npm run build:win` - Build Windows app
- `npm run build:linux` - Build Linux app

### Database (Prisma)

- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate:dev` - Create/apply dev migrations
- `npm run db:studio` - Open Prisma Studio GUI

### Testing & Linting

- `npm run typecheck:node` - Type check main/preload processes
- `npm run typecheck:web` - Type check renderer process

## Architecture

### Multi-Process Structure

- **Main Process** (`src/main/index.ts`): Handles app lifecycle, window management, IPC handlers for attendance logging, and database operations
- **Preload Script** (`src/preload/index.ts`): Secure bridge between renderer and main processes via contextBridge
- **Renderer Process** (`src/renderer/src/`): React frontend with attendance clock in/out UI and attendance history

### Key Components

- **Database Layer** (`src/db/`): Prisma-based SQLite database with migration system for attendance log storage (`schema.prisma`, `client.ts`, `service.ts`, `migrate.ts`)
- **Service Layer** (`src/main/services/`): `AttendanceService` (勤怠ロジック), `IpcHandlerService` (IPC通信), `WindowManagerService` (ウィンドウ管理)
- **UI Components**: Modern component architecture using Radix UI primitives and Tailwind CSS

### IPC Communication

The app uses secure IPC handlers for:

- `attendance:log`: Record attendance events (clock in/out)
- `attendance:getLogs`: Retrieve attendance logs (cursor-based pagination)
- `attendance:getTodaySummary`: Get today's attendance summary

### State Management

The `useAttendance` hook manages:

- Tab navigation (attendance / attendance-history)
- Attendance logs and daily summary
- Real-time elapsed time counter

## Development Notes

- Uses electron-vite for build tooling with separate configurations for main, preload, and renderer processes
- Database migrations are automatically applied on app startup
- Database path: `app.getPath("userData")/beaver_log.db`
