#!/usr/bin/env python3
"""
HIFLD Interactive Search Tool
Run this script directly in a Jupyter environment or terminal with display support
"""

import pandas as pd
from arcgis.gis import GIS
import ipywidgets as widgets
from IPython.display import display, clear_output

print("=== HIFLD Interactive Search Tool ===")
print("Loading data...")

# Load HIFLD data
df = pd.read_csv('HIFLD_Open_Crosswalk_Geoplatform.csv')
print(f"Loaded {len(df)} infrastructure layers")

# Connect to ArcGIS
print("Connecting to ArcGIS...")
gis = GIS()  # Will prompt for login if needed
print("Connected!\n")

# Create widgets
search_input = widgets.Text(
    placeholder='Enter search term (e.g., fire, hospital, school)',
    description='Search:',
    style={'description_width': 'initial'},
    layout=widgets.Layout(width='400px')
)

search_button = widgets.Button(
    description='Search',
    button_style='primary',
    icon='search'
)

clear_button = widgets.Button(
    description='Clear Map',
    button_style='warning',
    icon='trash'
)

save_button = widgets.Button(
    description='Save Map',
    button_style='success',
    icon='save'
)

# Output areas
output_area = widgets.Output()
map_area = widgets.Output()
save_area = widgets.Output()

# Global state
current_map = None
added_layers = []

def search_layers(query):
    """Search for layers matching the query"""
    query = query.lower()
    mask = df['Layer Name'].str.lower().str.contains(query, na=False)
    return df[mask]

def on_search_click(b):
    """Handle search button click"""
    with output_area:
        clear_output()
        
        query = search_input.value.strip()
        if not query:
            print("⚠️ Please enter a search term")
            return
        
        results = search_layers(query)
        
        if len(results) == 0:
            print(f"❌ No layers found matching '{query}'")
            return
        
        print(f"🔍 Found {len(results)} layers matching '{query}':\n")
        
        # Show up to 10 results with Add buttons
        for i, (_, row) in enumerate(results.head(10).iterrows()):
            has_map = pd.notna(row['Open REST Service'])
            
            # Create button for each result
            btn = widgets.Button(
                description=f"Add #{i+1}",
                button_style='success' if has_map else 'danger',
                disabled=not has_map,
                layout=widgets.Layout(width='80px')
            )
            
            # Create click handler with closure
            def make_handler(layer_row):
                def handler(b):
                    add_layer_to_map(layer_row)
                return handler
            
            btn.on_click(make_handler(row))
            
            # Display layer info with button
            print(f"{i+1}. {row['Layer Name']}")
            print(f"   Agency: {row['Agency']}")
            print(f"   Status: {row.get('Status', 'Unknown')}")
            
            if has_map:
                print(f"   ✅ Map service available")
            else:
                print(f"   ❌ No map service")
            
            display(btn)
            print()

def add_layer_to_map(row):
    """Add selected layer to the map"""
    global current_map, added_layers
    
    with map_area:
        clear_output()
        
        layer_name = row['Layer Name']
        service_url = row['Open REST Service']
        
        # Create map if it doesn't exist
        if current_map is None:
            print("🗺️ Creating new map...")
            current_map = gis.map('USA')
            current_map.zoom = 4
        
        print(f"➕ Adding: {layer_name}")
        print(f"🔗 URL: {service_url}")
        
        try:
            # Add the layer
            current_map.add_layer({'url': service_url})
            added_layers.append(layer_name)
            
            print(f"✅ Layer added successfully!")
            print(f"\n📊 Active layers on map ({len(added_layers)}):")
            for i, name in enumerate(added_layers, 1):
                print(f"   {i}. {name}")
            
        except Exception as e:
            print(f"❌ Error adding layer: {e}")
            
            # Try alternative approach for MapServer layers
            if '/MapServer/' in service_url and service_url[-1].isdigit():
                try:
                    print("🔄 Trying MapServer approach...")
                    base_url = service_url.split('/MapServer/')[0] + '/MapServer'
                    layer_id = int(service_url.split('/')[-1])
                    
                    # Try with full service
                    current_map.add_layer({'url': base_url})
                    
                    if layer_name not in added_layers:
                        added_layers.append(layer_name)
                    
                    print(f"✅ Added using MapServer base URL!")
                    print(f"   (Showing all layers from service, sublayer {layer_id} included)")
                    
                except Exception as e2:
                    print(f"❌ Alternative method also failed: {e2}")
        
        # Display the map
        print("\n📍 Map display:")
        display(current_map)

