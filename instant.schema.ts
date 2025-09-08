// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    ingredients: i.entity({
      amount: i.string(),
      name: i.string().indexed(),
      order: i.number().indexed(),
      unit: i.string().optional(),
    }),
    menuItems: i.entity({
      order: i.number().indexed(),
    }),
    menus: i.entity({
      createdAt: i.number().indexed(),
      description: i.string().optional(),
      isActive: i.boolean().indexed(),
      name: i.string().indexed(),
      qrCode: i.string().optional(),
    }),
    recipes: i.entity({
      createdAt: i.number().indexed(),
      description: i.string().optional(),
      imageData: i.string().optional(),
      name: i.string().indexed(),
      updatedAt: i.number().indexed(),
    }),
    redditCache: i.entity({
      url: i.string().unique().indexed(),
      title: i.string().optional(),
      description: i.string().optional(),
      ingredients: i.json(),
      normalized: i.json().optional(),
      imageUrl: i.string().optional(),
      source: i.string(),
      extractedFrom: i.string().optional(),
      createdAt: i.number().indexed(),
    }),
  },
  links: {
    ingredientsRecipe: {
      forward: {
        on: "ingredients",
        has: "one",
        label: "recipe",
      },
      reverse: {
        on: "recipes",
        has: "many",
        label: "ingredients",
      },
    },
    menuItemsMenu: {
      forward: {
        on: "menuItems",
        has: "one",
        label: "menu",
      },
      reverse: {
        on: "menus",
        has: "many",
        label: "items",
      },
    },
    menuItemsRecipe: {
      forward: {
        on: "menuItems",
        has: "one",
        label: "recipe",
      },
      reverse: {
        on: "recipes",
        has: "many",
        label: "menuItems",
      },
    },
    menusOwner: {
      forward: {
        on: "menus",
        has: "one",
        label: "owner",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "menus",
      },
    },
    recipesOwner: {
      forward: {
        on: "recipes",
        has: "one",
        label: "owner",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "recipes",
      },
    },
  },
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
