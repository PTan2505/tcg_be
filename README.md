# 🎯 TCG Backend API

A comprehensive Trading Card Game (TCG) backend API built with **Hono.js**, **MongoDB**, and **TypeScript**.

## 🚀 Quick Start

### Install Dependencies
```sh
bun install
```

### Start Development Server
```sh
bun run dev
```

Open http://localhost:3000

### API Documentation
- **Swagger UI**: http://localhost:3000/docs
- **OpenAPI JSON**: http://localhost:3000/swagger.json

## 🧪 Testing

All test files are organized in the `tests/` folder:

### API Tests
```sh
cd tests/api

# Node.js comprehensive tests
node test-api-comprehensive.js

# Bash/curl tests
./test-api-simple.sh

# Python tests
python test-api.py
```

### Documentation
See `tests/API-TESTING-README.md` for detailed testing instructions.

## 📁 Project Structure

```
tcg_be/
├── src/                    # Source code
│   ├── features/          # Feature-based modules
│   ├── database/          # Models & DB connection
│   └── shared/            # Shared utilities
├── tests/                 # All test files
│   ├── api/              # API test scripts
│   └── scripts/          # Utility scripts
├── scripts/               # Data import scripts
└── pokemon-tcg-data/      # Card data files
```

## 🔧 Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production

## 📚 Features

- **Authentication** - JWT-based auth system
- **Card Management** - Pokemon & Yu-Gi-Oh! cards
- **User Collections** - Personal card collections
- **Deck Building** - Create and manage decks
- **Search & Filtering** - Advanced card search
- **Rate Limiting** - API protection
- **Swagger Documentation** - Interactive API docs
