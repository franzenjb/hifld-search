# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HIFLD (Homeland Infrastructure Foundation-Level Data) search and mapping tool for discovering and visualizing critical infrastructure layers. The project provides both a modern web application and Python-based Jupyter notebook implementations for searching and mapping critical infrastructure data.

### Core Requirements
1. **Data Source**: `HIFLD_Open_Crosswalk_Geoplatform.csv` contains metadata for ~200 critical infrastructure map layers
2. **Search Functionality**: Natural language search that filters layers based on keywords
3. **Layer Information**: Display summaries of selected layers and their content
4. **Map Visualization**: Interactive maps with selected layers using ArcGIS
5. **Dual Implementation**: Modern web application + Jupyter notebook versions

## Development Commands

### Web Application
```bash
# Install dependencies
npm install

# Development server (localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Deploy to Vercel
vercel
```

### Environment Setup
Create `.env.local` with:
```
NEXT_PUBLIC_ARCGIS_API_KEY=your_api_key_here
ARCGIS_CLIENT_ID=your_client_id_here
ARCGIS_CLIENT_SECRET=your_client_secret_here
```

### Python Dependencies
```bash
pip install arcgis pandas numpy ipywidgets
pip install fuzzywuzzy python-Levenshtein  # Optional for enhanced search
```

## Architecture Overview

### Web Application (Next.js 14 + TypeScript)
The application uses a client-side architecture with React components for interactivity:

- **Data Flow**: CSV data is fetched from `/public/` directory and cached after first load
- **Search**: Implemented in `src/lib/search.ts` with fuzzy matching on layer names
- **Map Rendering**: Uses dynamic imports of ArcGIS JavaScript API to reduce initial bundle size
- **State Management**: React hooks manage search results and selected layers
- **Error Boundaries**: Wrap map components to handle ArcGIS service failures gracefully

Key architectural decisions:
- All interactive components use 'use client' directive
- ArcGIS CSS is loaded dynamically to prevent render blocking
- OAuth 2.0 client credentials flow for ArcGIS authentication
- Security headers configured in `next.config.js`

### Python Implementations
Multiple variants serve different use cases:
- `hifld_search_poc.py`: Full interactive widgets for Jupyter
- `simple_hifld_search.py`: Minimal implementation
- `enhanced_search.py`: Advanced UI with save functionality
- `hifld_terminal.py`: Command-line interface
- `hifld_standalone.py`: Desktop application variant

## Data Schema

Critical CSV columns:
- `Layer Name`: Primary search field
- `Open REST Service`: Map service URL (may be null)
- `Status`: Active/Migrated
- `DUA Required`: Yes/No - Data Use Agreement requirement
- `GII Access Required`: Yes/No - Restricted access flag
- `Agency`: Data provider organization

## Common Development Tasks

### Adding a New Search Feature
1. Update the `Layer` interface in `src/lib/search.ts`
2. Modify the `searchLayers` function to include new logic
3. Update `SearchResults.tsx` to display new information
4. Maintain Python compatibility in relevant `.py` files

### Troubleshooting Layer Loading
1. Check if layer has valid `Open REST Service` URL
2. Verify DUA/GII access requirements
3. Look for CORS issues in browser console
4. Some layers may require additional authentication

### Testing Search Functionality
Common test queries: 'fire', 'hospital', 'school', 'power', 'water', 'emergency'

## Important Implementation Notes

1. **Complete Code Replacements**: Always provide 100% complete code files, never partial edits (per user instructions)
2. **Environment Variables**: Client-side variables must use `NEXT_PUBLIC_` prefix
3. **CSV Location**: Primary data file exists in both root and `/public/` directories
4. **Error Handling**: All ArcGIS operations should be wrapped in try-catch blocks
5. **Performance**: CSV data is cached after first load to improve search performance
6. **Deployment**: Vercel deployment requires setting environment variables in project settings