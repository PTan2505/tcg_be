# 🎯 TCG Backend - Clean Feature-Based Codebase Structure

## 📁 Project Overview
A comprehensive Trading Card Game (TCG) backend API built with **Hono.js**, **MongoDB**, and **TypeScript**, supporting Pokemon and Yu-Gi-Oh! card management, user collections, and deck building.

---

## 🏗️ Architecture Pattern
**Clean Architecture with Feature-Based Organization:**
- **Domain-Driven Design** with feature folders
- **Separation of concerns** within each feature
- **Shared components** for cross-cutting concerns
- **Database layer** isolation

---

## 📂 New Feature-Based Directory Structure

```
tcg_be/
├── 📄 bun.lock                    # Bun package lock file
├── 📄 package.json                # Project dependencies & scripts
├── 📄 tsconfig.json               # TypeScript configuration
├── 📄 README.md                   # Project documentation
├── 📄 .env                        # Environment variables
├── 📄 swagger.json                # OpenAPI specification
│
├── 🧪 tests/                      # Testing & Utilities
│   ├── api/                       # API Test Scripts
│   │   ├── test-api-comprehensive.js # Node.js comprehensive tests
│   │   ├── test-api-simple.sh        # Bash curl tests
│   │   ├── test-api.py               # Python requests tests
│   │   ├── test-api.js               # Additional JS tests
│   │   ├── quick-test-commands.sh    # Manual test commands
│   │   └── postman-collection.json   # Postman collection
│   ├── scripts/                   # Utility Scripts
│   │   ├── fix-imports.sh            # Import path fixes
│   │   └── update-imports.sh         # Import updates
│   └── API-TESTING-README.md      # Testing documentation
│
├── 📊 Data & Scripts
├── ├── pokemon-tcg-data/          # Card data files
├── │   ├── cards/en/              # Pokemon card JSON files
├── │   ├── sets/en.json           # Pokemon sets data
├── │   └── decks/en/              # Pokemon deck data
├── └── scripts/                   # Import/migration scripts
├──     ├── pokemon/               # Pokemon data importers
├──     └── yugioh/                # Yu-Gi-Oh data importers
│
└── 🎯 Source Code (src/)
    ├── 📄 index.ts                # Application entry point
    │
    ├── 🏢 features/               # Feature-based organization
    │   ├── 🔐 auth/               # Authentication & Authorization
    │   │   ├── auth.controller.ts # Auth request handlers
    │   │   ├── auth.service.ts    # Auth business logic
    │   │   ├── auth.routes.ts     # Auth API routes
    │   │   ├── auth.validator.ts  # Auth input validation
    │   │   └── auth.types.ts      # Auth type definitions
    │   │
    │   ├── 🃏 cards/              # Card Browsing & Search
    │   │   ├── card.controller.ts # Card request handlers
    │   │   ├── card.service.ts    # Card business logic
    │   │   ├── card.routes.ts     # Card API routes
    │   │   └── card.validator.ts  # Card input validation
    │   │
    │   ├── 📚 collections/        # User Card Collections
    │   │   ├── userCard.controller.ts # Collection handlers
    │   │   ├── userCard.service.ts    # Collection logic
    │   │   ├── userCard.routes.ts     # Collection routes
    │   │   └── userCard.validator.ts  # Collection validation
    │   │
    │   ├── 🎴 decks/              # Deck Management
    │   │   ├── deck.controller.ts # Deck request handlers
    │   │   ├── deck.service.ts    # Deck business logic
    │   │   ├── deck.routes.ts     # Deck API routes
    │   │   └── deck.validator.ts  # Deck input validation
    │   │
    │   └── 👤 users/              # User Management
    │       ├── user.controller.ts # User request handlers
    │       ├── user.service.ts    # User business logic
    │       ├── user.routes.ts     # User API routes
    │       └── user.validator.ts  # User input validation
    │
    ├── 🗄️ database/               # Database Layer
    │   ├── db/
    │   │   └── db.ts              # MongoDB connection
    │   └── models/                # Data Models
    │       ├── user.ts            # User schema & model
    │       ├── userCard.ts        # User card collection
    │       ├── deck.ts            # Deck management
    │       ├── pokemon/
    │       │   ├── pokemonCard.ts # Pokemon card schema
    │       │   ├── pokemonSet.ts  # Pokemon set schema
    │       │   └── pokemonDeck.ts # Pokemon deck specifics
    │       └── yugioh/
    │           └── yugiohModel.ts # Yu-Gi-Oh card schema
    │
    └── 🛠️ shared/                 # Shared Components
        ├── config/
        │   ├── swagger.ts         # Swagger/OpenAPI config
        │   └── email.html         # Email template
        ├── middlewares/
        │   ├── auth.middleware.ts     # JWT authentication
        │   ├── security.middleware.ts # Rate limiting & validation
        │   └── validation.middleware.ts # Request validation
        ├── utils/                 # Utility functions
        └── email.service.ts       # Email notifications
```

---

## 🔄 Request Flow

```
HTTP Request
    ↓
🛡️ Security Middleware (Rate Limiting)
    ↓
🛣️ Route Handler (auth.routes.ts)
    ↓
✅ Validation Middleware (Zod schemas)
    ↓
🔐 Auth Middleware (JWT verification)
    ↓
🎮 Controller (auth.controller.ts)
    ↓
⚡ Service (auth.service.ts)
    ↓
🗃️ Model (user.ts)
    ↓
🗄️ MongoDB Database
    ↓
📤 JSON Response
```

