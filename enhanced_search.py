import ipywidgets as widgets
from IPython.display import display, clear_output
from datetime import datetime

# Create widgets
search_input = widgets.Text(
    value='',
    placeholder='Enter search term (e.g., fire, hospital, school)',
    description='Search:',
    style={'description_width': 'initial'}
)

search_button = widgets.Button(
    description='Search',
    button_style='primary'
)

clear_button = widgets.Button(
    description='Clear Map',
    button_style='warning'
)

save_button = widgets.Button(
    description='Save Map',
    button_style='success'
)

output_area = widgets.Output()
map_area = widgets.Output()
save_area = widgets.Output()

# Store search results and current map globally
current_results = None
current_map = None
added_layers = []

def search_layers(query):
    """Search for layers matching the query"""
    query = query.lower()
    mask = df['Layer Name'].str.contains(query, case=False, na=False) | df['Agency'].str.contains(query, case=False, na=False)
    return df[mask]

def on_search_click(b):
    """Handle search button click"""
    global current_results
    
    with output_area:
        clear_output()
        
        query = search_input.value
        if not query:
            print("Please enter a search term")
            return
        
        current_results = search_layers(query)
        
        if len(current_results) == 0:
            print(f"No layers found matching '{query}'")
            return
        
        print(f"Found {len(current_results)} layers matching '{query}':\n")
        
        # Create selection buttons for each result
        for idx, (_, row) in enumerate(current_results.iterrows()):
            # Check if layer has a valid REST service URL
            has_map = pd.notna(row['Open REST Service'])
            
            button = widgets.Button(
                description=f"Add #{idx+1}",
                button_style='success' if has_map else 'warning',
                disabled=not has_map
            )
            
            # Create click handler for this specific layer
            def make_handler(layer_row):
                def handler(b):
                    add_layer_to_map(layer_row)
                return handler
            
            button.on_click(make_handler(row))
            
            # Display layer info and button
            print(f"{idx+1}. {row['Layer Name']}")
            print(f"   Agency: {row['Agency']}")
            if has_map:
                print(f"   ✓ Map available")
            else:
                print(f"   ✗ No map service available")
            display(button)
            print()

def add_layer_to_map(layer_row):
    """Add selected layer to map"""
    global current_map, added_layers
    
    with map_area:
        clear_output()
        
        layer_name = layer_row['Layer Name']
        layer_url = layer_row['Open REST Service']
        
        # Create map if it doesn't exist
        if current_map is None:
            print("Creating new map...")
            current_map = gis.map('USA')
            current_map.zoom = 4
        
        print(f"Adding: {layer_name}")
        print(f"From: {layer_row['Agency']}")
        
        try:
            # Add layer using the correct method
            current_map.add_layer({'url': layer_url})
            added_layers.append(layer_name)
            
            print(f"✓ Layer added successfully!")
            print(f"\nCurrent layers on map: {len(added_layers)}")
            for i, layer in enumerate(added_layers, 1):
                print(f"  {i}. {layer}")
            print()
            
            # Display map
            display(current_map)
            
        except Exception as e:
            print(f"Error loading layer: {e}")
            print(f"URL attempted: {layer_url}")
            
            # Try alternative approach for specific layer types
            try:
                print("Trying alternative method...")
                # For MapServer layers, try adding as a feature layer
                if '/MapServer' in layer_url:
                    # Extract the base service URL
                    base_url = layer_url.split('/MapServer')[0] + '/MapServer'
                    current_map.add_layer({'url': base_url, 'sublayers': [int(layer_url.split('/')[-1])]})
                    print(f"✓ Layer added using MapServer method!")
                    if layer_name not in added_layers:
                        added_layers.append(layer_name)
                    display(current_map)
                else:
                    print("Alternative method not applicable for this layer type")
            except Exception as e2:
                print(f"Alternative method also failed: {e2}")

def on_clear_click(b):
    """Clear the current map"""
    global current_map, added_layers
    
    with map_area:
        clear_output()
        current_map = None
        added_layers = []
        print("Map cleared. Search for layers to create a new map.")

def on_save_click(b):
    """Show save options for the map"""
    global added_layers
    
    with save_area:
        clear_output()
        
        if not added_layers:
            print("No layers to save. Add some layers first!")
            return
        
        # Generate suggested metadata
        layer_keywords = [layer.split()[0] for layer in added_layers[:3]]
        
        suggested_title = f"HIFLD Infrastructure Map - {', '.join(layer_keywords[:2])}"
        suggested_summary = f"Map showing {len(added_layers)} HIFLD infrastructure layers including: {', '.join(added_layers[:3])}"
        if len(added_layers) > 3:
            suggested_summary += f" and {len(added_layers)-3} more"
        
        suggested_tags = ['HIFLD', 'infrastructure', 'critical infrastructure'] + layer_keywords
        
        print("=== Save Map ===\n")
        print("Suggested metadata (edit as needed):\n")
        
        # Create input widgets for metadata
        title_input = widgets.Text(
            value=suggested_title,
            description='Title:',
            style={'description_width': 'initial'},
            layout=widgets.Layout(width='80%')
        )
        
        summary_input = widgets.Textarea(
            value=suggested_summary,
            description='Summary:',
            style={'description_width': 'initial'},
            layout=widgets.Layout(width='80%', height='60px')
        )
        
        tags_input = widgets.Text(
            value=', '.join(suggested_tags),
            description='Tags:',
            style={'description_width': 'initial'},
            layout=widgets.Layout(width='80%')
        )
        
        final_save_button = widgets.Button(
            description='Save to ArcGIS Online',
            button_style='success'
        )
        
        def save_map(b):
            print(f"\nSaving map...")
            print(f"Title: {title_input.value}")
            print(f"Summary: {summary_input.value}")
            print(f"Tags: {tags_input.value}")
            print("\n✓ Map saved successfully!")
            print("(In production, this would save to your ArcGIS Online account)")
        
        final_save_button.on_click(save_map)
        
        display(title_input)
        display(summary_input)
        display(tags_input)
        display(final_save_button)

# Connect buttons to functions
search_button.on_click(on_search_click)
clear_button.on_click(on_clear_click)
save_button.on_click(on_save_click)

# Display the interface
print("=== HIFLD Infrastructure Layer Search ===\n")
print("Search for layers and add them to your map\n")

display(widgets.HBox([search_input, search_button]))
display(widgets.HBox([clear_button, save_button]))
display(output_area)
display(map_area)
display(save_area)