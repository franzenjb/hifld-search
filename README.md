# HIFLD Search Application

A modern web application for searching and visualizing Homeland Infrastructure Foundation-Level Data (HIFLD) layers using ArcGIS.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file with your ArcGIS credentials:
```
ARCGIS_API_KEY=your_api_key_here
ARCGIS_CLIENT_ID=your_client_id_here
ARCGIS_CLIENT_SECRET=your_client_secret_here
```

3. Run development server:
```bash
npm run dev
```

4. Deploy to Vercel:
```bash
vercel
```

## Features

- Search HIFLD infrastructure layers
- Interactive map visualization
- Add/remove multiple layers
- Responsive design
- Secure API key handling

## Environment Variables for Vercel

Add these in your Vercel project settings:
- `ARCGIS_API_KEY`
- `ARCGIS_CLIENT_ID` 
- `ARCGIS_CLIENT_SECRET`