# electron-app

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

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
