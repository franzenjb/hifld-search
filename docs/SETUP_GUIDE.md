# HIFLD Search Application Setup Guide

## Project Status
✅ **Build**: The application builds successfully with no errors
✅ **TypeScript**: No type errors found
✅ **Linting**: ESLint configured and passing
✅ **Dependencies**: All npm packages installed
✅ **Development Server**: Running on http://localhost:3000
✅ **Search Functionality**: CSV data loads and search works
⚠️ **Map Visualization**: Requires ArcGIS API credentials

## To Complete Setup

### 1. Obtain ArcGIS Credentials
You need to get an ArcGIS API key to enable map functionality:

1. Go to [ArcGIS Developers](https://developers.arcgis.com/)
2. Sign up for a free developer account
3. Create a new API key from your dashboard
4. Copy the API key

### 2. Configure Environment Variables
Update the `.env.local` file with your actual ArcGIS API key:

```bash
NEXT_PUBLIC_ARCGIS_API_KEY=your_actual_api_key_here
```

### 3. Restart Development Server
After updating the environment variables:

```bash
# Stop the current server (Ctrl+C)
# Start it again
npm run dev
```

### 4. Test the Application
1. Open http://localhost:3000
2. Search for infrastructure (e.g., "fire", "hospital", "school")
3. Click on layers with available REST services to add them to the map
4. The map should display the selected layers

## Application Features
- **Search**: Natural language search across ~200 infrastructure layers
- **Filter**: Results show layers with available map services first
- **Map**: Interactive ArcGIS map with layer visualization
- **Metadata**: Shows agency, DUA requirements, and GII access needs

## Common Search Terms
- fire
- hospital
- school
- power
- water
- emergency
- police
- airport

## Troubleshooting

### Map Not Loading
- Verify your ArcGIS API key is valid
- Check browser console for errors
- Ensure the API key has necessary permissions

### Layers Not Displaying
- Some layers require GII access or DUA agreements
- Check if the layer has a valid REST service URL
- Look for console errors when adding layers

### Build Issues
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

## Deployment
For production deployment:

1. Set environment variables in your hosting platform (Vercel, etc.)
2. Ensure the CSV file is included in the deployment
3. Configure proper CORS headers if needed

## Additional Resources
- [ArcGIS JavaScript API Documentation](https://developers.arcgis.com/javascript/latest/)
- [Next.js Documentation](https://nextjs.org/docs)
- [HIFLD Information](https://gii.dhs.gov/hifld)