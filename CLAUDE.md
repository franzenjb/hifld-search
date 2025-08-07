# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HIFLD (Homeland Infrastructure Foundation-Level Data) search and mapping tool for discovering and visualizing critical infrastructure layers. The application allows users to search ~300 infrastructure layers, visualize them on an interactive map, and export configurations for use in ArcGIS Online.

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

**File Editing Rule**: Always provide complete file replacements, never partial edits. This is a strict requirement from the user.

## Project Structure

```
/
├── src/                    # Next.js application source
│   ├── app/               # App router pages and API routes
│   ├── components/        # React components
│   ├── lib/              # Utility functions
│   └── middleware.ts     # Request middleware
├── public/                # Static assets
│   └── HIFLD_Open_Crosswalk_Geoplatform.csv  # Layer metadata
├── docs/                  # Documentation
├── python-prototypes/     # Python proof-of-concept scripts
└── prototypes/           # HTML/JS prototypes
```

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
- **Deployment**: Vercel (auto-deploy on push)

### Core Data Flow

1. **Layer Discovery**: CSV file (`/public/HIFLD_Open_Crosswalk_Geoplatform.csv`) contains infrastructure layer metadata
2. **Search**: User searches → `searchLayers()` filters by layer name and service URL availability
3. **Map Display**: Selected layers → ArcGIS FeatureLayers → Added to MapView
4. **Interaction**: Click features → Popup shows raw attribute data
5. **Export Options**:
   - **Export to ArcGIS**: Downloads Web Map JSON for manual import
   - **Save to ArcGIS**: Direct save using ArcGIS authentication

### Component Architecture

```
app/page.tsx (main orchestrator)
    ├── PasswordProtection.tsx (authentication wrapper)
    ├── SearchBar.tsx → lib/search.ts → CSV parsing
    ├── SearchResults.tsx (displays filtered layers)
    ├── MapView.tsx (forwardRef to expose view)
    │   ├── Dynamic ArcGIS imports (performance)
    │   ├── Raw data popups (all fields shown)
    │   └── Widgets:
    │       ├── BasemapGallery (top-left)
    │       ├── Legend (bottom-right)
    │       ├── Search (top-right)
    │       └── Home (top-left)
    ├── ExportMapButton.tsx (Web Map JSON export)
    └── SaveMapButton.tsx (ArcGIS Online integration)
```

### State Management
- All state in `page.tsx` using React hooks
- Key state: `selectedLayers`, `searchResults`, `mapViewRef`
- Props/callbacks for component communication
- No external state management library

### Authentication & Security
1. **App Access**: Password protection via `PasswordProtection.tsx`
   - HTTP-only cookie: `hifld-auth=authenticated`
   - 7-day expiration
   - Middleware validates API routes
2. **ArcGIS Auth**: OAuth for SaveMapButton functionality
   - Immediate mode authentication
   - Token stored in ArcGIS IdentityManager

### Popup System
- **Current Design**: Raw data table showing ALL fields
- **Purpose**: Debug layer data availability issues
- **Format**: Monospace font, color-coded by field type
- **No filtering**: Shows empty values, system fields, everything

### Export/Import Workflow
**Export creates Web Map JSON but standard ArcGIS import doesn't work**
- Use ArcGIS Online Assistant (ago-assistant.esri.com)
- Or ArcGIS Python API
- Direct file upload method fails

## Data Schema (CSV)

Critical columns:
- `Layer Name`: Primary search field
- `Open REST Service`: Map service URL (required for display)
- `Agency`: Data provider attribution
- `Status`: Active/Migrated indicator
- `DUA Required`: Data Use Agreement flag
- `GII Access Required`: Restricted access flag

## Known Issues & Current State

### Limited Popup Data
Many layers show minimal attributes (e.g., State Capitols only shows FTYPE: 830). This is a data issue, not a code issue.

### CORS & Authentication
Some layers fail to load due to:
- CORS restrictions on service endpoints
- DUA/GII authentication requirements
- Service downtime or migration

### Performance Considerations
- CSV loaded on every search (134KB)
- No layer caching implemented
- All widgets load on map init

## Recent Changes Log
- Removed geometry debug info from popups (coordinates, vertex counts)
- Simplified popup to show raw attribute table
- Fixed Legend widget visibility (moved to bottom-right)
- Fixed JSON export format for ArcGIS compatibility
- Added BasemapGallery widget

## Deployment

- **Repository**: https://github.com/franzenjb/hifld-search
- **Deployment**: Vercel (auto-deploy from main branch)
- **Region**: IAD1 (US East)
- **Build time**: ~30 seconds
- **Deploy time**: 2-3 minutes total