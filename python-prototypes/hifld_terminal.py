#!/usr/bin/env python3
"""
HIFLD Search Tool - Terminal Version with Username/Password
"""

import pandas as pd
from arcgis.gis import GIS
import getpass
import sys
import os

print("=== HIFLD Search Tool - Terminal Version ===")
print("=" * 50)

# Load HIFLD data
print("\n📂 Loading HIFLD data...")

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(script_dir, 'HIFLD_Open_Crosswalk_Geoplatform.csv')

try:
    df = pd.read_csv(csv_path)
    print(f"✅ Loaded {len(df)} infrastructure layers")
except FileNotFoundError:
    print(f"❌ Error: CSV file not found at: {csv_path}")
    sys.exit(1)

# Authentication
print("\n🔐 ArcGIS Online Authentication")
print("-" * 50)

# Organization URL
org_url = "https://arc-nhq-gis.maps.arcgis.com"
print(f"Organization: {org_url}")

# Get credentials
username = input("\nUsername: ").strip()
password = getpass.getpass("Password: ")

print("\n🔄 Authenticating...")

try:
    gis = GIS(org_url, username, password)
    print("✅ Authentication successful!")
    
    # Note: If 2FA is enabled, you may see a prompt here for your code
    
    try:
        user = gis.users.me
        if user:
            print(f"👤 Logged in as: {user.username}")
            print(f"📧 Email: {user.email}")
    except:
        print("✅ Connected (user info not available)")
        
except Exception as e:
    print(f"\n❌ Authentication failed: {e}")
    if "token" in str(e).lower():
        print("\n📱 If you have 2FA enabled, you should have been prompted for a code.")
        print("Make sure to enter the code from your authenticator app.")
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
        
        if pd.notna(row['Open REST Service']):
            print(f"   ✅ Map service available")
            print(f"   URL: {row['Open REST Service']}")
        else:
            print(f"   ❌ No map service")

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
            print(f"   ❌ Failed: {str(e)[:100]}")
            failed_count += 1
    
    print(f"\n📊 Summary: {added_count} layers added, {failed_count} failed")
    print("\n💡 To view the map, you'll need to run this in a Jupyter notebook")
    
    return map_widget, [search_results.iloc[idx-1] for idx in layer_indices if 1 <= idx <= len(search_results)]

# Main interactive loop
def main():
    print("\n" + "=" * 50)
    print("🎯 HIFLD Search Interface")
    print("=" * 50)
    print("\nCommands:")
    print("  search <term>  - Search for layers (e.g., 'search fire')")
    print("  show <number>  - Show details for a specific result")
    print("  export <nums>  - Export layer URLs (e.g., 'export 1,3,5')")
    print("  list           - Show recent search results again")
    print("  help           - Show this help")
    print("  quit           - Exit")
    
    last_results = None
    
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
                
            elif command.startswith('show '):
                if last_results is None:
                    print("❌ No search results. Search for layers first.")
                    continue
                
                try:
                    idx = int(command[5:])
                    if 1 <= idx <= len(last_results):
                        row = last_results.iloc[idx - 1]
                        print(f"\n📋 Layer Details:")
                        print(f"Name: {row['Layer Name']}")
                        print(f"Agency: {row['Agency']}")
                        print(f"Status: {row.get('Status', 'Unknown')}")
                        print(f"REST Service: {row.get('Open REST Service', 'N/A')}")
                        print(f"GII Required: {row.get('GII Access Required', 'No')}")
                        print(f"DUA Required: {row.get('DUA Required', 'No')}")
                    else:
                        print("❌ Invalid number")
                except ValueError:
                    print("❌ Please enter a valid number")
                    
            elif command.startswith('export '):
                if last_results is None:
                    print("❌ No search results. Search for layers first.")
                    continue
                
                try:
                    numbers = command[7:].replace(' ', '')
                    indices = [int(x.strip()) for x in numbers.split(',')]
                    
                    print("\n📄 Layer URLs for copying:")
                    print("-" * 60)
                    
                    for idx in indices:
                        if 1 <= idx <= len(last_results):
                            row = last_results.iloc[idx - 1]
                            if pd.notna(row['Open REST Service']):
                                print(f"\n{row['Layer Name']}:")
                                print(f"{row['Open REST Service']}")
                            else:
                                print(f"\n{row['Layer Name']}: No URL available")
                                
                except ValueError:
                    print("❌ Invalid format. Use: export 1,3,5")
                    
            elif command == 'list':
                if last_results is not None:
                    display_results(last_results)
                else:
                    print("No search results to display")
                    
            elif command == 'help':
                print("\nCommands:")
                print("  search <term>  - Search for layers")
                print("  show <number>  - Show details for a specific result")
                print("  export <nums>  - Export layer URLs")
                print("  list           - Show recent search results")
                print("  quit           - Exit")
                
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