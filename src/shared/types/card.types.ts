export enum CardCategory {
  POKEMON = "pokemon",
  YUGIOH = "yugioh",
}

// Helper function to convert API input to enum
export function getCardCategory(input: string): CardCategory {
  const lowerInput = input.toLowerCase();
  switch (lowerInput) {
    case 'pokemon':
      return CardCategory.POKEMON;
    case 'yugioh':
      return CardCategory.YUGIOH;
    default:
      throw new Error(`Invalid card category: ${input}`);
  }
}

// Helper function to check if a string is a valid card category
export function isValidCardCategory(input: string): boolean {
  return Object.values(CardCategory).includes(input as CardCategory);
}

// Get all valid category values as array
export function getValidCardCategories(): string[] {
  return Object.values(CardCategory);
}