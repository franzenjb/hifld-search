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

## Tech Stack & Architecture

### Web Application (Primary Implementation)
- **Framework**: Next.js 14 (React 18, TypeScript)
- **Styling**: Tailwind CSS with custom components
- **Mapping**: ArcGIS JavaScript API 4.28
- **Data Processing**: Papa Parse for CSV handling
- **Build System**: Next.js with ESLint, PostCSS
- **Deployment**: Configured for Vercel

### Python/Jupyter Implementation (Legacy/Research)
- **Runtime**: ArcGIS Online Jupyter Notebooks
- **Libraries**: ArcGIS Python API, pandas, ipywidgets
- **Purpose**: Proof of concept and research environments

## Key Files & Project Structure

### Web Application Structure
```
src/
├── app/
│   ├── api/auth/route.ts           # ArcGIS OAuth authentication
│   ├── layout.tsx                  # Main app layout
│   ├── page.tsx                    # Main application page
│   └── globals.css                 # Global styles
├── components/
│   ├── MapView.tsx                 # ArcGIS map component
│   ├── SearchBar.tsx               # Search input interface
│   └── SearchResults.tsx           # Results display component
└── lib/
    └── search.ts                   # Search logic and data types
```

### Configuration Files
- `package.json`: Dependencies and build scripts
- `tsconfig.json`: TypeScript configuration with path mapping
- `next.config.js`: Next.js config with security headers
- `tailwind.config.js`: Tailwind CSS configuration
- `postcss.config.js`: PostCSS configuration
- `.eslintrc.json`: ESLint configuration

### Data & Python Files
- `HIFLD_Open_Crosswalk_Geoplatform.csv`: Primary dataset (also in /public/)
- `hifld_search_poc.py`: Interactive Python implementation
- `simple_hifld_search.py`: Minimal Python implementation
- `enhanced_search.py`: Advanced search widgets
- `hifld_*.py`: Various specialized implementations

## Data Schema

The CSV contains these critical columns:
- `Status`: Migration status (Active/Migrated)
- `Layer Name`: Primary search field
- `Agency`: Data provider organization
- `Open REST Service`: Map service URL
- `DUA Required`: Data Use Agreement flag (Yes/No)
- `GII Access Required`: Restricted access flag (Yes/No)
- `External Landing Page`: Reference URLs
- `Old/New ID`: Tracking identifiers

## Development Setup

### Web Application Setup
```bash
# Install dependencies
npm install

# Environment variables (.env.local)
NEXT_PUBLIC_ARCGIS_API_KEY=your_api_key_here
ARCGIS_CLIENT_ID=your_client_id_here
ARCGIS_CLIENT_SECRET=your_client_secret_here

# Development server
npm run dev

# Build for production
npm run build

# Linting
npm run lint
```

### Python Dependencies
```bash
pip install arcgis pandas numpy ipywidgets
pip install fuzzywuzzy python-Levenshtein  # Optional for enhanced search
```

## Build Scripts & Commands

- `npm run dev`: Start development server (localhost:3000)
- `npm run build`: Create production build
- `npm start`: Run production server
- `npm run lint`: Run ESLint checks

## Core Functionality

### Web Application Components

#### Search Implementation (`src/lib/search.ts`)
```typescript
export interface Layer {
  name: string
  agency: string
  serviceUrl: string | null
  status: string
  duaRequired: boolean
  giiRequired: boolean
}

export async function searchLayers(query: string): Promise<Layer[]>
```

#### Map Component (`src/components/MapView.tsx`)
- Uses ArcGIS JavaScript API with dynamic imports
- Manages layer addition/removal
- Centered on USA with configurable basemap
- Error handling for invalid service URLs
- Dynamically loads ArcGIS CSS to prevent blocking

#### Search Interface (`src/components/SearchBar.tsx`)
- Simple text input with search icon
- Form submission handling
- Responsive design

### Python Implementation Pattern
```python
# Core search pattern
def search_layers(search_term):
    search_term = search_term.lower()
    results = df[df['Layer Name'].str.lower().str.contains(search_term, na=False)]
    return results

# Map display
gis = GIS()
map_widget = gis.map()
map_widget.add_layer({'url': layer_url})
```

## Architecture Considerations

### Web Application Design
1. **Client-Side Rendering**: Uses 'use client' for interactive components
2. **Data Loading**: CSV loaded via fetch from /public/ directory
3. **State Management**: React hooks for search, results, and selected layers
4. **Error Handling**: Try-catch blocks with user feedback
5. **Performance**: Data caching and lazy loading of ArcGIS modules

### Security Features
- Content Security headers in next.config.js
- Environment variable protection (NEXT_PUBLIC_ prefix for client-side)
- API key handling through environment variables
- OAuth 2.0 client credentials flow for ArcGIS authentication

### Python Implementation Features
- Multiple variants for different use cases:
  - `hifld_search_poc.py`: Full interactive widgets
  - `simple_hifld_search.py`: Minimal implementation
  - `enhanced_search.py`: Advanced UI with save functionality
  - Terminal and standalone versions available

## Development Workflow

### Adding New Features
1. **Web App**: Add components to `src/components/`, update types in `src/lib/search.ts`
2. **Python**: Maintain compatibility across multiple implementation files
3. **Data**: CSV updates require both `/public/` and root directory updates

### Testing Approaches
```bash
# Web application
npm run build  # Ensures TypeScript compilation
npm run lint   # Code quality checks

# Common search terms to test
['fire', 'hospital', 'school', 'power', 'water', 'emergency']
```

### Deployment
- **Vercel**: Configured with environment variables
- **Environment Variables**: Set ARCGIS_* variables in deployment platform
- **Static Assets**: CSV file served from /public/ directory

## Common Issues & Solutions

1. **ArcGIS Authentication**: Check API key configuration and service URLs
2. **Layer Loading**: Some layers require GII access or DUA agreements
3. **Performance**: Large datasets may need pagination or filtering
4. **CORS Issues**: ArcGIS services may have domain restrictions
5. **Infinite Loading**: Ensure ArcGIS CSS is loaded dynamically, not via @import

## Code Standards

### TypeScript/React
- Strict TypeScript configuration
- Functional components with hooks
- Error boundaries for map components
- Responsive design with Tailwind

### Python
- Pandas-based data processing
- Error handling for missing service URLs
- Widget-based interactive interfaces
- Support for both Jupyter and standalone execution

## Important Implementation Notes

1. **Complete Code Replacements**: Always provide 100% complete code files, never partial edits
2. **Dual Platform Support**: Maintain compatibility between web and Python versions  
3. **Data Access**: Check DUA and GII requirements before displaying layers
4. **Error Handling**: Gracefully handle missing service URLs and authentication failures
5. **Environment Configuration**: Ensure proper API key and credential setup for both platforms
6. **Performance**: CSV data is cached after first load to improve search performance
7. **Map Initialization**: ArcGIS modules are dynamically imported to reduce initial bundle size

When giving me code edits - NEVER give me partial to edit into the code - Always give me 100% for complete delete and paste new