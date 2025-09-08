'use client';

import React from 'react';
import { InstaQLEntity } from '@instantdb/react';
import db from '../../../lib/db';
import schema from '../../../instant.schema';

// Shared component for displaying menu items
function MenuItemCard({ item }: { item: any }) {
  // Helper function to get recipe image data
  const getRecipeImage = (recipe: any) => {
    return recipe.imageData || '';
  };

  return (
    <div className="bg-gray-900 border border-saffron rounded-lg overflow-hidden flex flex-col h-full">
      {(() => {
        const imageUrl = getRecipeImage(item.recipe);
        return imageUrl ? (
          <div className="w-full aspect-square overflow-hidden">
            <img 
              src={imageUrl} 
              alt={item.recipe.name}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        ) : null;
      })()}
      <div className="p-3 flex flex-col flex-grow">
        <h3 className="text-2xl font-semibold text-saffron mb-4 text-center">{item.recipe.name}</h3>
        
        <div className="flex-grow flex items-center justify-center">
          {item.recipe.description && (
            <p className="text-night-800 text-center">{item.recipe.description}</p>
          )}
        </div>
        
        {item.recipe.ingredients && item.recipe.ingredients.length > 0 && (
          <p className="text-night-900 text-sm italic mt-4 pt-4 border-t border-gray-800 text-center">
            {item.recipe.ingredients.map((ingredient: any) => ingredient.name).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}

type MenuWithItems = InstaQLEntity<
  typeof schema,
  'menus',
  { items: { recipe: { ingredients: {} } } }
>;

// Helper function to format display fractions with proper styling
function formatDisplayFraction(amount: string): React.JSX.Element {
  // Handle mixed numbers like "1 1/2"
  const mixedMatch = amount.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = mixedMatch[1];
    const num = mixedMatch[2];
    const den = mixedMatch[3];
    
    // Use Unicode fractions for common cases
    const commonFractions: { [key: string]: string } = {
      '1/2': '½',
      '1/3': '⅓',
      '2/3': '⅔',
      '1/4': '¼',
      '3/4': '¾',
      '1/8': '⅛',
      '3/8': '⅜',
      '5/8': '⅝',
      '7/8': '⅞'
    };
    
    const fractionKey = `${num}/${den}`;
    const unicodeFraction = commonFractions[fractionKey];
    
    if (unicodeFraction) {
      return <span>{whole}{unicodeFraction}</span>;
    }
    
    // Fallback to superscript/subscript for uncommon fractions
    return (
      <span>
        {whole}
        <sup className="text-xs">{num}</sup>
        <span className="mx-0.5">⁄</span>
        <sub className="text-xs">{den}</sub>
      </span>
    );
  }
  
  // Handle simple fractions like "1/2"
  const fractionMatch = amount.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const num = fractionMatch[1];
    const den = fractionMatch[2];
    
    // Use Unicode fractions for common cases
    const commonFractions: { [key: string]: string } = {
      '1/2': '½',
      '1/3': '⅓',
      '2/3': '⅔',
      '1/4': '¼',
      '3/4': '¾',
      '1/8': '⅛',
      '3/8': '⅜',
      '5/8': '⅝',
      '7/8': '⅞'
    };
    
    const fractionKey = `${num}/${den}`;
    const unicodeFraction = commonFractions[fractionKey];
    
    if (unicodeFraction) {
      return <span>{unicodeFraction}</span>;
    }
    
    // Fallback to superscript/subscript for uncommon fractions
    return (
      <span>
        <sup className="text-xs">{num}</sup>
        <span className="mx-0.5">⁄</span>
        <sub className="text-xs">{den}</sub>
      </span>
    );
  }
  
  // Return regular text for whole numbers or non-fractions
  return <span>{amount}</span>;
}

export default async function PublicMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return <MenuPageContent menuId={id} />;
}

function MenuPageContent({ menuId }: { menuId: string }) {
  const { data, isLoading, error } = db.useQuery({
    menus: {
      $: { where: { id: menuId } },
      items: {
        $: { order: { order: 'asc' } },
        recipe: {
          ingredients: {
            $: { order: { order: 'asc' } }
          }
        }
      }
    }
  });

  const menu = data?.menus?.[0] as MenuWithItems | undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-night flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🍸</div>
          <p className="text-night-800 text-lg">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className="min-h-screen bg-night flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">😞</div>
          <h1 className="text-2xl font-bold text-saffron mb-2">Menu Not Found</h1>
          <p className="text-night-800">This menu doesn't exist or is no longer available.</p>
        </div>
      </div>
    );
  }

  if (!menu.isActive) {
    return (
      <div className="min-h-screen bg-night flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-saffron mb-2">Menu Unavailable</h1>
          <p className="text-night-800">This menu is currently inactive.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-night">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🍸</div>
          <h1 className="text-4xl font-bold text-saffron mb-2">{menu.name}</h1>
          {menu.description && (
            <p className="text-night-800 text-lg">{menu.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menu.items?.map((item: any) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </div>

        {(!menu.items || menu.items.length === 0) && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-lg">This menu doesn't have any recipes yet.</p>
          </div>
        )}

        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Powered by Bar Buddy 🍸</p>
        </div>
      </div>
    </div>
  );
}