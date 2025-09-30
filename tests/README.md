# 🧪 Tests Directory

This directory contains all testing and utility files for the TCG Backend project.

## 📁 Structure

```
tests/
├── api/                          # API Testing Scripts
│   ├── test-api-comprehensive.js # Complete Node.js test suite
│   ├── test-api-simple.sh        # Quick bash/curl tests
│   ├── test-api.py               # Python requests tests
│   ├── test-api.js               # Additional JavaScript tests
│   ├── quick-test-commands.sh    # Manual copy-paste commands
│   └── postman-collection.json   # Postman/Insomnia collection
├── scripts/                      # Utility Scripts
│   ├── fix-imports.sh           # Fix import paths after refactoring
│   └── update-imports.sh        # Update import statements
├── API-TESTING-README.md         # Comprehensive testing guide
└── README.md                     # This file
```

## 🚀 Quick Start

### Prerequisites
Make sure the server is running:
```bash
cd ..  # Go back to project root
bun run dev
```

### Run API Tests
```bash
cd api

# Choose your preferred method:
node test-api-comprehensive.js  # Most detailed
./test-api-simple.sh           # Quick bash tests
python test-api.py             # Python tests
```

## 📚 Documentation

- **`API-TESTING-README.md`** - Complete testing guide with troubleshooting
- **Individual test files** - Each contains inline documentation

## 🛠️ Utility Scripts

The `scripts/` folder contains utility scripts used during development:

- **`fix-imports.sh`** - Fixes import paths after code restructuring
- **`update-imports.sh`** - Updates import statements for new file locations

These scripts were used when reorganizing the codebase into the feature-based structure.

## 🎯 Test Coverage

All API test scripts cover:
- ✅ Authentication (register/login)
- ✅ Card browsing with pagination
- ✅ Search functionality
- ✅ User collections management
- ✅ Deck building operations
- ✅ Error handling validation
- ✅ Rate limiting behavior

## 💡 Adding New Tests

When adding new features, create corresponding tests in the `api/` folder following the existing patterns.