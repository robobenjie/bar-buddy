import { i } from '@instantdb/react';

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    recipes: i.entity({
      name: i.string().indexed(),
      description: i.string().optional(),
      photoUrl: i.string().optional(),
      fileid: i.string().optional(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().indexed(),
    }),
    ingredients: i.entity({
      name: i.string().indexed(),
      amount: i.string(),
      unit: i.string().optional(),
      order: i.number().indexed(),
    }),
    menus: i.entity({
      name: i.string().indexed(),
      description: i.string().optional(),
      isActive: i.boolean().indexed(),
      qrCode: i.string().optional(),
      createdAt: i.number().indexed(),
    }),
    menuItems: i.entity({
      order: i.number().indexed(),
    }),
  },
  links: {
    recipeOwner: {
      forward: { on: 'recipes', has: 'one', label: 'owner' },
      reverse: { on: '$users', has: 'many', label: 'recipes' },
    },
    recipeIngredients: {
      forward: { on: 'ingredients', has: 'one', label: 'recipe' },
      reverse: { on: 'recipes', has: 'many', label: 'ingredients' },
    },
    menuOwner: {
      forward: { on: 'menus', has: 'one', label: 'owner' },
      reverse: { on: '$users', has: 'many', label: 'menus' },
    },
    menuRecipes: {
      forward: { on: 'menuItems', has: 'one', label: 'menu' },
      reverse: { on: 'menus', has: 'many', label: 'items' },
    },
    menuItemRecipe: {
      forward: { on: 'menuItems', has: 'one', label: 'recipe' },
      reverse: { on: 'recipes', has: 'many', label: 'menuItems' },
    },
  },
});

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;