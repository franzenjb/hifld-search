# Super Simple HIFLD Search - ArcGIS Online Jupyter Notebook
# Minimal dependencies version

import pandas as pd
from arcgis.gis import GIS

# Load data
df = pd.read_csv('HIFLD_Open_Crosswalk_Geoplatform.csv')
gis = GIS()

# Simple search
def search_and_display(keyword):
    """Search layers and display first result on map"""
    # Search
    keyword = keyword.lower()
    matches = df[df['Layer Name'].str.lower().str.contains(keyword, na=False)]
    
    print(f"Found {len(matches)} layers containing '{keyword}':\n")
    
    # Show results
    for i, (_, row) in enumerate(matches.head(5).iterrows()):
        print(f"{i+1}. {row['Layer Name']} ({row['Agency']})")
    
    # Get first layer with valid URL
    for _, row in matches.iterrows():
        if pd.notna(row['Open REST Service']):
            url = row['Open REST Service']
            name = row['Layer Name']
            
            print(f"\nDisplaying: {name}")
            print(f"URL: {url}")
            
            # Create and display map
            try:
                map_widget = gis.map()
                map_widget.add_layer({'url': url})
                return map_widget
            except:
                print("Could not display this layer")
                continue
    
    print("No displayable layers found")
    return None

# Example usage - paste these in separate cells:
# map1 = search_and_display('fire')
# map2 = search_and_display('hospital')
# map3 = search_and_display('school')