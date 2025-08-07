// Wildfire data service
export interface WildfireData {
  id: string
  name: string
  acres: number
  containment: number
  lat: number
  lon: number
  startDate: string
  cause: string
  status: string
}

// Fetch active wildfires from IRWIN (Integrated Reporting of Wildland-Fire Information)
export async function fetchActiveWildfires(): Promise<WildfireData[]> {
  try {
    // IRWIN provides the most authoritative wildfire data
    // Using NIFC ArcGIS service that pulls from IRWIN
    const response = await fetch('https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Current_WildlandFire_Locations/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson&orderByFields=DailyAcres%20DESC&resultRecordCount=50', {
      cache: 'no-cache'
    })
    
    if (!response.ok) {
      console.warn('Wildfire data not available')
      return []
    }

    const data = await response.json()
    const wildfires: WildfireData[] = []
    
    if (data.features) {
      data.features.forEach((feature: any) => {
        const props = feature.properties
        if (props && feature.geometry && feature.geometry.type === 'Point') {
          // IRWIN data comes as points with lat/lon
          wildfires.push({
            id: props.IrwinID || props.UniqueFireIdentifier || props.OBJECTID?.toString() || 'unknown',
            name: props.IncidentName || 'Unnamed Fire',
            acres: Math.round(props.DailyAcres || props.CalculatedAcres || 0),
            containment: props.PercentContained || 0,
            lat: feature.geometry.coordinates[1],
            lon: feature.geometry.coordinates[0],
            startDate: props.FireDiscoveryDateTime || props.CreateDate || new Date().toISOString(),
            cause: props.FireCause || props.FireCauseGeneral || 'Unknown',
            status: props.Status || 'Active'
          })
        }
      })
    }

    console.log('Fetched wildfires:', wildfires.length)
    return wildfires.slice(0, 20) // Limit to top 20 largest fires
  } catch (error) {
    console.error('Error fetching wildfire data:', error)
    return []
  }
}

// Get fire perimeter geometry
export async function getFirePerimeter(fireId: string): Promise<any> {
  try {
    const response = await fetch(`https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Current_WildlandFire_Perimeters/FeatureServer/0/query?where=OBJECTID=${fireId}&outFields=*&f=geojson`)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}