# Bar Buddy 🍸

A home bartender recipe manager built with Next.js, InstantDB, and Tailwind CSS. Create, manage, and share cocktail recipes with integrated menu generation and QR code sharing.

## Tech Stack

- **Next.js 15** - React framework with App Router
- **InstantDB** - Real-time database with React integration
- **Tailwind CSS** - Utility-first CSS framework
- **QR Code** - Menu sharing via QR codes

## Getting Started

### Prerequisites
- Node.js (v18+)
- InstantDB app setup (see instant-rules.md)

### Installation
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Variables
Create a `.env.local` file:
```
NEXT_PUBLIC_INSTANT_APP_ID=your_instant_app_id
```

## Architecture Overview

### Database Schema (`instant.schema.ts`)
- **recipes**: Core recipe entities with base64 image data
- **ingredients**: Ordered ingredient lists linked to recipes  
- **menus**: Collections of recipes for sharing
- **menuItems**: Junction table linking menus to recipes with ordering
- **$users**: InstantDB user management
- **$files**: File storage (legacy, replaced with base64 images)

### Key Components Structure

**Main App** (`app/page.tsx`):
```
Main()
├── Navigation() - Top nav with view switching
├── RecipesView() - Recipe management and creation
├── MakeDrinkView() - Step-by-step recipe following
└── MenusView() - Menu creation and QR sharing
```

### Navigation System
- Hash-based routing for browser back/forward support
- URLs: `/` (recipes), `/#menus` (menus), `/#make/{recipeId}` (making)
- State managed via `useState` with URL sync via `useEffect`

### Image Handling
- **Storage**: Base64 JPEG encoding stored in database
- **Compression**: Canvas API for 600x600px square images at 80% quality
- **Function**: `compressImageToBase64()` handles file processing

## Important Classes & Patterns

### Tailwind Design System
```css
/* Color Palette */
.bg-night        /* Primary dark background */
.bg-night-400    /* Lighter dark variant */
.bg-night-600    /* Card backgrounds */
.text-saffron    /* Primary gold accent */
.text-moonstone  /* Secondary blue accent */
.text-night-800  /* Muted text */
.border-saffron  /* Gold borders */
```

### Component Patterns
- **MenuItemCard**: Reusable recipe display component
  - Flexbox layout: `flex flex-col h-full`
  - Title centered under image
  - Description vertically centered in middle
  - Ingredients fixed at bottom with border separator
  - Compact padding: `p-3`

### InstantDB Query Patterns
```javascript
// Standard recipe query with ingredients
const { data, isLoading, error } = db.useQuery({
  recipes: {
    $: { where: { "owner.id": user.id }, order: { updatedAt: "desc" } },
    ingredients: { $: { order: { order: "asc" } } }
  }
});

// Menu with items and nested recipes
const { data } = db.useQuery({
  menus: {
    $: { where: { id: menuId } },
    items: {
      $: { order: { order: "asc" } },
      recipe: {
        ingredients: { $: { order: { order: "asc" } } }
      }
    }
  }
});
```

## Key Features

### Recipe Management
- Create/edit recipes with image upload
- Ingredient management with quantities and units
- Base64 image storage for simplicity
- Fraction display with Unicode characters

### Menu Creation  
- Add recipes to shareable menus
- Drag-and-drop reordering (order field)
- QR code generation for public sharing
- Public menu view at `/menu/[id]`

### Drink Making Interface
- Step-by-step ingredient checklist
- Progress tracking with completed ingredients
- Servings multiplier for scaling recipes
- No images in making view (focused on instructions)

## File Structure
```
app/
├── layout.tsx          # Root layout with metadata
├── page.tsx           # Main app with all views
├── globals.css        # Tailwind and custom styles
└── menu/[id]/page.tsx # Public menu sharing page

lib/
└── db.ts             # InstantDB configuration

instant.schema.ts     # Database schema definition
instant.perms.ts      # Permission rules
CLAUDE.md            # Development instructions
```

## Schema Management
```bash
# Push schema changes
npx instant-cli push schema -y

# Push permission changes  
npx instant-cli push perms -y
```

## Development Tips

### Adding New Features
1. Update schema in `instant.schema.ts` if needed
2. Push schema changes via CLI
3. Update permissions in `instant.perms.ts` 
4. Test database queries in components
5. Follow existing component patterns

### Common Issues
- **Permission errors**: Check `instant.perms.ts` and push updates
- **Type errors**: Ensure schema matches TypeScript interfaces
- **Build errors**: Check for `JSX.Element` → `React.JSX.Element` 
- **Navigation**: Hash-based routing requires `window.location.hash` updates

### Design Guidelines
- Use established color palette (night/saffron/moonstone)
- Follow compact card layout patterns  
- Center text unless specifically left-aligned
- Use flexbox for responsive layouts
- Maintain consistent spacing with Tailwind classes

## Public Menu Sharing
- Public routes don't require authentication
- Menu visibility controlled by `isActive` flag
- QR codes link to `/menu/[id]` public pages
- No user data exposed in public views

This architecture provides a solid foundation for cocktail recipe management with real-time sync, offline capabilities, and easy sharing mechanisms.