# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HIFLD (Homeland Infrastructure Foundation-Level Data) search and mapping tool for discovering and visualizing critical infrastructure layers through natural language search in ArcGIS Online Jupyter Notebooks.

### Core Requirements
1. **Data Source**: `HIFLD_Open_Crosswalk_Geoplatform.csv` contains metadata for ~200 critical infrastructure map layers
2. **Search Functionality**: Natural language search that filters layers based on keywords
3. **Layer Information**: Display summaries of selected layers and their content
4. **Map Visualization**: Create maps with selected layers in Jupyter notebooks
5. **Map Export**: Save maps with auto-suggested titles, summaries, and ArcGIS-compliant tags

### Implementation Target
- ArcGIS Online Jupyter Notebook for proof of concept
- Python-based solution using ArcGIS Python API

## Key Files

- `HIFLD_Open_Crosswalk_Geoplatform.csv`: Main data source containing layer metadata including:
  - Layer Name
  - Agency
  - REST Service URLs (Open REST Service column)
  - Access requirements (DUA Required, GII Access Required columns)
  - Status (migration status from HIFLD Open to GII Portal)
- `hifld_search_poc.py`: Full-featured implementation with interactive widgets
- `simple_hifld_search.py`: Minimal implementation for quick searching
- `HIFLD_Search_POC.ipynb`: Jupyter notebook with example usage and demonstrations

## Architecture

### Current Implementation Structure

1. **Data Loading**: Pandas DataFrame from CSV
2. **Search Method**: Simple string contains search in Layer Name column
3. **Map Display**: ArcGIS Python API's WebMap or gis.map() widget
4. **Two Implementation Approaches**:
   - **Interactive Version** (`hifld_search_poc.py`): Uses ipywidgets for search box and dynamic results
   - **Simple Version** (`simple_hifld_search.py`): Direct function calls for searching and mapping

### Key Functions

```python
# Core search pattern used across implementations
def search_layers(search_term):
    search_term = search_term.lower()
    results = df[df['Layer Name'].str.lower().str.contains(search_term, na=False)]
    return results

# Map display pattern
map_widget = gis.map()  # or WebMap()
map_widget.add_layer({'url': layer_url})
```

### Data Schema Understanding
The CSV contains these critical columns for functionality:
- `Layer Name`: Primary search field
- `Agency`: Data provider organization
- `Open REST Service`: URL for map service (if available)
- `Status`: Migration status (Active/Migrated)
- `DUA Required`: Data Use Agreement requirement flag
- `GII Access Required`: Restricted access flag

## Development Setup

### Required Dependencies
```bash
pip install arcgis pandas numpy
pip install fuzzywuzzy python-Levenshtein  # For enhanced search (future)
pip install ipywidgets  # For interactive widgets
```

### ArcGIS Configuration
- Requires ArcGIS Online account credentials
- Use `arcgis.gis.GIS()` for authentication
- Check for GII (Geospatial Intelligence Infrastructure) access requirements

## Common Development Tasks

### Running the Search Tool
```python
# Interactive version
exec(open('hifld_search_poc.py').read())

# Simple version - direct function calls
from simple_hifld_search import search_and_display
map_widget = search_and_display('hospital')
```

### Testing Search Functionality
```python
# Test searches that should return results
test_keywords = ['fire', 'hospital', 'school', 'power', 'water']
for keyword in test_keywords:
    results = search_layers(keyword)
    print(f"{keyword}: {len(results)} results")
```

### Adding New Features
When extending functionality, maintain compatibility with both implementation styles:
- Interactive widgets version for full Jupyter experience
- Simple function version for programmatic use

## Architecture Considerations

### Search Implementation Enhancement Path
- Current: Simple string contains search
- Future considerations:
  - Fuzzy string matching with fuzzywuzzy
  - Multi-field search (Layer Name + Agency)
  - Category-based filtering
  - Relevance scoring

### Limitations
- ArcGIS Online Jupyter notebooks have limited Python library access
- Some layers require special access (GII/DUA)
- REST service URLs may not always be available
- Performance depends on ArcGIS service availability

### Map Creation Workflow
1. Load CSV data into pandas DataFrame
2. Search DataFrame for matching layers
3. Extract REST service URL from results
4. Create map widget (gis.map() or WebMap())
5. Add layer using REST URL
6. Display map in Jupyter cell output

## Important Implementation Notes

1. **Error Handling**: Always check for valid REST URLs before attempting to add layers
2. **Access Restrictions**: Some layers have DUA/GII requirements - check these columns
3. **Map Widget Types**: Use `gis.map()` for simple display, `WebMap()` for more control
4. **Search Case Sensitivity**: Always convert to lowercase for searching

When giving me code edits - NEVER give me partial to edit into the code - Always give me 100% for complete delete and paste new