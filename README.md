# BeaverLog

Electron ベースの勤怠管理アプリケーション。出勤・退勤の打刻と勤怠履歴の管理ができます。

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Electron (Main Process)
- **Database**: SQLite (Prisma ORM)
- **Build**: electron-vite
- **UI**: Radix UI

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

### Database

```bash
# Generate Prisma client
$ npm run db:generate

# Create/apply dev migrations
$ npm run db:migrate:dev

# Open Prisma Studio GUI
$ npm run db:studio
```

### Testing

```bash
# Run tests (watch mode)
$ npm test

# Run tests once
$ npm run test:run

# Run tests with coverage report
$ npm run test:coverage
```