---

## 🌐 API Endpoints Structure

### 🔐 Authentication (`/auth`)
```
POST   /auth/register           # User registration
POST   /auth/login              # User login
GET    /auth/verify-email       # Email verification
POST   /auth/forgot-password    # Password reset request
POST   /auth/reset-password     # Password reset
POST   /auth/refresh-token      # Token refresh
```

### 👤 User Management (`/users`)
```
GET    /users/profile           # Get user profile
PUT    /users/profile           # Update profile
DELETE /users/profile           # Delete account
```

### 🃏 Card Browsing (`/cards`)
```
GET    /cards/:type             # Get cards by type (pokemon/yugioh)
GET    /cards/:type/search      # Search cards
GET    /cards/:type/:cardId     # Get specific card
```

### 📚 User Collections (`/user-cards`)
```
GET    /user-cards              # Get user's collection
POST   /user-cards              # Add card to collection
PUT    /user-cards/:id          # Update card quantity
DELETE /user-cards/:id          # Remove from collection
```

### 🎴 Deck Management (`/decks`)
```
GET    /decks                   # Get user's decks
POST   /decks                   # Create new deck
GET    /decks/:id               # Get specific deck
PUT    /decks/:id               # Update deck
DELETE /decks/:id               # Delete deck
POST   /decks/:id/cards         # Add card to deck
DELETE /decks/:id/cards/:cardId # Remove card from deck
```

---

## 🔧 Key Technologies & Patterns

### **Core Stack**
- **Runtime:** Bun.js (Fast JavaScript runtime)
- **Framework:** Hono.js (Lightweight web framework)
- **Database:** MongoDB with Mongoose ODM
- **Language:** TypeScript (Type safety)
- **Validation:** Zod (Runtime type checking)

### **Architecture Patterns**
- **Repository Pattern:** Services encapsulate data access
- **Dependency Injection:** Controllers receive service instances
- **Middleware Pipeline:** Request processing chain
- **Error Boundary:** Centralized error handling
- **DTO Pattern:** Request/response data transfer objects

### **Security Features**
- **JWT Authentication:** Bearer token-based auth
- **Rate Limiting:** Prevent API abuse
- **Input Validation:** Zod schema validation
- **Parameter Validation:** URL parameter checking
- **CORS Protection:** Cross-origin request handling

---

## 📊 Data Models

### **Core Models**
```typescript
User {
  _id: ObjectId
  email: string (unique)
  password: string (hashed)
  name: string
  emailVerified: boolean
  createdAt: Date
}

PokemonCard {
  _id: ObjectId
  cardExtId: string (unique)
  set: ObjectId (ref: PokemonSet)
  name: string
  supertype: string
  subtypes: string[]
  hp: string
  attacks: Attack[]
  // ... card-specific fields
}

UserCard {
  _id: ObjectId
  userId: ObjectId (ref: User)
  cardId: ObjectId (ref: Card)
  cardType: 'pokemon' | 'yugioh'
  quantity: number
  acquiredAt: Date
}

Deck {
  _id: ObjectId
  userId: ObjectId (ref: User)
  name: string
  description: string
  cardType: 'pokemon' | 'yugioh'
  cards: DeckCard[]
  isPublic: boolean
}
```

---

## 🧪 Testing Strategy

### **Test Files Available**
1. **`test-api-comprehensive.js`** - Full Node.js test suite
2. **`test-api-simple.sh`** - Bash/curl quick tests
3. **`test-api.py`** - Python requests tests
4. **`postman-collection.json`** - GUI testing

### **Test Coverage**
- ✅ Authentication flow (register/login)
- ✅ Card browsing with pagination
- ✅ Search functionality
- ✅ User collection management
- ✅ Deck building operations
- ✅ Error handling validation
- ✅ Rate limiting behavior

---

## 🚀 Development Commands

```bash
# Start development server
bun run dev

# Run tests
cd tests/api
node test-api-comprehensive.js
./test-api-simple.sh
python test-api.py

# Import card data
bun run scripts/pokemon/importCards.ts
bun run scripts/yugioh/importData.ts

# API Documentation
http://localhost:3000/docs
```

---

## 🔍 Code Quality Standards

### **File Organization**
- One class/interface per file
- Consistent naming conventions
- Proper imports/exports
- Clear separation of concerns

### **TypeScript Practices**
- Strict type checking enabled
- Interface-first design
- Proper error typing
- Generic type usage where appropriate

### **Security Practices**
- Password hashing (bcrypt)
- JWT token expiration
- Input sanitization
- Rate limiting implementation
- Environment variable usage

---

## 📈 Performance Optimizations

- **Database Indexes:** On frequently queried fields
- **Pagination:** All list endpoints support pagination
- **Rate Limiting:** Prevent API abuse
- **Connection Pooling:** MongoDB connection optimization
- **Lean Queries:** Mongoose .lean() for better performance

---

## 🎯 Next Steps for Clean Architecture

1. **Add Unit Tests:** Individual service/controller tests
2. **API Versioning:** Support for v1, v2 endpoints
3. **Caching Layer:** Redis for frequently accessed data
4. **Logging System:** Structured logging with levels
5. **Health Checks:** Endpoint for monitoring
6. **Error Tracking:** Integration with error reporting service
7. **Documentation:** Auto-generated API docs from code comments

---

This structure provides a **scalable, maintainable, and testable** codebase following modern best practices for Node.js/TypeScript applications.