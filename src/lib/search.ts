import Papa from 'papaparse'

export interface Layer {
  name: string
  agency: string
  serviceUrl: string | null
  status: string
  duaRequired: boolean
  giiRequired: boolean
}

export interface CSVRow {
  'Layer Name': string
  'Agency': string
  'Open REST Service': string
  'Status': string
  'DUA Required': string
  'GII Access Required': string
}

let cachedData: CSVRow[] | null = null

async function loadCSVData(): Promise<CSVRow[]> {
  if (cachedData) return cachedData

  try {
    const response = await fetch('/HIFLD_Open_Crosswalk_Geoplatform.csv')
    const text = await response.text()
    
    const result = Papa.parse<CSVRow>(text, {
      header: true,
      skipEmptyLines: true,
    })

    cachedData = result.data
    return cachedData
  } catch (error) {
    console.error('Failed to load CSV data:', error)
    return []
  }
}

export async function searchLayers(query: string): Promise<Layer[]> {
  const data = await loadCSVData()
  
  if (!query.trim()) return []

  const searchTerm = query.toLowerCase()
  const filtered = data.filter((row) =>
    row['Layer Name']?.toLowerCase().includes(searchTerm)
  )

  // Sort by whether REST service is available
  filtered.sort((a, b) => {
    const aHasService = !!a['Open REST Service']
    const bHasService = !!b['Open REST Service']
    return bHasService ? -1 : aHasService ? 1 : 0
  })

  return filtered.map((row) => ({
    name: row['Layer Name'] || '',
    agency: row['Agency'] || '',
    serviceUrl: row['Open REST Service'] || null,
    status: row['Status'] || '',
    duaRequired: row['DUA Required'] === 'Yes',
    giiRequired: row['GII Access Required'] === 'Yes',
  }))
}