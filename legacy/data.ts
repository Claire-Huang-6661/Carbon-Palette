
import { Ingredient, CategoryType } from './types';

export const INGREDIENTS: Ingredient[] = [
  // Grains
  { id: '1', name: 'Rice', icon: '🍚', unit: '1 Bowl', weightGrams: 150, category: CategoryType.GRAIN, ghgFactor: 0.774, price: 1.2, code: '1.1.1.1', nutrients: { protein: 4, carbs: 45, fiber: 1, fat: 0, vitamins: 2 } },
  { id: '2', name: 'Bread', icon: '🍞', unit: '2 Slices', weightGrams: 80, category: CategoryType.GRAIN, ghgFactor: 0.774, price: 1.5, code: '1.1.1.2', nutrients: { protein: 6, carbs: 35, fiber: 2, fat: 1, vitamins: 3 } },
  { id: '3', name: 'Pasta', icon: '🍝', unit: '1 Plate', weightGrams: 200, category: CategoryType.GRAIN, ghgFactor: 0.774, price: 1.1, code: '1.1.2', nutrients: { protein: 8, carbs: 50, fiber: 3, fat: 1, vitamins: 2 } },
  { id: '4', name: 'Quinoa', icon: '🍲', unit: '1 Bowl', weightGrams: 140, category: CategoryType.GRAIN, ghgFactor: 0.774, price: 2.2, code: '1.1.3', nutrients: { protein: 8, carbs: 39, fiber: 5, fat: 4, vitamins: 8 } },
  { id: '5', name: 'Oats', icon: '🥣', unit: '1 Bowl', weightGrams: 100, category: CategoryType.GRAIN, ghgFactor: 0.774, price: 0.8, code: '1.1.4', nutrients: { protein: 13, carbs: 68, fiber: 10, fat: 7, vitamins: 15 } },
  
  // Meats
  { id: '8', name: 'Beef', icon: '🥩', unit: '1 Steak', weightGrams: 200, category: CategoryType.MEAT, ghgFactor: 2.364, price: 8.5, code: '1.1.5', nutrients: { protein: 50, carbs: 0, fiber: 0, fat: 30, vitamins: 10 } },
  { id: '9', name: 'Bacon', icon: '🥓', unit: '3 Strips', weightGrams: 100, category: CategoryType.MEAT, ghgFactor: 2.364, price: 5.5, code: '1.1.6', nutrients: { protein: 25, carbs: 0, fiber: 0, fat: 20, vitamins: 5 } },
  { id: '10', name: 'Lamb', icon: '🍖', unit: '1 Chop', weightGrams: 180, category: CategoryType.MEAT, ghgFactor: 2.364, price: 9.0, code: '1.1.7', nutrients: { protein: 45, carbs: 0, fiber: 0, fat: 35, vitamins: 8 } },
  { id: '11', name: 'Chicken', icon: '🍗', unit: '1 Breast', weightGrams: 150, category: CategoryType.MEAT, ghgFactor: 2.364, price: 4.5, code: '1.1.8', nutrients: { protein: 35, carbs: 0, fiber: 0, fat: 5, vitamins: 5 } },
  { id: '12', name: 'Turkey', icon: '🦃', unit: '2 Slices', weightGrams: 120, category: CategoryType.MEAT, ghgFactor: 2.364, price: 4.8, code: '1.1.9', nutrients: { protein: 29, carbs: 0, fiber: 0, fat: 1, vitamins: 12 } },
  
  // Fish
  { id: '17', name: 'Salmon', icon: '🐟', unit: '1 Fillet', weightGrams: 120, category: CategoryType.FISH, ghgFactor: 0.152, price: 6.0, code: '1.1.11.1', nutrients: { protein: 25, carbs: 0, fiber: 0, fat: 15, vitamins: 15 } },
  { id: '18', name: 'Shrimp', icon: '🍤', unit: '6 Pieces', weightGrams: 90, category: CategoryType.FISH, ghgFactor: 0.152, price: 7.5, code: '1.1.11.2', nutrients: { protein: 20, carbs: 0, fiber: 0, fat: 1, vitamins: 10 } },
  { id: '19', name: 'Lobster', icon: '🦞', unit: '1 Tail', weightGrams: 150, category: CategoryType.FISH, ghgFactor: 0.152, price: 15.0, code: '1.1.11.3', nutrients: { protein: 28, carbs: 0, fiber: 0, fat: 2, vitamins: 20 } },
  
  // Dairy
  { id: '20', name: 'Milk', icon: '🥛', unit: '1 Glass', weightGrams: 240, category: CategoryType.DAIRY, ghgFactor: 0.649, price: 1.0, code: '1.1.12.1', nutrients: { protein: 8, carbs: 12, fiber: 0, fat: 8, vitamins: 20 } },
  { id: '21', name: 'Egg', icon: '🥚', unit: '1 Piece', weightGrams: 50, category: CategoryType.DAIRY, ghgFactor: 0.649, price: 0.5, code: '1.1.12.2', nutrients: { protein: 6, carbs: 0, fiber: 0, fat: 5, vitamins: 10 } },
  { id: '23', name: 'Cheese', icon: '🧀', unit: '1 Slice', weightGrams: 30, category: CategoryType.DAIRY, ghgFactor: 0.649, price: 1.2, code: '1.1.13', nutrients: { protein: 7, carbs: 0, fiber: 0, fat: 9, vitamins: 8 } },
  { id: '24', name: 'Butter', icon: '🧈', unit: '1 Pat', weightGrams: 10, category: CategoryType.DAIRY, ghgFactor: 0.649, price: 0.3, code: '1.1.14', nutrients: { protein: 0, carbs: 0, fiber: 0, fat: 8, vitamins: 2 } },
  
  // Fruit & Veg
  { id: '31', name: 'Orange', icon: '🍊', unit: '1 Piece', weightGrams: 130, category: CategoryType.FRUIT_VEG, ghgFactor: 0.077, price: 0.8, code: '1.1.19.1', nutrients: { protein: 1, carbs: 12, fiber: 3, fat: 0, vitamins: 50 } },
  { id: '32', name: 'Apple', icon: '🍎', unit: '1 Piece', weightGrams: 150, category: CategoryType.FRUIT_VEG, ghgFactor: 0.077, price: 0.9, code: '1.1.19.3', nutrients: { protein: 0, carbs: 20, fiber: 4, fat: 0, vitamins: 10 } },
  { id: '33', name: 'Grapes', icon: '🍇', unit: '1 Bunch', weightGrams: 120, category: CategoryType.FRUIT_VEG, ghgFactor: 0.077, price: 2.0, code: '1.1.19.4', nutrients: { protein: 1, carbs: 18, fiber: 1, fat: 0, vitamins: 15 } },
  { id: '34', name: 'Melon', icon: '🍈', unit: '1 Wedge', weightGrams: 200, category: CategoryType.FRUIT_VEG, ghgFactor: 0.077, price: 1.5, code: '1.1.19.5', nutrients: { protein: 2, carbs: 16, fiber: 2, fat: 0, vitamins: 40 } },
  { id: '40', name: 'Spinach', icon: '🥬', unit: '1 Bunch', weightGrams: 100, category: CategoryType.FRUIT_VEG, ghgFactor: 0.077, price: 1.5, code: '1.1.23.1', nutrients: { protein: 3, carbs: 4, fiber: 2, fat: 0, vitamins: 45 } },
  { id: '41', name: 'Broccoli', icon: '🥦', unit: '1 Stem', weightGrams: 100, category: CategoryType.FRUIT_VEG, ghgFactor: 0.077, price: 1.2, code: '1.1.24', nutrients: { protein: 3, carbs: 7, fiber: 3, fat: 0, vitamins: 30 } },
  { id: '46', name: 'Potato', icon: '🥔', unit: '1 Piece', weightGrams: 150, category: CategoryType.FRUIT_VEG, ghgFactor: 0.077, price: 0.5, code: '1.1.26', nutrients: { protein: 2, carbs: 30, fiber: 3, fat: 0, vitamins: 10 } },
  { id: '47', name: 'Avocado', icon: '🥑', unit: 'Half', weightGrams: 100, category: CategoryType.FRUIT_VEG, ghgFactor: 0.077, price: 2.0, code: '1.1.27', nutrients: { protein: 2, carbs: 9, fiber: 7, fat: 15, vitamins: 20 } },
  { id: '48', name: 'Tomato', icon: '🍅', unit: '1 Piece', weightGrams: 100, category: CategoryType.FRUIT_VEG, ghgFactor: 0.077, price: 0.6, code: '1.1.28', nutrients: { protein: 1, carbs: 4, fiber: 1, fat: 0, vitamins: 15 } },
  { id: '49', name: 'Corn', icon: '🌽', unit: '1 Ear', weightGrams: 120, category: CategoryType.FRUIT_VEG, ghgFactor: 0.077, price: 0.8, code: '1.1.29', nutrients: { protein: 4, carbs: 24, fiber: 3, fat: 1, vitamins: 10 } },

  // Drinks
  { id: '57', name: 'Coffee', icon: '☕', unit: '1 Cup', weightGrams: 200, category: CategoryType.DRINKS, ghgFactor: 0.142, price: 3.0, code: '1.2.1', nutrients: { protein: 0, carbs: 0, fiber: 0, fat: 0, vitamins: 1 } },
  { id: '58', name: 'Tea', icon: '🍵', unit: '1 Pot', weightGrams: 250, category: CategoryType.DRINKS, ghgFactor: 0.142, price: 2.5, code: '1.2.2', nutrients: { protein: 0, carbs: 0, fiber: 0, fat: 0, vitamins: 2 } },
  { id: '59', name: 'Juice', icon: '🥤', unit: '1 Glass', weightGrams: 250, category: CategoryType.DRINKS, ghgFactor: 0.142, price: 2.0, code: '1.2.3', nutrients: { protein: 1, carbs: 25, fiber: 1, fat: 0, vitamins: 60 } },
  { id: '60', name: 'Beer', icon: '🍺', unit: '1 Pint', weightGrams: 500, category: CategoryType.ALCOHOL, ghgFactor: 0.142, price: 4.5, code: '1.3.1', nutrients: { protein: 2, carbs: 15, fiber: 0, fat: 0, vitamins: 5 } },
  { id: '61', name: 'Wine', icon: '🍷', unit: '1 Glass', weightGrams: 150, category: CategoryType.ALCOHOL, ghgFactor: 0.142, price: 6.5, code: '1.3.2', nutrients: { protein: 0, carbs: 5, fiber: 0, fat: 0, vitamins: 3 } },
  { id: '62', name: 'Cocktail', icon: '🍸', unit: '1 Glass', weightGrams: 120, category: CategoryType.ALCOHOL, ghgFactor: 0.142, price: 9.0, code: '1.3.3', nutrients: { protein: 0, carbs: 20, fiber: 0, fat: 0, vitamins: 2 } },

  // Sweets
  { id: '51', name: 'Chocolate', icon: '🍫', unit: '1 Bar', weightGrams: 40, category: CategoryType.SUGAR, ghgFactor: 0.281, price: 2.5, code: '1.1.30', nutrients: { protein: 2, carbs: 25, fiber: 1, fat: 12, vitamins: 1 } },
  { id: '52', name: 'Ice Cream', icon: '🍦', unit: '1 Scoop', weightGrams: 60, category: CategoryType.SUGAR, ghgFactor: 0.281, price: 1.8, code: '1.1.31', nutrients: { protein: 2, carbs: 15, fiber: 0, fat: 8, vitamins: 5 } },
  { id: '53', name: 'Cookie', icon: '🍪', unit: '2 Pieces', weightGrams: 50, category: CategoryType.SUGAR, ghgFactor: 0.281, price: 1.2, code: '1.1.32', nutrients: { protein: 2, carbs: 32, fiber: 1, fat: 14, vitamins: 1 } },
];
