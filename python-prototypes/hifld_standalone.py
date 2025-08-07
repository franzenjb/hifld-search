#!/usr/bin/env python3
"""
HIFLD Search Tool - Standalone with Browser Authentication
This script will open your browser for OAuth/2FA authentication
"""

import pandas as pd
from arcgis.gis import GIS
import webbrowser
import time
import sys

print("=== HIFLD Search Tool - Standalone Version ===")
print("=" * 50)

# Load HIFLD data
print("\n📂 Loading HIFLD data...")
import os

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(script_dir, 'HIFLD_Open_Crosswalk_Geoplatform.csv')

try:
    df = pd.read_csv(csv_path)
    print(f"✅ Loaded {len(df)} infrastructure layers")
except FileNotFoundError:
    print(f"❌ Error: CSV file not found at: {csv_path}")
    print(f"Current directory: {os.getcwd()}")
    sys.exit(1)

# Authentication
print("\n🔐 ArcGIS Online Authentication")
print("-" * 50)
print("This will open your browser for secure login.")
print("You can use your organization's SSO, 2FA, etc.")

# Hard-coded organization URL
org_url = "https://arc-nhq-gis.maps.arcgis.com"

print(f"\n🌐 Connecting to: {org_url}")
print("📱 Your browser will open for authentication...")
print("   Complete your normal login process (including 2FA if required)")
print("   Then return to this window\n")

# Small delay to let user read the message
time.sleep(2)

# Create GIS connection - this will open browser for OAuth
try:
    # Try to force browser open with client_id if needed
    gis = GIS(org_url, client_id='python')
    print("\n✅ Connected to ArcGIS!")
    
    # Check if we have user info
    try:
        if hasattr(gis, 'properties') and hasattr(gis.properties, 'user'):
            user = gis.properties.user
            print(f"👤 Logged in as: {user.username}")
            print(f"🏢 Organization: {user.fullName}")
            print(f"📧 Email: {user.email}")
        else:
            # Try alternative user access
            user = gis.users.me
            if user:
                print(f"👤 Logged in as: {user.username}")
            else:
                print("⚠️  Connected but user info not available")
    except:
        print("⚠️  Connected with limited user info access")
        
except Exception as e:
    print(f"\n❌ Authentication failed: {e}")
    print("\nTrying alternative authentication method...")
    
    # Try without client_id
    try:
        gis = GIS(org_url)
        print("✅ Connected with alternative method!")
    except Exception as e2:
        print(f"❌ Alternative method also failed: {e2}")
        print("\nTroubleshooting:")
        print("1. Try running in a Jupyter notebook environment")
        print("2. Or use username/password authentication")
        sys.exit(1)

# Search functionality
def search_layers(query):
    """Search for layers by keyword"""
    query = query.lower()
    results = df[df['Layer Name'].str.lower().str.contains(query, na=False)]
    return results

def display_results(results):
    """Display search results"""
    if len(results) == 0:
        print("No layers found.")
        return
    
    print(f"\nFound {len(results)} layers:")
    print("-" * 80)
    
    for i, (_, row) in enumerate(results.head(20).iterrows(), 1):
        print(f"\n{i}. {row['Layer Name']}")
        print(f"   Agency: {row['Agency']}")
        print(f"   Status: {row.get('Status', 'Unknown')}")
        
        if pd.notna(row['Open REST Service']):
            print(f"   ✅ Map service available")
            print(f"   URL: {row['Open REST Service']}")
        else:
            print(f"   ❌ No map service")
        
        # Show access requirements
        if row.get('GII Access Required', 'No') == 'Yes':
            print(f"   🔒 Requires GII Access")
        if row.get('DUA Required', 'No') == 'Yes':
            print(f"   📝 Requires Data Use Agreement")

def create_map_with_layers(layer_indices, search_results):
    """Create a map with selected layers"""
    print("\n🗺️  Creating map...")
    
    # Create map widget
    map_widget = gis.map('USA')
    map_widget.zoom = 4
    
    added_count = 0
    failed_count = 0
    
    for idx in layer_indices:
        if idx < 1 or idx > len(search_results):
            print(f"❌ Invalid selection: {idx}")
            continue
            
        row = search_results.iloc[idx - 1]
        layer_name = row['Layer Name']
        service_url = row['Open REST Service']
        
        if pd.isna(service_url):
            print(f"❌ No map service for: {layer_name}")
            failed_count += 1
            continue
        
        print(f"\n➕ Adding: {layer_name}")
        
        try:
            map_widget.add_layer({'url': service_url})
            added_count += 1
            print(f"   ✅ Success!")
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            failed_count += 1
    
    print(f"\n📊 Summary: {added_count} layers added, {failed_count} failed")
    
    # Save the map widget reference for later use
    return map_widget

