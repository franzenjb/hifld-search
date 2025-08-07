// National Hurricane Center data service
export interface HurricaneData {
  id: string
  name: string
  status: string
  category: string
  lat: number
  lon: number
  windSpeed: number
  pressure: number
  movementDir: number
  movementSpeed: number
  timestamp: string
  forecastTrack?: Array<{
    lat: number
    lon: number
    timestamp: string
    windSpeed: number
  }>
}

export interface NHCStorm {
  id: string
  name: string
  classification: string
  lat: number
  lon: number
  intensityKT: number
  intensityMPH: number
  pressure: number
  movementDEG: number
  movementMPH: number
  lastUpdate: string
}

// Fetch active storms from NHC
export async function fetchActiveHurricanes(): Promise<HurricaneData[]> {
  try {
    // NHC provides various data feeds - using their JSON feed for active storms
    const response = await fetch('https://www.nhc.noaa.gov/CurrentStorms.json', {
      cache: 'no-cache' // Always get latest data
    })
    
    if (!response.ok) {
      console.warn('NHC data not available, using fallback')
      return []
    }

    const data = await response.json()
    
    // Transform NHC data to our format
    const hurricanes: HurricaneData[] = data.activeStorms?.map((storm: any) => ({
      id: storm.id,
      name: storm.name,
      status: storm.classification,
      category: getCategoryFromWind(storm.intensityKT),
      lat: storm.lat,
      lon: storm.lon,
      windSpeed: storm.intensityMPH,
      pressure: storm.pressure,
      movementDir: storm.movementDEG,
      movementSpeed: storm.movementMPH,
      timestamp: storm.lastUpdate
    })) || []

    return hurricanes
  } catch (error) {
    console.error('Error fetching hurricane data:', error)
    // Return mock data for demo if NHC is unavailable
    return getMockHurricaneData()
  }
}

// Helper function to determine hurricane category
function getCategoryFromWind(windKnots: number): string {
  const windMPH = windKnots * 1.15078
  if (windMPH >= 157) return 'Category 5'
  if (windMPH >= 130) return 'Category 4'
  if (windMPH >= 111) return 'Category 3'
  if (windMPH >= 96) return 'Category 2'
  if (windMPH >= 74) return 'Category 1'
  if (windMPH >= 39) return 'Tropical Storm'
  return 'Tropical Depression'
}

// Mock data for development/demo
function getMockHurricaneData(): HurricaneData[] {
  return [
    {
      id: 'demo-hurricane',
      name: 'Demo Hurricane',
      status: 'Hurricane',
      category: 'Category 3',
      lat: 25.5,
      lon: -80.5, // Near Miami
      windSpeed: 120,
      pressure: 950,
      movementDir: 315, // Northwest
      movementSpeed: 12,
      timestamp: new Date().toISOString(),
      forecastTrack: [
        { lat: 25.5, lon: -80.5, timestamp: new Date().toISOString(), windSpeed: 120 },
        { lat: 26.2, lon: -81.2, timestamp: new Date(Date.now() + 6*3600000).toISOString(), windSpeed: 115 },
        { lat: 27.0, lon: -82.0, timestamp: new Date(Date.now() + 12*3600000).toISOString(), windSpeed: 110 },
        { lat: 27.9, lon: -82.8, timestamp: new Date(Date.now() + 24*3600000).toISOString(), windSpeed: 100 },
        { lat: 29.0, lon: -83.5, timestamp: new Date(Date.now() + 36*3600000).toISOString(), windSpeed: 85 },
      ]
    }
  ]
}

// Get forecast cone GeoJSON from NHC
export async function getHurricaneCone(stormId: string): Promise<any> {
  try {
    const response = await fetch(`https://www.nhc.noaa.gov/storm_graphics/api/${stormId}_CONE_latest.json`)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

// Get wind field probabilities
export async function getWindProbabilities(stormId: string): Promise<any> {
  try {
    const response = await fetch(`https://www.nhc.noaa.gov/storm_graphics/api/${stormId}_WNDPRB_latest.json`)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}