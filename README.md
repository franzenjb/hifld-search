# HIFLD Search Application

A modern web application for searching and visualizing Homeland Infrastructure Foundation-Level Data (HIFLD) layers using ArcGIS.

## Features

- Search HIFLD infrastructure layers
- Interactive map visualization with ArcGIS
- Add/remove multiple layers
- **Save maps to ArcGIS Online account**
- **Password protection for app access**
- Auto-populated metadata with editable fields
- Responsive design
- Secure API key handling

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file with your credentials:
```
# ArcGIS Credentials
NEXT_PUBLIC_ARCGIS_API_KEY=your_api_key_here
ARCGIS_CLIENT_ID=your_client_id_here
ARCGIS_CLIENT_SECRET=your_client_secret_here

# App Password (optional, defaults to 'hifld2024')
APP_PASSWORD=your_secure_password_here
```

3. Run development server:
```bash
npm run dev
```

4. Deploy to Vercel:
```bash
vercel
```

## New Features

### Save Maps to ArcGIS Online
- Click "Save to ArcGIS" button when you have layers selected
- Auto-populates title, description, and tags based on selected layers
- All fields are editable before saving
- Requires ArcGIS Online authentication
- Opens saved map in ArcGIS Online viewer

### Password Protection
- Simple password protection for the entire application
- Configurable via `APP_PASSWORD` environment variable
- Uses secure HTTP-only cookies
- 7-day session duration

## Environment Variables for Vercel

Add these in your Vercel project settings:
- `NEXT_PUBLIC_ARCGIS_API_KEY`
- `ARCGIS_CLIENT_ID` 
- `ARCGIS_CLIENT_SECRET`
- `APP_PASSWORD` (optional, defaults to 'hifld2024')