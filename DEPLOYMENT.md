# Deployment Guide

## Features Added

### 1. Save Maps to ArcGIS Online
- Users can save their map configurations (with selected layers) to their ArcGIS Online account
- Auto-populates metadata:
  - **Title**: Based on primary layer name + count of additional layers
  - **Description**: Lists included layers and data sources
  - **Tags**: Automatically generates relevant tags from layer names and agencies
- All fields are editable before saving
- After saving, the map opens in ArcGIS Online viewer

### 2. Password Protection
- Simple password authentication to protect the entire application
- Default password: `hifld2024` (change this in production!)
- Uses secure HTTP-only cookies with 7-day expiration
- Password is configurable via `APP_PASSWORD` environment variable

## Deployment Steps

### 1. Update Environment Variables in Vercel

Add these to your Vercel project settings:

```
NEXT_PUBLIC_ARCGIS_API_KEY=your_api_key_here
ARCGIS_CLIENT_ID=your_client_id_here
ARCGIS_CLIENT_SECRET=your_client_secret_here
APP_PASSWORD=your_secure_password_here
```

**Important**: Change `APP_PASSWORD` from the default `hifld2024` to something more secure!

### 2. Deploy to Vercel

```bash
vercel --prod
```

Or push to GitHub and let Vercel auto-deploy.

## How It Works

### Password Protection Flow
1. User visits the app
2. `PasswordProtection` component checks for authentication cookie
3. If not authenticated, shows password form
4. On correct password, sets secure cookie and grants access
5. Cookie lasts 7 days, then user must re-authenticate

### Save Map Flow
1. User selects layers from search results
2. Clicks "Save to ArcGIS" button
3. Dialog opens with auto-populated metadata
4. User can edit title, description, and tags
5. On save, app:
   - Prompts for ArcGIS Online login (if not authenticated)
   - Creates a WebMap from current view
   - Saves to user's ArcGIS Online account
   - Opens the saved map in ArcGIS Online viewer

## Security Considerations

1. **API Key Protection**: Your ArcGIS API key is exposed to clients (required for map functionality). Consider:
   - Setting referrer restrictions in ArcGIS Developer dashboard
   - Using domain restrictions
   - Monitoring usage

2. **Password Protection**: The current implementation is basic. For production:
   - Use a strong password
   - Consider implementing proper user authentication
   - Add rate limiting to prevent brute force attacks

3. **CORS**: Ensure your domain is allowed in ArcGIS service configurations

## Testing

1. Access the app - you should see the password screen
2. Enter password (default: `hifld2024`)
3. Search for layers (e.g., "fire", "hospital")
4. Add layers to the map
5. Click "Save to ArcGIS" button
6. Edit metadata if desired
7. Save and verify map opens in ArcGIS Online

## Troubleshooting

- **Password not working**: Check `APP_PASSWORD` environment variable
- **Save fails**: Ensure user is logged into ArcGIS Online
- **Map doesn't load**: Verify ArcGIS API key is valid
- **Authentication errors**: Check ARCGIS_CLIENT_ID and ARCGIS_CLIENT_SECRET