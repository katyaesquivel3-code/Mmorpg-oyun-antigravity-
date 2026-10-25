/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Kamp Ateşi Yemek Pişirme Sistemi (CookingSystem)
 * (1-5 Malzeme Kombinasyonu, Türk Mutfağı Tarifleri, Keşif Kaydı & Yanık Yemek Mekaniği)
 */

import { InventoryManager } from '../inventory/InventoryManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export interface CookingRecipe {
  id: string;
  foodId: string;
  nameTr: string;
  requiredIngredientIds: string[]; // Gerekli malzeme kimlikleri
  discovered: boolean;
}

export class CookingSystem {
  private static instance: CookingSystem | null = null;
  public recipes: CookingRecipe[] = [
    {
      id: 'recipe_kimiz',
      foodId: 'food_kimiz',
      nameTr: 'Kutsal Kımız',
      requiredIngredientIds: ['mat_milk', 'mat_honey'],
      discovered: false
    },
    {
      id: 'recipe_kavurma',
      foodId: 'food_kavurma',
      nameTr: 'Bozkır Kavurması',
      requiredIngredientIds: ['mat_meat', 'mat_herb'],
      discovered: false
    },
    {
      id: 'recipe_kurut',
      foodId: 'food_kurut',
      nameTr: 'Kurut (Kuru Yoğurt)',
      requiredIngredientIds: ['mat_milk', 'mat_milk'],
      discovered: false
    },
    {
      id: 'recipe_pisi',
      foodId: 'food_pisi',
      nameTr: 'Köz Pişisi',
      requiredIngredientIds: ['mat_grain', 'mat_herb'],
      discovered: false
    },
    {
      id: 'recipe_talkan',
      foodId: 'food_talkan',
      nameTr: 'Talkan (Arpa Aşı)',
      requiredIngredientIds: ['mat_grain', 'mat_honey'],
      discovered: false
    },
    {
      id: 'recipe_ayran',
      foodId: 'food_ayran',
      nameTr: 'Naneli Yayık Ayranı',
      requiredIngredientIds: ['mat_milk', 'mat_herb'],
      discovered: false
    },
    {
      id: 'recipe_panzehir',
      foodId: 'food_panzehir',
      nameTr: 'Panzehir Şerbeti',
      requiredIngredientIds: ['mat_pure_lotus', 'mat_herb', 'mat_honey'],
      discovered: false
    }
  ];

  public static getInstance(): CookingSystem {
    if (!CookingSystem.instance) {
      CookingSystem.instance = new CookingSystem();
    }
    return CookingSystem.instance;
  }

  /**
   * Kazana atılan 1-5 malzemeyi pişirir
   */
  public cook(ingredientIds: string[]): string {
    const inv = InventoryManager.getInstance();
    if (ingredientIds.length === 0) return 'food_burnt';

    // Malzemeleri envanterden eksilt
    for (const id of ingredientIds) {
      inv.removeItem(id, 1);
    }

    ProceduralAudio.playCookingSizzle();

    // Eşleşen tarif ara
    const sortedInputs = [...ingredientIds].sort();
    let resultFoodId = 'food_burnt';

    for (const recipe of this.recipes) {
      const sortedReqs = [...recipe.requiredIngredientIds].sort();
      if (this.arraysMatch(sortedInputs, sortedReqs)) {
        resultFoodId = recipe.foodId;
        if (!recipe.discovered) {
          recipe.discovered = true;
          EventBus.emit('ui:loot_toast', { text: `📜 Yeni Tarif Keşfedildi: ${recipe.nameTr}!` });
        }
        break;
      }
    }

    // Elde edilen yemeği envantere ekle
    inv.addItem(resultFoodId, 1);

    if (resultFoodId === 'food_burnt') {
      EventBus.emit('ui:loot_toast', { text: 'Kazanda yemek yandı! (Közlenmiş Kömür Aşı elde edildi)' });
    } else {
      EventBus.emit('crafting:cook', { recipeId: resultFoodId, foodName: resultFoodId });
    }

    return resultFoodId;
  }

  private arraysMatch(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false;
    }
    return true;
  }
}
