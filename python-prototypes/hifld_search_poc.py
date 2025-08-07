# HIFLD Layer Search and Map - Proof of Concept
# For use in ArcGIS Online Jupyter Notebooks

import pandas as pd
from arcgis.gis import GIS
from arcgis.mapping import WebMap
from IPython.display import display
import ipywidgets as widgets

# 1. Load HIFLD data
print("Loading HIFLD layer data...")
df = pd.read_csv('HIFLD_Open_Crosswalk_Geoplatform.csv')
print(f"Loaded {len(df)} layers")

# 2. Connect to ArcGIS
print("\nConnecting to ArcGIS...")
gis = GIS()  # Will prompt for login if needed
print("Connected!")

# 3. Simple search function
def search_layers(search_term):
    """Simple keyword search in layer names"""
    search_term = search_term.lower()
    results = df[df['Layer Name'].str.lower().str.contains(search_term, na=False)]
    return results

# 4. Create interactive widgets
search_box = widgets.Text(
    placeholder='Search for layers (e.g., "fire", "hospital", "school")',
    description='Search:',
    style={'description_width': 'initial'}
)

results_output = widgets.Output()
map_output = widgets.Output()

# 5. Search handler
def on_search(change):
    with results_output:
        results_output.clear_output()
        
        search_term = search_box.value
        if not search_term:
            return
            
        print(f"Searching for: {search_term}")
        results = search_layers(search_term)
        
        if len(results) == 0:
            print("No layers found")
            return
            
        print(f"\nFound {len(results)} layers:\n")
        
        # Display results
        for idx, row in results.iterrows():
            print(f"{idx+1}. {row['Layer Name']}")
            print(f"   Agency: {row['Agency']}")
            print(f"   Status: {row['Status']}")
            if pd.notna(row['Open REST Service']):
                print(f"   Service URL: {row['Open REST Service']}")
            print()

# 6. Add layer to map function
def add_layer_to_map(layer_url, layer_name):
    """Add a layer to the map"""
    with map_output:
        map_output.clear_output()
        
        # Create new map
        webmap = WebMap()
        
        # Try to add the layer
        try:
            webmap.add_layer(layer_url)
            print(f"Added layer: {layer_name}")
            
            # Display the map
            map_widget = webmap.map_widget(mode="2D")
            display(map_widget)
            
        except Exception as e:
            print(f"Error adding layer: {e}")

# 7. Connect search handler
search_box.observe(on_search, names='value')

# 8. Display interface
print("\n=== HIFLD Layer Search Tool ===\n")
display(search_box)
display(results_output)
display(map_output)

# 9. Example usage
print("\nExample searches to try:")
print("- 'fire' - Find fire stations")
print("- 'hospital' - Find hospitals") 
print("- 'school' - Find schools")
print("- 'power' - Find power infrastructure")

# 10. Quick add layer example (uncomment to test)
# example_url = "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/Hospitals/FeatureServer"
# add_layer_to_map(example_url, "Hospitals")