def on_clear_click(b):
    """Clear the current map"""
    global current_map, added_layers
    
    with map_area:
        clear_output()
        current_map = None
        added_layers = []
        print("🗑️ Map cleared. Search for layers to create a new map.")

def on_save_click(b):
    """Show save options for the map"""
    global added_layers
    
    with save_area:
        clear_output()
        
        if not added_layers:
            print("⚠️ No layers to save. Add some layers first!")
            return
        
        # Generate suggested metadata
        layer_keywords = [layer.split()[0] for layer in added_layers[:3]]
        
        suggested_title = f"HIFLD Infrastructure Map - {', '.join(layer_keywords[:2])}"
        suggested_summary = f"Map showing {len(added_layers)} HIFLD infrastructure layers including: {', '.join(added_layers[:3])}"
        if len(added_layers) > 3:
            suggested_summary += f" and {len(added_layers)-3} more"
        
        suggested_tags = ['HIFLD', 'infrastructure', 'critical infrastructure'] + layer_keywords
        
        print("💾 Save Map Configuration")
        print("=" * 50)
        print("\nSuggested metadata:\n")
        
        # Create input widgets for metadata
        title_input = widgets.Text(
            value=suggested_title,
            description='Title:',
            style={'description_width': 'initial'},
            layout=widgets.Layout(width='600px')
        )
        
        summary_input = widgets.Textarea(
            value=suggested_summary,
            description='Summary:',
            style={'description_width': 'initial'},
            layout=widgets.Layout(width='600px', height='80px')
        )
        
        tags_input = widgets.Text(
            value=', '.join(suggested_tags),
            description='Tags:',
            style={'description_width': 'initial'},
            layout=widgets.Layout(width='600px')
        )
        
        final_save_button = widgets.Button(
            description='Save to ArcGIS Online',
            button_style='success',
            icon='cloud-upload'
        )
        
        def save_map(b):
            print(f"\n💾 Saving map...")
            print(f"Title: {title_input.value}")
            print(f"Summary: {summary_input.value}")
            print(f"Tags: {tags_input.value}")
            
            # In production, this would save to ArcGIS Online
            # webmap = WebMap()
            # for layer_url in layer_urls:
            #     webmap.add_layer({'url': layer_url})
            # webmap.save(title=title_input.value, summary=summary_input.value, tags=tags_input.value.split(', '))
            
            print("\n✅ Map configuration saved!")
            print("(In production, this would save to your ArcGIS Online account)")
        
        final_save_button.on_click(save_map)
        
        display(title_input)
        display(summary_input)
        display(tags_input)
        display(final_save_button)

# Connect button handlers
search_button.on_click(on_search_click)
clear_button.on_click(on_clear_click)
save_button.on_click(on_save_click)

# Also search on Enter key
search_input.on_submit(lambda x: on_search_click(None))

# Display the interface
print("🎯 Ready to search!\n")

# Search box
display(widgets.HBox([search_input, search_button]))

# Control buttons
display(widgets.HBox([clear_button, save_button]))

# Output areas
display(output_area)
display(map_area)
display(save_area)

# Instructions
print("\n📝 Instructions:")
print("1. Enter a search term (e.g., 'fire', 'hospital', 'school')")
print("2. Click Search or press Enter")
print("3. Click 'Add' buttons to add layers to the map")
print("4. Use 'Clear Map' to start over")
print("5. Use 'Save Map' to save your configuration")