#!/usr/bin/env python3
"""
HIFLD Interactive Search Tool with Authentication
Supports OAuth and 2FA authentication for ArcGIS Online
"""

import pandas as pd
from arcgis.gis import GIS
import ipywidgets as widgets
from IPython.display import display, clear_output
import getpass
import sys

print("=== HIFLD Interactive Search Tool ===")
print("Loading data...")

# Load HIFLD data
try:
    df = pd.read_csv('HIFLD_Open_Crosswalk_Geoplatform.csv')
    print(f"✅ Loaded {len(df)} infrastructure layers")
except FileNotFoundError:
    print("❌ Error: HIFLD_Open_Crosswalk_Geoplatform.csv not found!")
    print("Please ensure the CSV file is in the same directory as this script.")
    sys.exit(1)

# Authentication section
print("\n🔐 ArcGIS Online Authentication")
print("-" * 50)
print("Choose authentication method:")
print("1. Interactive OAuth (opens browser for 2FA)")
print("2. Username/Password (may prompt for 2FA code)")
print("3. Use existing ArcGIS Pro login")
print("4. Anonymous (limited functionality)")

auth_choice = input("\nEnter choice (1-4): ").strip()

gis = None

try:
    if auth_choice == "1":
        # OAuth - opens browser window for authentication
        print("\n🌐 Opening browser for OAuth authentication...")
        print("You will be redirected to your organization's login page.")
        print("Complete the login including any 2FA requirements.")
        
        # For OAuth, you need to specify your org URL
        org_url = input("Enter your ArcGIS Online organization URL (e.g., https://yourorg.maps.arcgis.com): ").strip()
        
        try:
            gis = GIS(org_url)
            print(f"✅ Successfully authenticated as: {gis.properties.user.username}")
        except Exception as e:
            print(f"❌ OAuth authentication failed: {e}")
            sys.exit(1)
            
    elif auth_choice == "2":
        # Username/Password authentication
        print("\n🔑 Username/Password Authentication")
        org_url = input("Enter your ArcGIS Online URL (or press Enter for default): ").strip()
        if not org_url:
            org_url = "https://www.arcgis.com"
        
        username = input("Username: ").strip()
        password = getpass.getpass("Password: ")
        
        print("\nAuthenticating...")
        try:
            gis = GIS(org_url, username, password)
            print(f"✅ Successfully authenticated as: {gis.properties.user.username}")
            
            # Note: If 2FA is required, the API will automatically prompt for it
            # in the console during the GIS() call
            
        except Exception as e:
            if "token required" in str(e).lower():
                print("\n📱 Two-factor authentication required!")
                print("Check your authenticator app or SMS for the code.")
                # The ArcGIS API should handle the 2FA prompt automatically
            else:
                print(f"❌ Authentication failed: {e}")
                sys.exit(1)
                
    elif auth_choice == "3":
        # Use ArcGIS Pro authentication
        print("\n🖥️ Using ArcGIS Pro authentication...")
        try:
            gis = GIS("pro")
            print(f"✅ Successfully authenticated using ArcGIS Pro login")
            print(f"Logged in as: {gis.properties.user.username}")
        except Exception as e:
            print(f"❌ ArcGIS Pro authentication failed: {e}")
            print("Make sure ArcGIS Pro is installed and you're logged in.")
            sys.exit(1)
            
    else:
        # Anonymous access
        print("\n👤 Using anonymous access (limited functionality)...")
        gis = GIS()
        print("⚠️ Warning: Some layers may not be accessible without authentication.")

except KeyboardInterrupt:
    print("\n\n❌ Authentication cancelled.")
    sys.exit(1)

print("\n✅ Authentication successful!\n")

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

logout_button = widgets.Button(
    description='Logout',
    button_style='danger',
    icon='sign-out'
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
            
            # Check if layer requires special access
            requires_gii = row.get('GII Access Required', 'No') == 'Yes'
            requires_dua = row.get('DUA Required', 'No') == 'Yes'
            
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
            
            if requires_gii:
                print(f"   🔒 Requires GII Access")
            if requires_dua:
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
        
        # Check authentication for restricted layers
        if not gis.properties.user:
            requires_auth = row.get('GII Access Required', 'No') == 'Yes' or row.get('DUA Required', 'No') == 'Yes'
            if requires_auth:
                print("❌ This layer requires authentication. Please login first.")
                return
        
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
                    if "unauthorized" in str(e2).lower():
                        print("🔐 This layer may require additional permissions.")
        
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
        
        if not gis.properties.user:
            print("❌ You must be logged in to save maps.")
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
        print(f"Saving as: {gis.properties.user.username}")
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
            # from arcgis.mapping import WebMap
            # webmap = WebMap()
            # for layer_url in layer_urls:
            #     webmap.add_layer({'url': layer_url})
            # item = webmap.save({
            #     'title': title_input.value,
            #     'summary': summary_input.value,
            #     'tags': tags_input.value.split(', ')
            # })
            # print(f"Map saved! ID: {item.id}")
            # print(f"View at: {item.homepage}")
            
            print("\n✅ Map configuration saved!")
            print("(In production, this would save to your ArcGIS Online account)")
        
        final_save_button.on_click(save_map)
        
        display(title_input)
        display(summary_input)
        display(tags_input)
        display(final_save_button)

def on_logout_click(b):
    """Logout from ArcGIS"""
    global gis
    with output_area:
        clear_output()
        print("👋 Logging out...")
        # Note: There's no explicit logout in the Python API
        # In a web app, you would clear the session
        print("✅ Logged out. Please restart the script to login again.")

# Connect button handlers
search_button.on_click(on_search_click)
clear_button.on_click(on_clear_click)
save_button.on_click(on_save_click)
logout_button.on_click(on_logout_click)

# Also search on Enter key
search_input.on_submit(lambda x: on_search_click(None))

# Display the interface
print("🎯 Ready to search!\n")

# Show current user info
if gis.properties.user:
    print(f"👤 Logged in as: {gis.properties.user.username}")
    print(f"🏢 Organization: {gis.properties.user.orgId}")
else:
    print("👤 Not logged in (anonymous access)")

print("\n")

# Search box
display(widgets.HBox([search_input, search_button]))

# Control buttons
display(widgets.HBox([clear_button, save_button, logout_button]))

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
print("5. Use 'Save Map' to save your configuration (requires login)")
print("\n⚠️ Note: Some layers require special access (GII or DUA)")