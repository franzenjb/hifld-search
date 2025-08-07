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
    // Use NHC's Active Storms GeoJSON feed
    const response = await fetch('https://www.nhc.noaa.gov/gis/json/ACTIVE_STORMS.json', {
      cache: 'no-cache' // Always get latest data
    })
    
    if (!response.ok) {
      console.warn('NHC data not available')
      return []
    }

    const data = await response.json()
    
    // Transform NHC GeoJSON data to our format
    const hurricanes: HurricaneData[] = []
    
    if (data.features) {
      data.features.forEach((feature: any) => {
        const props = feature.properties
        if (props && feature.geometry) {
          hurricanes.push({
            id: props.STORMID || props.id,
            name: props.STORMNAME || props.name || 'Unknown',
            status: props.STORMTYPE || 'Disturbance',
            category: getCategoryFromWind(props.MAXWIND || 0),
            lat: feature.geometry.coordinates[1],
            lon: feature.geometry.coordinates[0],
            windSpeed: props.MAXWIND || 0,
            pressure: props.MINPRESSURE || 0,
            movementDir: props.FWDDIR || 0,
            movementSpeed: props.FWDSPEED || 0,
            timestamp: props.DTG || new Date().toISOString()
          })
        }
      })
    }

    console.log('Fetched storms from NHC:', hurricanes)
    return hurricanes
  } catch (error) {
    console.error('Error fetching hurricane data:', error)
    return []
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

// Fetch disturbances and potential cyclones
export async function fetchDisturbances(): Promise<any[]> {
  try {
    const response = await fetch('https://www.nhc.noaa.gov/xgtwo/two_atl_5d0.json', {
      cache: 'no-cache'
    })
    
    if (!response.ok) return []
    
    const data = await response.json()
    return data.disturbances || []
  } catch (error) {
    console.error('Error fetching disturbances:', error)
    return []
  }
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