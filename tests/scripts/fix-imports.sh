#!/bin/bash

cd /home/phuctan/Desktop/Project/tcg_be/src

echo "🔧 Fixing remaining import paths..."

# Fix specific problematic imports in each file
echo "📝 Fixing cards feature..."
sed -i 's|from "\.\./models/pokemon/pokemonCard"|from "../../database/models/pokemon/pokemonCard"|g' features/cards/card.service.ts
sed -i 's|from "\.\./models/yugioh/yugiohModel"|from "../../database/models/yugioh/yugiohModel"|g' features/cards/card.service.ts

echo "📝 Fixing collections feature..."
sed -i 's|from "\.\./models/userCard"|from "../../database/models/userCard"|g' features/collections/userCard.service.ts
sed -i 's|from "\.\./models/user"|from "../../database/models/user"|g' features/collections/userCard.service.ts

echo "📝 Fixing decks feature..."
sed -i 's|from "\.\./models/deck"|from "../../database/models/deck"|g' features/decks/deck.service.ts
sed -i 's|from "\.\./models/userCard"|from "../../database/models/userCard"|g' features/decks/deck.service.ts

echo "📝 Fixing users feature..."
sed -i 's|from "\.\./models/user"|from "../../database/models/user"|g' features/users/user.service.ts

echo "📝 Fixing auth feature..."
sed -i 's|from "\.\./models/user"|from "../../database/models/user"|g' features/auth/auth.service.ts

echo "📝 Fixing shared middlewares..."
sed -i 's|from "\.\./models/user"|from "../../database/models/user"|g' shared/middlewares/auth.middleware.ts
sed -i 's|from "\.\./models/deck"|from "../../database/models/deck"|g' shared/middlewares/security.middleware.ts
sed -i 's|from "\.\./types/auth.types"|from "../auth/auth.types"|g' shared/middlewares/auth.middleware.ts

# Fix cross-feature imports
echo "📝 Fixing cross-feature imports..."
sed -i 's|from "\.\./services/userCard\.service"|from "../collections/userCard.service"|g' features/decks/deck.routes.ts

echo "✅ All imports fixed!"