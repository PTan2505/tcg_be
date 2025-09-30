#!/bin/bash

# Script to update import paths after restructuring

cd /home/phuctan/Desktop/Project/tcg_be/src

echo "🔄 Updating import paths in all TypeScript files..."

# Function to update imports in a file
update_imports() {
    local file="$1"
    echo "📝 Updating: $file"
    
    # Update common import paths
    sed -i 's|from "\.\./controllers/|from "./|g' "$file"
    sed -i 's|from "\.\./services/|from "./|g' "$file"
    sed -i 's|from "\.\./routes/|from "./|g' "$file"
    sed -i 's|from "\.\./validators/|from "./|g' "$file"
    sed -i 's|from "\.\./middlewares/|from "../../shared/middlewares/|g' "$file"
    sed -i 's|from "\.\./config/|from "../../shared/config/|g' "$file"
    sed -i 's|from "\.\./models/|from "../../database/models/|g' "$file"
    sed -i 's|from "\.\./db/|from "../../database/db/|g' "$file"
    sed -i 's|from "\.\./types/|from "./|g' "$file"
    
    # Update specific service imports
    sed -i 's|from "\.\./services/email\.service"|from "../../shared/email.service"|g' "$file"
    
    # Update model imports for cross-feature references
    sed -i 's|from "\.\.\/\.\.\/models/|from "../../database/models/|g' "$file"
    sed -i 's|from "\.\.\/models/|from "../../database/models/|g' "$file"
}

# Update all TypeScript files in features
find features -name "*.ts" -type f | while read -r file; do
    update_imports "$file"
done

# Update shared files
find shared -name "*.ts" -type f | while read -r file; do
    update_imports "$file"
done

echo "✅ Import paths updated successfully!"