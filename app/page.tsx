'use client';

import React, { useState, useEffect } from 'react';
import { id, InstaQLEntity } from '@instantdb/react';
import QRCode from 'qrcode';
import db from '../lib/db';
import schema from '../instant.schema';

type RecipeWithIngredients = InstaQLEntity<
  typeof schema,
  'recipes',
  { ingredients: {} }
>;

type MenuWithItems = InstaQLEntity<
  typeof schema,
  'menus',
  { items: { recipe: { ingredients: {} } } }
>;

function randomHandle() {
  const adjectives = ['Mixologist', 'Bartender', 'Chef', 'Master', 'Expert', 'Pro'];
  const nouns = ['Cocktail', 'Martini', 'Whiskey', 'Gin', 'Rum', 'Vodka'];
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
  return `${randomAdjective}${randomNoun}${randomSuffix}`;
}

async function createProfile(userId: string) {
  await db.transact(
    db.tx.profiles[userId]
      .update({
        handle: randomHandle(),
      })
      .link({ user: userId }),
  );
}

function Login() {
  const [sentEmail, setSentEmail] = useState('');

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900">
      <div className="max-w-md w-full mx-4">
        {!sentEmail ? (
          <EmailStep onSendEmail={setSentEmail} />
        ) : (
          <CodeStep sentEmail={sentEmail} />
        )}
      </div>
    </div>
  );
}

