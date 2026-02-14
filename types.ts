
export enum CategoryType {
  GRAIN = 'Grain',
  MEAT = 'Meat',
  FISH = 'Fish/Seafood',
  DAIRY = 'Dairy/Milk',
  OILS = 'Oils/Fats',
  FRUIT_VEG = 'Fruit/Vegetables',
  SUGAR = 'Sugar/Sweets',
  DRINKS = 'Drinks',
  ALCOHOL = 'Alcohol'
}

export interface Ingredient {
  id: string;
  name: string;
  category: CategoryType;
  ghgFactor: number; // kgCO2e/£
  price: number; // Default £ per serving
  code: string; // Product category code from CSV
  icon: string; // Emoji or icon identifier
  unit: string; // e.g., "1 Bowl", "1 Piece"
  weightGrams: number; // e.g., 150
  nutrients: {
    protein: number;
    carbs: number;
    fiber: number;
    fat: number;
    vitamins: number;
  };
}

export interface PlateItem extends Ingredient {
  instanceId: string;
  x: number;
  y: number;
  quantity: number; // Multiplier for portion control (e.g., 0.5, 1, 2)
}
