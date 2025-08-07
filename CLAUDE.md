# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HIFLD (Homeland Infrastructure Foundation-Level Data) search and mapping tool for discovering and visualizing critical infrastructure layers. The application allows users to search ~200 infrastructure layers, visualize them on an interactive map, and export configurations for later use in ArcGIS Online.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Type checking (no test suite exists)
npx tsc --noEmit

# Deploy to Vercel (auto-deploys on git push to main)
vercel
```

## Critical Workflow Requirements

**IMPORTANT**: User requires all updates to be committed to GitHub AND deployed to Vercel. After making changes:
1. Commit and push to GitHub
2. Vercel auto-deploys from main branch
3. Deployment takes 2-3 minutes

## Environment Configuration

Required `.env.local` variables:
```
# ArcGIS API credentials
NEXT_PUBLIC_ARCGIS_API_KEY=your_api_key_here
ARCGIS_CLIENT_ID=your_client_id_here
ARCGIS_CLIENT_SECRET=your_client_secret_here

# App access password (defaults to 'hifld2024')
APP_PASSWORD=your_secure_password_here
```

## Architecture

### Technology Stack
- **Framework**: Next.js 14.0.4 (App Router)
- **UI**: React 18.2 with TypeScript
- **Styling**: Tailwind CSS 3.3
- **Mapping**: @arcgis/core 4.28
- **Data Processing**: PapaParse for CSV parsing
- **HTTP Client**: Axios for API requests

### Core Data Flow

1. **Layer Discovery**: CSV file (`/public/HIFLD_Open_Crosswalk_Geoplatform.csv`) contains ~200 infrastructure layers with metadata
2. **Search**: User searches layers → filtered by availability of `Open REST Service` URL
3. **Map Addition**: Selected layers added as ArcGIS FeatureLayers to the map
4. **Interaction**: Popups show raw feature data, widgets provide map controls
5. **Export**: Two paths - JSON download or direct save to ArcGIS Online

### Component Architecture

```
page.tsx (orchestrator)
    ├── PasswordProtection.tsx (wrapper)
    ├── SearchBar.tsx → lib/search.ts
    ├── SearchResults.tsx
    ├── MapView.tsx (forwardRef)
    │   ├── Dynamic ArcGIS module imports
    │   ├── Popup templates (raw data display)
    │   └── Widgets (BasemapGallery, Legend, Search, Home)
    ├── ExportMapButton.tsx (JSON download)
    └── SaveMapButton.tsx (ArcGIS Online save)
```

### State Management
- All state managed in `page.tsx` using React hooks
- `selectedLayers`: Array of active layers on map
- `mapViewRef`: Reference to ArcGIS view for export/save operations
- Components communicate via props and callbacks

### Authentication Flow
1. `PasswordProtection.tsx` checks for `hifld-auth` cookie
2. If missing, shows password form
3. On success, sets HTTP-only cookie (7-day expiration)
4. `middleware.ts` protects `/api/*` routes using same cookie

## Recent Architecture Changes

### Popup System Evolution
- Started with field-specific popups (showing select fields)
- Evolved to category-based system (11 categories, rich formatting)
- Current: Raw data display showing ALL fields unfiltered for debugging

### Export Functionality
- Creates Web Map JSON compatible with ArcGIS Online
- Note: Direct upload via "New item → Your device" doesn't work
- Users should use ArcGIS Online Assistant or Python API instead

### Widget Configuration
- **BasemapGallery**: Top-left, expandable
- **Legend**: Bottom-right, expandable, card style
- **Search**: Top-right corner
- **Home**: Top-left below BasemapGallery

## Data Schema (CSV)

Critical columns for functionality:
- `Layer Name`: Primary search field
- `Open REST Service`: Map service URL (null = no map available)
- `Agency`: Data provider for attribution
- `Status`: Active/Migrated
- `DUA Required`: Data Use Agreement flag
- `GII Access Required`: Restricted access flag

## Known Issues & Workarounds

### Popup Data Display
Some layers (e.g., State Capitols, Prison Boundaries) show minimal data. Current popup system shows raw attributes to help debug why certain layers have limited fields.

### Export to ArcGIS Online
The exported JSON requires manual import via:
- ArcGIS Online Assistant (ago-assistant.esri.com)
- ArcGIS Python API in notebooks
- Custom OAuth application

### Layer Loading
Some layers may fail due to:
- CORS restrictions
- Authentication requirements (DUA/GII)
- Service availability

## Deployment

- GitHub repository: `https://github.com/franzenjb/hifld-search`
- Vercel auto-deploys on push to main branch
- Environment variables must be set in Vercel dashboard
- Deployment typically completes in 2-3 minutes
- Region: IAD1 (US East)

## User Requirements

**IMPORTANT**: Always provide complete file replacements, never partial edits. This is a strict requirement from the user.