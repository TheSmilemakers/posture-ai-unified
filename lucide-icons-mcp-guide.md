# Lucide Icons MCP Quick Reference

## Overview
Lucide Icons MCP provides access to 1,500+ icons directly in Claude Code for easy icon discovery and implementation.

## Available Tools (after restart)
- `mcp__lucide_icons__search_icons` - Search icons by name or category
- `mcp__lucide_icons__get_icon_usage_examples` - Get React/JSX code examples
- `mcp__lucide_icons__list_all_categories` - Browse all icon categories

## Example Usage in Your Posture AI App

### 1. Search for Medical/Health Icons
```
Search for icons related to: spine, posture, medical, health, body
```

### 2. Get Implementation Code
Once you find an icon, get the React/JSX code:
```
Get usage examples for: activity, heart, user-check
```

### 3. Icon Categories
Browse available categories:
- Medical & Health
- User & People  
- Interface & UI
- Arrows & Navigation
- And many more...

## Implementation in Your App

### Current Icons Used (Emojis to Replace)
Your app currently uses emojis that could be replaced with professional SVG icons:
- 🏥 → medical icon (e.g., `Hospital`, `Stethoscope`)
- 👤 → user icon (e.g., `User`, `UserCircle`)
- 📸 → camera icon (e.g., `Camera`, `Image`)
- 💾 → save icon (e.g., `Save`, `Download`)
- 📊 → chart icon (e.g., `BarChart`, `Activity`)
- 🏃 → exercise icon (e.g., `Activity`, `Dumbbell`)

### Example Implementation
```javascript
// Import Lucide icons
import { Activity, Camera, Save, User } from 'lucide-react';

// Use in your component
<Activity className="w-5 h-5 text-blue-500" />
<Camera className="w-6 h-6" />
```

### For Vanilla JavaScript
```html
<!-- Include Lucide via CDN -->
<script src="https://unpkg.com/lucide@latest"></script>

<!-- Use icons -->
<i data-lucide="activity"></i>
<i data-lucide="camera"></i>

<script>
  // Initialize icons
  lucide.createIcons();
</script>
```

## Benefits for Posture AI
1. **Professional Appearance**: Replace emojis with clean SVG icons
2. **Consistency**: Uniform icon style throughout the app
3. **Scalability**: SVG icons scale perfectly at any size
4. **Performance**: Smaller than emoji fonts, better rendering
5. **Accessibility**: Better screen reader support

## Quick Icon Suggestions for Posture AI
- **Navigation**: `Home`, `ArrowLeft`, `ArrowRight`
- **Analysis**: `Scan`, `Activity`, `TrendingUp`
- **Body Parts**: `User`, `Users`, `Heart`
- **Actions**: `Camera`, `Upload`, `Download`, `Save`
- **Settings**: `Settings`, `Moon`, `Sun`, `Monitor`
- **Medical**: `Stethoscope`, `FileText`, `ClipboardList`
- **Exercise**: `Dumbbell`, `Activity`, `Target`

## Note
Remember to restart Claude Code after adding this MCP server to access the icon tools!