function EmailStep({ onSendEmail }: { onSendEmail: (email: string) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const inputEl = inputRef.current!;
    const email = inputEl.value;
    onSendEmail(email);
    db.auth.sendMagicCode({ email }).catch((err) => {
      alert('Uh oh: ' + err.body?.message);
      onSendEmail('');
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">🍸 Bar Buddy</h1>
        <p className="text-gray-400 mb-8">Your personal cocktail companion</p>
      </div>
      
      <div className="bg-gray-800 p-8 rounded-lg border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Sign In</h2>
        <p className="text-gray-300 mb-6">
          Enter your email to get started with Bar Buddy - create, manage, and share your cocktail recipes.
        </p>
        <input
          ref={inputRef}
          type="email"
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Enter your email"
          required
          autoFocus
        />
        <button
          type="submit"
          className="w-full mt-4 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Send Magic Code
        </button>
      </div>
    </form>
  );
}

function CodeStep({ sentEmail }: { sentEmail: string }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const inputEl = inputRef.current!;
    const code = inputEl.value;
    db.auth.signInWithMagicCode({ email: sentEmail, code }).catch((err) => {
      inputEl.value = '';
      alert('Uh oh: ' + err.body?.message);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">🍸 Bar Buddy</h1>
      </div>
      
      <div className="bg-gray-800 p-8 rounded-lg border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Enter your code</h2>
        <p className="text-gray-300 mb-6">
          We sent a verification code to <strong className="text-white">{sentEmail}</strong>. 
          Check your email and enter the code below.
        </p>
        <input
          ref={inputRef}
          type="text"
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Enter verification code"
          required
          autoFocus
        />
        <button
          type="submit"
          className="w-full mt-4 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Verify Code
        </button>
      </div>
    </form>
  );
}

function Navigation({ currentView, setCurrentView }: { 
  currentView: string; 
  setCurrentView: (view: string) => void; 
}) {
  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-white cursor-pointer" onClick={() => setCurrentView('recipes')}>🍸 Bar Buddy</h1>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => setCurrentView('menus')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentView === 'menus'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              Menus
            </button>
            <button
              onClick={() => db.auth.signOut()}
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function RecipesView({ onSelectRecipe }: { onSelectRecipe: (recipeId: string) => void }) {
  const user = db.useUser();
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<string | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<{ id: string; name: string } | null>(null);
  const [newRecipe, setNewRecipe] = useState({ name: '', description: '' });
  const [ingredients, setIngredients] = useState([{ name: '', amount: '', unit: '' }]);

  const { data, isLoading } = db.useQuery({
    recipes: {
      $: { 
        where: { 'owner.id': user.id },
        order: { createdAt: 'desc' }
      },
      ingredients: {
        $: { order: { order: 'asc' } }
      }
    },
  });

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: '', unit: '' }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: string, value: string) => {
    const updated = ingredients.map((ing, i) => 
      i === index ? { ...ing, [field]: value } : ing
    );
    setIngredients(updated);
  };

  const saveRecipe = () => {
    if (!newRecipe.name.trim()) return;

    const recipeId = editingRecipe || id();
    const now = Date.now();

    const transactions = [];
    
    if (editingRecipe) {
      // For editing, just update the recipe without changing links
      transactions.push(
        db.tx.recipes[recipeId]
          .update({
            name: newRecipe.name,
            description: newRecipe.description,
            updatedAt: now,
          })
      );
    } else {
      // For creating, update and link to owner
      transactions.push(
        db.tx.recipes[recipeId]
          .update({
            name: newRecipe.name,
            description: newRecipe.description,
            createdAt: now,
            updatedAt: now,
          })
          .link({ owner: user.id })
      );
    }

    // If editing, delete existing ingredients first
    if (editingRecipe) {
      const existingRecipe = data?.recipes?.find(r => r.id === editingRecipe);
      if (existingRecipe?.ingredients) {
        transactions.push(
          ...existingRecipe.ingredients.map((ing: any) => 
            db.tx.ingredients[ing.id].delete()
          )
        );
      }
    }

    // Add new ingredients
    transactions.push(
      ...ingredients
        .filter(ing => ing.name.trim())
        .map((ingredient, index) => 
          db.tx.ingredients[id()]
            .update({
              name: ingredient.name,
              amount: ingredient.amount,
              unit: ingredient.unit,
              order: index,
            })
            .link({ recipe: recipeId })
        )
    );

    db.transact(transactions);

    setNewRecipe({ name: '', description: '' });
    setIngredients([{ name: '', amount: '', unit: '' }]);
    setEditingRecipe(null);
    setShowForm(false);
  };

  const confirmDeleteRecipe = (recipe: RecipeWithIngredients) => {
    setDeletingRecipe({ id: recipe.id, name: recipe.name });
  };

  const deleteRecipe = (recipeId: string) => {
    db.transact(db.tx.recipes[recipeId].delete());
    setDeletingRecipe(null);
  };

  const startEditRecipe = (recipe: RecipeWithIngredients) => {
    setEditingRecipe(recipe.id);
    setNewRecipe({ name: recipe.name, description: recipe.description || '' });
    setIngredients(
      recipe.ingredients?.map((ing: any) => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit || ''
      })) || [{ name: '', amount: '', unit: '' }]
    );
    setShowForm(true);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">Loading recipes...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white">My Recipes</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Recipe
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">{editingRecipe ? 'Edit Recipe' : 'New Recipe'}</h3>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Recipe name"
                value={newRecipe.name}
                onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
              />
              <textarea
                placeholder="Description (optional)"
                value={newRecipe.description}
                onChange={(e) => setNewRecipe({ ...newRecipe, description: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 h-24"
              />

              <h4 className="text-lg font-semibold text-white mt-6 mb-2">Ingredients</h4>
              {ingredients.map((ingredient, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ingredient name"
                    value={ingredient.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Amount"
                    value={ingredient.amount}
                    onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                    className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Unit"
                    value={ingredient.unit}
                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                    className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
                  />
                  <button
                    onClick={() => removeIngredient(index)}
                    className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
              
              <button
                onClick={addIngredient}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Add Ingredient
              </button>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={saveRecipe}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingRecipe(null);
                  setNewRecipe({ name: '', description: '' });
                  setIngredients([{ name: '', amount: '', unit: '' }]);
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 w-full max-w-md">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-white mb-4">Delete Recipe</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete <strong className="text-white">"{deletingRecipe.name}"</strong>? 
                This action cannot be undone.
              </p>
              
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => deleteRecipe(deletingRecipe.id)}
                  className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Recipe
                </button>
                <button
                  onClick={() => setDeletingRecipe(null)}
                  className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data?.recipes?.map((recipe: RecipeWithIngredients) => (
          <div key={recipe.id} className="bg-gray-800 border border-gray-700 rounded-lg p-6 cursor-pointer hover:bg-gray-750 hover:border-blue-500 transition-colors"
               onClick={() => onSelectRecipe(recipe.id)}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-white">{recipe.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditRecipe(recipe);
                  }}
                  className="text-blue-400 hover:text-blue-300 text-sm px-2 py-1"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDeleteRecipe(recipe);
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            </div>
            
            {recipe.description && (
              <p className="text-gray-400 mb-4">{recipe.description}</p>
            )}
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-300">Ingredients:</h4>
              {recipe.ingredients?.map((ingredient: any) => (
                <div key={ingredient.id} className="text-gray-300 text-sm">
                  {formatDisplayFraction(ingredient.amount)} {ingredient.unit} {ingredient.name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper function to format display fractions with proper styling
function formatDisplayFraction(amount: string): JSX.Element {
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

function MakeDrinkView({ selectedRecipeId, onBackToRecipes }: { 
  selectedRecipeId: string | null; 
  onBackToRecipes: () => void; 
}) {
  const user = db.useUser();
  const [multiplier, setMultiplier] = useState(1);
  const [completedIngredients, setCompletedIngredients] = useState<Set<string>>(new Set());

  const { data: recipesData, isLoading: recipesLoading } = db.useQuery({
    recipes: {
      $: { 
        where: { 'owner.id': user.id },
        order: { name: 'asc' }
      },
      ingredients: {
        $: { order: { order: 'asc' } }
      }
    },
  });

  const currentRecipe = recipesData?.recipes?.find(r => r.id === selectedRecipeId);

  const toggleIngredient = (ingredientId: string) => {
    const newCompleted = new Set(completedIngredients);
    if (newCompleted.has(ingredientId)) {
      newCompleted.delete(ingredientId);
    } else {
      newCompleted.add(ingredientId);
    }
    setCompletedIngredients(newCompleted);
  };

  const resetProgress = () => {
    setCompletedIngredients(new Set());
  };

  const isCompleted = currentRecipe?.ingredients?.length > 0 && 
    completedIngredients.size === currentRecipe?.ingredients?.length;

  if (recipesLoading) {
    return <div className="p-8 text-center text-gray-400">Loading recipes...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white">Make a Drink</h2>
        <button
          onClick={() => {
            onBackToRecipes();
            resetProgress();
          }}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Back to Recipes
        </button>
      </div>

      {!selectedRecipeId || !currentRecipe ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400 text-lg">No recipe selected. Go back and select a recipe to make.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{currentRecipe?.name}</h3>
                {currentRecipe?.description && (
                  <p className="text-gray-400">{currentRecipe.description}</p>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-gray-300">Servings:</span>
                <button
                  onClick={() => setMultiplier(Math.max(1, multiplier - 1))}
                  className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  -
                </button>
                <span className="text-white font-semibold min-w-[2ch] text-center">{multiplier}</span>
                <button
                  onClick={() => setMultiplier(multiplier + 1)}
                  className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-300">
                Ingredients ({completedIngredients.size}/{currentRecipe?.ingredients?.length || 0})
              </h4>
              <button
                onClick={resetProgress}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              >
                Reset Progress
              </button>
            </div>

            <div className="space-y-3">
              {currentRecipe?.ingredients?.map((ingredient: any) => {
                const isCompleted = completedIngredients.has(ingredient.id);
                
                const scaledAmount = (() => {
                  const amount = ingredient.amount.trim();
                  
                  // Handle mixed numbers like "1 1/2"
                  const mixedMatch = amount.match(/^(\d+)\s+(\d+)\/(\d+)$/);
                  if (mixedMatch) {
                    const whole = parseInt(mixedMatch[1]);
                    const num = parseInt(mixedMatch[2]);
                    const den = parseInt(mixedMatch[3]);
                    const decimal = whole + (num / den);
                    const result = decimal * multiplier;
                    return formatFraction(result);
                  }
                  
                  // Handle simple fractions like "1/2" or "3/4"
                  const fractionMatch = amount.match(/^(\d+)\/(\d+)$/);
                  if (fractionMatch) {
                    const num = parseInt(fractionMatch[1]);
                    const den = parseInt(fractionMatch[2]);
                    const decimal = num / den;
                    const result = decimal * multiplier;
                    return formatFraction(result);
                  }
                  
                  // Handle decimal numbers
                  const num = parseFloat(amount);
                  if (!isNaN(num)) {
                    const result = num * multiplier;
                    return formatFraction(result);
                  }
                  
                  // Return as-is if we can't parse it
                  return amount;
                })();
                
                // Helper function to format decimal back to fraction when appropriate
                function formatFraction(decimal: number): string {
                  // If it's a whole number, return as integer
                  if (decimal === Math.floor(decimal)) {
                    return decimal.toString();
                  }
                  
                  // Common fractions lookup
                  const fractions: { [key: string]: string } = {
                    '0.125': '1/8',
                    '0.25': '1/4',
                    '0.33': '1/3',
                    '0.333': '1/3',
                    '0.5': '1/2',
                    '0.66': '2/3',
                    '0.667': '2/3',
                    '0.75': '3/4',
                    '0.875': '7/8',
                    '1.25': '1 1/4',
                    '1.33': '1 1/3',
                    '1.333': '1 1/3',
                    '1.5': '1 1/2',
                    '1.66': '1 2/3',
                    '1.667': '1 2/3',
                    '1.75': '1 3/4',
                    '2.25': '2 1/4',
                    '2.33': '2 1/3',
                    '2.333': '2 1/3',
                    '2.5': '2 1/2',
                    '2.66': '2 2/3',
                    '2.667': '2 2/3',
                    '2.75': '2 3/4',
                    '3.25': '3 1/4',
                    '3.33': '3 1/3',
                    '3.333': '3 1/3',
                    '3.5': '3 1/2',
                    '3.66': '3 2/3',
                    '3.667': '3 2/3',
                    '3.75': '3 3/4',
                    '4.5': '4 1/2',
                    '5.5': '5 1/2',
                    '6.5': '6 1/2'
                  };
                  
                  const rounded = Math.round(decimal * 1000) / 1000; // Round to 3 decimal places
                  const fractionStr = fractions[rounded.toString()];
                  
                  if (fractionStr) {
                    return fractionStr;
                  }
                  
                  // Try to convert to mixed number for other values
                  const whole = Math.floor(decimal);
                  const remainder = decimal - whole;
                  
                  // Check common denominators
                  for (const den of [8, 4, 3, 2]) {
                    const numerator = Math.round(remainder * den);
                    if (Math.abs((numerator / den) - remainder) < 0.01) {
                      if (numerator === 0) {
                        return whole.toString();
                      } else if (whole === 0) {
                        return `${numerator}/${den}`;
                      } else {
                        return `${whole} ${numerator}/${den}`;
                      }
                    }
                  }
                  
                  // Fallback to decimal
                  return decimal.toString();
                }

                return (
                  <div
                    key={ingredient.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      isCompleted
                        ? 'bg-green-900 border-green-600 opacity-75'
                        : 'bg-gray-700 border-gray-600 hover:border-blue-500'
                    }`}
                    onClick={() => toggleIngredient(ingredient.id)}
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isCompleted
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-400'
                        }`}
                      >
                        {isCompleted && '✓'}
                      </div>
                      <div>
                        <span className={`text-lg ${isCompleted ? 'line-through text-gray-400' : 'text-white'}`}>
                          {formatDisplayFraction(scaledAmount)} {ingredient.unit} {ingredient.name}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleIngredient(ingredient.id);
                      }}
                      className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                        isCompleted
                          ? 'bg-gray-600 text-gray-300 hover:bg-gray-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isCompleted ? 'Undo' : 'Done'}
                    </button>
                  </div>
                );
              })}
            </div>

            {isCompleted && (
              <div className="mt-6 p-6 bg-green-900 border border-green-600 rounded-lg text-center">
                <h4 className="text-xl font-bold text-green-300 mb-2">🎉 Drink Complete!</h4>
                <p className="text-green-400">Enjoy your {currentRecipe?.name}!</p>
                <button
                  onClick={resetProgress}
                  className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Make Another
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MenusView() {
  const user = db.useUser();
  const [showForm, setShowForm] = useState(false);
  const [showMenuView, setShowMenuView] = useState<string | null>(null);
  const [newMenu, setNewMenu] = useState({ name: '', description: '' });
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const { data: menusData, isLoading: menusLoading } = db.useQuery({
    menus: {
      $: { 
        where: { 'owner.id': user.id },
        order: { createdAt: 'desc' }
      },
      items: {
        $: { order: { order: 'asc' } },
        recipe: {
          ingredients: {
            $: { order: { order: 'asc' } }
          }
        }
      }
    },
  });

  const { data: recipesData } = db.useQuery({
    recipes: {
      $: { 
        where: { 'owner.id': user.id },
        order: { name: 'asc' }
      },
      ingredients: {
        $: { order: { order: 'asc' } }
      }
    },
  });

  const createMenu = async () => {
    if (!newMenu.name.trim()) return;

    const menuId = id();
    const now = Date.now();
    
    const menuUrl = `${window.location.origin}/menu/${menuId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(menuUrl, {
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      margin: 2,
      width: 256,
    });

    await db.transact([
      db.tx.menus[menuId]
        .update({
          name: newMenu.name,
          description: newMenu.description,
          isActive: true,
          qrCode: qrCodeDataUrl,
          createdAt: now,
        })
        .link({ owner: user.id }),
      ...selectedRecipes.map((recipeId, index) => 
        db.tx.menuItems[id()]
          .update({ order: index })
          .link({ menu: menuId, recipe: recipeId })
      )
    ]);

    setNewMenu({ name: '', description: '' });
    setSelectedRecipes([]);
    setShowForm(false);
  };

  const deleteMenu = (menuId: string) => {
    db.transact(db.tx.menus[menuId].delete());
  };

  const toggleRecipe = (recipeId: string) => {
    if (selectedRecipes.includes(recipeId)) {
      setSelectedRecipes(selectedRecipes.filter(id => id !== recipeId));
    } else {
      setSelectedRecipes([...selectedRecipes, recipeId]);
    }
  };

  const generateNewQR = async (menu: MenuWithItems) => {
    const menuUrl = `${window.location.origin}/menu/${menu.id}`;
    const qrCodeDataUrl = await QRCode.toDataURL(menuUrl, {
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      margin: 2,
      width: 256,
    });
    setQrCodeUrl(qrCodeDataUrl);
  };

  if (menusLoading) {
    return <div className="p-8 text-center text-gray-400">Loading menus...</div>;
  }

  if (showMenuView) {
    const menu = menusData?.menus?.find((m: MenuWithItems) => m.id === showMenuView);
    
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-white">Menu: {menu?.name}</h2>
          <button
            onClick={() => setShowMenuView(null)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Menus
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            {menu?.description && (
              <p className="text-gray-400 text-lg">{menu.description}</p>
            )}
            
            <div className="space-y-4">
              {menu?.items?.map((item: any) => (
                <div key={item.id} className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-white mb-2">{item.recipe.name}</h3>
                  {item.recipe.description && (
                    <p className="text-gray-400 mb-4">{item.recipe.description}</p>
                  )}
                  <div className="space-y-1">
                    <h4 className="font-medium text-gray-300 text-sm">Ingredients:</h4>
                    {item.recipe.ingredients?.map((ingredient: any) => (
                      <div key={ingredient.id} className="text-gray-400 text-sm">
                        {formatDisplayFraction(ingredient.amount)} {ingredient.unit} {ingredient.name}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 h-fit">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-4">QR Code for Guests</h3>
              <div className="bg-white p-4 rounded-lg inline-block mb-4">
                <img 
                  src={qrCodeUrl || menu?.qrCode} 
                  alt="Menu QR Code" 
                  className="w-48 h-48"
                />
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Guests can scan this QR code to view your menu
              </p>
              <button
                onClick={() => generateNewQR(menu)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Refresh QR Code
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white">My Menus</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Menu
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">New Menu</h3>
            
            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Menu name"
                value={newMenu.name}
                onChange={(e) => setNewMenu({ ...newMenu, name: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
              />
              <textarea
                placeholder="Description (optional)"
                value={newMenu.description}
                onChange={(e) => setNewMenu({ ...newMenu, description: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 h-24"
              />
            </div>

            <h4 className="text-lg font-semibold text-white mb-4">Select Recipes</h4>
            <div className="grid gap-3 md:grid-cols-2 mb-6">
              {recipesData?.recipes?.map((recipe: RecipeWithIngredients) => (
                <div
                  key={recipe.id}
                  onClick={() => toggleRecipe(recipe.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedRecipes.includes(recipe.id)
                      ? 'bg-blue-900 border-blue-600'
                      : 'bg-gray-700 border-gray-600 hover:border-blue-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-white">{recipe.name}</h5>
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedRecipes.includes(recipe.id)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-400'
                      }`}
                    >
                      {selectedRecipes.includes(recipe.id) && '✓'}
                    </div>
                  </div>
                  {recipe.description && (
                    <p className="text-gray-400 text-sm mt-1">{recipe.description}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={createMenu}
                disabled={!newMenu.name.trim() || selectedRecipes.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                Create Menu
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {menusData?.menus?.map((menu: MenuWithItems) => (
          <div key={menu.id} className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-white">{menu.name}</h3>
              <button
                onClick={() => deleteMenu(menu.id)}
                className="text-red-400 hover:text-red-300"
              >
                ×
              </button>
            </div>
            
            {menu.description && (
              <p className="text-gray-400 mb-4">{menu.description}</p>
            )}
            
            <div className="space-y-2 mb-4">
              <p className="text-gray-300 font-medium">
                {menu.items?.length || 0} recipes
              </p>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    menu.isActive ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-gray-400 text-sm">
                  {menu.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowMenuView(menu.id)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View & Share
            </button>
          </div>
        ))}
      </div>

      {menusData?.menus?.length === 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400 text-lg">No menus created yet. Create your first menu to share with guests!</p>
        </div>
      )}
    </div>
  );
}

function Main() {
  const [currentView, setCurrentView] = useState('recipes');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  const handleSelectRecipe = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setCurrentView('make');
  };

  const handleBackToRecipes = () => {
    setSelectedRecipeId(null);
    setCurrentView('recipes');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation currentView={currentView} setCurrentView={setCurrentView} />
      
      {currentView === 'recipes' && <RecipesView onSelectRecipe={handleSelectRecipe} />}
      {currentView === 'make' && <MakeDrinkView selectedRecipeId={selectedRecipeId} onBackToRecipes={handleBackToRecipes} />}
      {currentView === 'menus' && <MenusView />}
    </div>
  );
}

function App() {
  return (
    <div>
      <db.SignedIn>
        <Main />
      </db.SignedIn>
      <db.SignedOut>
        <Login />
      </db.SignedOut>
    </div>
  );
}

export default App;
