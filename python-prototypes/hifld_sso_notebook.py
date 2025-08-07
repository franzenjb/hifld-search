#!/usr/bin/env python3
"""
HIFLD Search Tool for SSO Organizations
Run this in a Jupyter notebook - it will handle Red Cross SSO authentication
"""

import pandas as pd
from arcgis.gis import GIS
import ipywidgets as widgets
from IPython.display import display, clear_output
import os

print("=== HIFLD Interactive Search Tool ===")
print("For Red Cross SSO Authentication")
print("=" * 50)

# Load HIFLD data
print("\n📂 Loading HIFLD data...")
script_dir = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.getcwd()
csv_path = os.path.join(script_dir, 'HIFLD_Open_Crosswalk_Geoplatform.csv')

try:
    df = pd.read_csv(csv_path)
    print(f"✅ Loaded {len(df)} infrastructure layers")
except FileNotFoundError:
    # Try just the filename if full path fails
    try:
        df = pd.read_csv('HIFLD_Open_Crosswalk_Geoplatform.csv')
        print(f"✅ Loaded {len(df)} infrastructure layers")
    except:
        print("❌ Error: HIFLD_Open_Crosswalk_Geoplatform.csv not found!")
        print("Make sure the CSV file is in your current directory")

# Authentication
print("\n🔐 Connecting to Red Cross ArcGIS...")
print("A browser window will open for SSO authentication")
print("Complete your Red Cross login including any 2FA requirements")

# Connect to ArcGIS - will open browser for Red Cross SSO
org_url = "https://arc-nhq-gis.maps.arcgis.com"
gis = GIS(org_url)

print("\n✅ Connected to ArcGIS!")

# Try to get user info
try:
    user = gis.users.me
    if user:
        print(f"👤 Logged in as: {user.username}")
        print(f"📧 Email: {user.email}")
        print(f"🏢 Organization: American Red Cross")
except:
    print("✅ Connected (detailed user info not available)")

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

export_button = widgets.Button(
    description='Export URLs',
    button_style='info',
    icon='download'
)

# Output areas
output_area = widgets.Output()
map_area = widgets.Output()
export_area = widgets.Output()

# Global state
current_map = None
added_layers = []
last_results = None

def search_layers(query):
    """Search for layers matching the query"""
    query = query.lower()
    mask = df['Layer Name'].str.lower().str.contains(query, na=False)
    return df[mask]

def on_search_click(b):
    """Handle search button click"""
    global last_results
    
    with output_area:
        clear_output()
        
        query = search_input.value.strip()
        if not query:
            print("⚠️ Please enter a search term")
            return
        
        last_results = search_layers(query)
        
        if len(last_results) == 0:
            print(f"❌ No layers found matching '{query}'")
            return
        
        print(f"🔍 Found {len(last_results)} layers matching '{query}':\n")
        
        # Show results with Add buttons
        for i, (_, row) in enumerate(last_results.head(15).iterrows()):
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
            
            # Check access requirements
            if row.get('GII Access Required', 'No') == 'Yes':
                print(f"   🔒 Requires GII Access")
            if row.get('DUA Required', 'No') == 'Yes':
                print(f"   📝 Requires Data Use Agreement")
            
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
            added_layers.append({
                'name': layer_name,
                'url': service_url,
                'agency': row['Agency']
            })
            
            print(f"✅ Layer added successfully!")
            print(f"\n📊 Active layers on map ({len(added_layers)}):")
            for i, layer in enumerate(added_layers, 1):
                print(f"   {i}. {layer['name']}")
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Error adding layer: {error_msg[:200]}")
            
            if "unauthorized" in error_msg.lower():
                print("🔐 This layer requires additional permissions")
            elif "token" in error_msg.lower():
                print("🔑 Authentication issue - try refreshing your login")
        
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

def on_export_click(b):
    """Export layer URLs"""
    global added_layers, last_results
    
    with export_area:
        clear_output()
        
        print("📄 Export Options")
        print("=" * 50)
        
        if added_layers:
            print("\n🗺️ Currently mapped layers:")
            print("-" * 40)
            for layer in added_layers:
                print(f"\n{layer['name']}")
                print(f"Agency: {layer['agency']}")
                print(f"URL: {layer['url']}")
        
        if last_results is not None and len(last_results) > 0:
            print("\n\n🔍 All search results with URLs:")
            print("-" * 40)
            
            count = 0
            for _, row in last_results.iterrows():
                if pd.notna(row['Open REST Service']):
                    count += 1
                    print(f"\n{count}. {row['Layer Name']}")
                    print(f"   {row['Open REST Service']}")
            
            print(f"\n\nTotal: {count} layers with map services")

# Connect button handlers
search_button.on_click(on_search_click)
clear_button.on_click(on_clear_click)
export_button.on_click(on_export_click)

# Also search on Enter key
search_input.on_submit(lambda x: on_search_click(None))

# Display the interface
print("\n🎯 Ready to search!\n")

# Search box
display(widgets.HBox([search_input, search_button]))

# Control buttons
display(widgets.HBox([clear_button, export_button]))

# Output areas
display(output_area)
display(map_area)
display(export_area)

print("\n📝 Quick searches to try:")
print("• fire - Fire stations and EMS")
print("• hospital - Medical facilities")
print("• school - Educational institutions")
print("• power - Energy infrastructure")
print("• water - Water facilities")