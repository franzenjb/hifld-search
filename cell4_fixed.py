# Import statements
import ipywidgets as widgets
from IPython.display import display, clear_output

# Create widgets
search_input = widgets.Text(placeholder='Enter search term', description='Search:')
search_button = widgets.Button(description='Search', button_style='primary')
clear_button = widgets.Button(description='Clear Map', button_style='warning')
save_button = widgets.Button(description='Save Map', button_style='success')
output_area = widgets.Output()
map_area = widgets.Output()
save_area = widgets.Output()

# Global variables
current_map = None
added_layers = []

# Search function
def on_search_click(b):
    with output_area:
        clear_output()
        query = search_input.value.lower()
        if not query:
            print("Enter a search term")
            return
        results = df[df['Layer Name'].str.lower().str.contains(query, na=False)]
        print(f"Found {len(results)} layers:\n")
        for i, (_, row) in enumerate(results.head(10).iterrows()):
            if pd.notna(row['Open REST Service']):
                btn = widgets.Button(description=f"Add #{i+1}", button_style='success')
                btn.layer_data = row
                btn.on_click(lambda b: add_layer(b.layer_data))
                print(f"{i+1}. {row['Layer Name']}")
                display(btn)

# Add layer function - FIXED VERSION
def add_layer(row):
    global current_map, added_layers
    with map_area:
        clear_output()
        if current_map is None:
            current_map = gis.map('USA')
            current_map.zoom = 4
        
        service_url = row['Open REST Service']
        layer_name = row['Layer Name']
        
        print(f"Adding: {layer_name}")
        print(f"URL: {service_url}")
        
        try:
            # Just use add_layer - simple and correct
            current_map.add_layer({'url': service_url})
            added_layers.append(layer_name)
            print(f"✓ Added successfully!")
            print(f"\nActive layers ({len(added_layers)}):")
            for i, name in enumerate(added_layers, 1):
                print(f"  {i}. {name}")
        except Exception as e:
            print(f"Error: {e}")
        
        display(current_map)

# Clear function
def on_clear_click(b):
    global current_map, added_layers
    with map_area:
        clear_output()
        current_map = None
        added_layers = []
        print("Map cleared")

# Save function
def on_save_click(b):
    with save_area:
        clear_output()
        if not added_layers:
            print("No layers to save")
            return
        print(f"Save your map with {len(added_layers)} layers")
        print(f"Suggested title: HIFLD Map - {added_layers[0].split()[0]}")
        print("(Save functionality would go here)")

# Connect buttons
search_button.on_click(on_search_click)
clear_button.on_click(on_clear_click)
save_button.on_click(on_save_click)

# Display everything
print("=== HIFLD Search Tool ===\n")
display(widgets.HBox([search_input, search_button]))
display(widgets.HBox([clear_button, save_button]))
display(output_area)
display(map_area)
display(save_area)