def save_map_config(title, summary, tags, layer_urls):
    """Save map configuration"""
    print(f"\n💾 Saving map configuration...")
    print(f"Title: {title}")
    print(f"Summary: {summary}")
    print(f"Tags: {tags}")
    
    # In a real implementation, you would:
    # 1. Create a WebMap object
    # 2. Add all layers
    # 3. Save to ArcGIS Online
    
    # For now, save configuration locally
    config = {
        'title': title,
        'summary': summary,
        'tags': tags,
        'layers': layer_urls,
        'created_by': gis.properties.user.username if gis.properties.user else 'anonymous',
        'created_date': pd.Timestamp.now().isoformat()
    }
    
    filename = f"map_config_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.json"
    pd.DataFrame([config]).to_json(filename, orient='records', indent=2)
    print(f"✅ Configuration saved to: {filename}")

# Main interactive loop
def main():
    print("\n" + "=" * 50)
    print("🎯 HIFLD Search Interface")
    print("=" * 50)
    print("\nCommands:")
    print("  search <term>     - Search for layers (e.g., 'search fire')")
    print("  map <numbers>     - Create map with layers (e.g., 'map 1,3,5')")
    print("  save              - Save current map configuration")
    print("  list              - Show recent search results again")
    print("  help              - Show this help")
    print("  quit              - Exit the program")
    
    last_results = None
    current_map = None
    current_layers = []
    
    while True:
        try:
            command = input("\n🔍 Enter command: ").strip().lower()
            
            if command.startswith('search '):
                query = command[7:]
                if not query:
                    print("Please provide a search term")
                    continue
                    
                print(f"\n🔎 Searching for '{query}'...")
                last_results = search_layers(query)
                display_results(last_results)
                
            elif command.startswith('map '):
                if last_results is None or len(last_results) == 0:
                    print("❌ No search results. Search for layers first.")
                    continue
                
                try:
                    # Parse layer numbers
                    numbers = command[4:].replace(' ', '')
                    indices = [int(x.strip()) for x in numbers.split(',')]
                    
                    current_map = create_map_with_layers(indices, last_results)
                    
                    # Store selected layers
                    current_layers = []
                    for idx in indices:
                        if 1 <= idx <= len(last_results):
                            row = last_results.iloc[idx - 1]
                            if pd.notna(row['Open REST Service']):
                                current_layers.append({
                                    'name': row['Layer Name'],
                                    'url': row['Open REST Service'],
                                    'agency': row['Agency']
                                })
                    
                    if current_map and current_layers:
                        print("\n✅ Map created! Open Jupyter notebook to view it.")
                        print("Or use 'save' to save the configuration.")
                        
                except ValueError:
                    print("❌ Invalid format. Use: map 1,3,5")
                    
            elif command == 'save':
                if not current_layers:
                    print("❌ No map to save. Create a map first.")
                    continue
                
                print("\n💾 Save Map Configuration")
                print("-" * 40)
                
                # Get metadata
                title = input("Title [HIFLD Infrastructure Map]: ").strip()
                if not title:
                    title = "HIFLD Infrastructure Map"
                
                summary = input("Summary [Multiple infrastructure layers]: ").strip()
                if not summary:
                    summary = f"Map showing {len(current_layers)} infrastructure layers"
                
                tags = input("Tags (comma-separated) [HIFLD,infrastructure]: ").strip()
                if not tags:
                    tags = "HIFLD,infrastructure"
                
                layer_urls = [layer['url'] for layer in current_layers]
                save_map_config(title, summary, tags, layer_urls)
                
            elif command == 'list':
                if last_results is not None:
                    display_results(last_results)
                else:
                    print("No search results to display")
                    
            elif command == 'help':
                print("\nCommands:")
                print("  search <term>     - Search for layers")
                print("  map <numbers>     - Create map with layers")
                print("  save              - Save current map configuration")
                print("  list              - Show recent search results")
                print("  quit              - Exit the program")
                
            elif command in ['quit', 'exit', 'q']:
                print("\n👋 Goodbye!")
                break
                
            else:
                print("❓ Unknown command. Type 'help' for commands.")
                
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()