'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { Layer } from '@/lib/search'

interface MapViewProps {
  layers: Layer[]
}

export interface MapViewRef {
  getView: () => any
}

// Layer type detection and field mapping configuration
interface LayerTypeConfig {
  keywords: string[]
  displayFields: string[]
  titleField?: string
  geometrySpecific?: {
    point?: string[]
    polygon?: string[]
  }
}

const LAYER_TYPE_CONFIGS: Record<string, LayerTypeConfig> = {
  emergency: {
    keywords: ['ems', 'fire', 'emergency', 'police', 'law enforcement', 'rescue', 'ambulance'],
    displayFields: ['NAME', 'ADDRESS', 'CITY', 'STATE', 'ZIP', 'PHONE', 'TYPE', 'STATUS'],
    titleField: 'NAME'
  },
  medical: {
    keywords: ['hospital', 'medical', 'health', 'clinic', 'nursing', 'care center'],
    displayFields: ['NAME', 'ADDRESS', 'CITY', 'STATE', 'ZIP', 'PHONE', 'BEDS', 'TYPE', 'OWNER'],
    titleField: 'NAME'
  },
  education: {
    keywords: ['school', 'university', 'college', 'education', 'campus'],
    displayFields: ['NAME', 'ADDRESS', 'CITY', 'STATE', 'ZIP', 'ENROLLMENT', 'TYPE', 'LEVEL'],
    titleField: 'NAME'
  },
  communication: {
    keywords: ['tower', 'antenna', 'cellular', 'radio', 'transmission', 'broadcast', 'microwave'],
    displayFields: ['CALLSIGN', 'LICENSEE', 'ADDRESS', 'CITY', 'STATE', 'HEIGHT', 'FREQUENCY', 'TYPE'],
    titleField: 'CALLSIGN'
  },
  transportation: {
    keywords: ['airport', 'port', 'rail', 'transit', 'transportation', 'highway', 'bridge'],
    displayFields: ['NAME', 'CODE', 'ADDRESS', 'CITY', 'STATE', 'TYPE', 'OWNER', 'STATUS'],
    titleField: 'NAME'
  },
  energy: {
    keywords: ['power', 'electric', 'energy', 'gas', 'oil', 'pipeline', 'substation', 'plant'],
    displayFields: ['NAME', 'ADDRESS', 'CITY', 'STATE', 'CAPACITY', 'TYPE', 'OWNER', 'STATUS'],
    titleField: 'NAME'
  },
  water: {
    keywords: ['water', 'wastewater', 'treatment', 'dam', 'reservoir', 'utility'],
    displayFields: ['NAME', 'ADDRESS', 'CITY', 'STATE', 'CAPACITY', 'TYPE', 'OWNER', 'STATUS'],
    titleField: 'NAME'
  },
  military: {
    keywords: ['military', 'army', 'navy', 'air force', 'marines', 'defense', 'base', 'installation'],
    displayFields: ['NAME', 'INSTALLATION', 'BRANCH', 'STATE', 'COMPONENT', 'TYPE', 'STATUS'],
    titleField: 'NAME'
  },
  border: {
    keywords: ['border', 'boundary', 'crossing', 'port of entry'],
    displayFields: ['NAME', 'PORT_CODE', 'STATE', 'TYPE', 'STATUS', 'HOURS'],
    titleField: 'NAME'
  },
  infrastructure: {
    keywords: ['infrastructure', 'facility', 'building', 'structure'],
    displayFields: ['NAME', 'ADDRESS', 'CITY', 'STATE', 'ZIP', 'TYPE', 'OWNER', 'STATUS'],
    titleField: 'NAME'
  }
}

// Common fallback fields that often exist across different layer types
const COMMON_FALLBACK_FIELDS = [
  'NAME', 'FACILITY_NAME', 'SITE_NAME', 'LOCATION_NAME',
  'ADDRESS', 'STREET', 'FULL_ADDRESS',
  'CITY', 'TOWN', 'MUNICIPALITY',
  'STATE', 'STATE_ABBR', 'ST',
  'ZIP', 'ZIPCODE', 'POSTAL_CODE',
  'PHONE', 'TELEPHONE', 'CONTACT',
  'TYPE', 'CATEGORY', 'CLASS',
  'OWNER', 'OPERATOR', 'AGENCY',
  'STATUS', 'CONDITION',
  'DESCRIPTION', 'COMMENTS', 'NOTES'
]

const MapView = forwardRef<MapViewRef, MapViewProps>(function MapView({ layers }, ref) {
  const mapDiv = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const viewInstance = useRef<any>(null)
  const layerRefs = useRef<Map<string, any>>(new Map())

  // Expose the view instance through ref
  useImperativeHandle(ref, () => ({
    getView: () => viewInstance.current
  }))

  // Detect layer type based on name
  const detectLayerType = (layerName: string): string => {
    const name = layerName.toLowerCase()
    
    for (const [type, config] of Object.entries(LAYER_TYPE_CONFIGS)) {
      if (config.keywords.some(keyword => name.includes(keyword))) {
        return type
      }
    }
    
    return 'infrastructure' // default fallback
  }

  // Create intelligent popup template
  const createPopupTemplate = (layer: Layer) => {
    const layerType = detectLayerType(layer.name)
    const config = LAYER_TYPE_CONFIGS[layerType]
    
    return {
      title: `{${config.titleField || 'NAME'}} - ${layer.name}`,
      content: (feature: any) => {
        const attributes = feature.graphic.attributes
        const availableFields = Object.keys(attributes)
        
        // Get display fields that actually exist in the feature
        const fieldsToShow = config.displayFields.filter(field => 
          availableFields.some(availableField => 
            availableField.toUpperCase() === field.toUpperCase()
          )
        )
        
        // If no configured fields exist, use common fallback fields
        if (fieldsToShow.length === 0) {
          fieldsToShow.push(...COMMON_FALLBACK_FIELDS.filter(field =>
            availableFields.some(availableField =>
              availableField.toUpperCase() === field.toUpperCase()
            )
          ))
        }
        
        // Create content HTML
        let content = `<div style="max-width: 400px;">
          <div style="background: #f5f5f5; padding: 8px; margin-bottom: 12px; border-radius: 4px;">
            <strong>Layer:</strong> ${layer.name}<br>
            <strong>Agency:</strong> ${layer.agency}
          </div>`
        
        if (fieldsToShow.length > 0) {
          content += '<div style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px; align-items: start;">'
          
          fieldsToShow.slice(0, 12).forEach(field => { // Limit to 12 fields to avoid overwhelming
            // Find the actual field name (case-insensitive match)
            const actualField = availableFields.find(af => 
              af.toUpperCase() === field.toUpperCase()
            )
            
            if (actualField && attributes[actualField] != null && attributes[actualField] !== '') {
              const value = attributes[actualField]
              const displayName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
              
              content += `
                <div style="font-weight: bold; color: #666;">${displayName}:</div>
                <div style="word-break: break-word;">${formatFieldValue(value, field)}</div>
              `
            }
          })
          
          content += '</div>'
        } else {
          // If no meaningful fields found, show some basic info
          content += '<div style="color: #666; font-style: italic;">Additional details not available for this feature.</div>'
          
          // Show geometry type information
          const geom = feature.graphic.geometry
          if (geom) {
            content += `<div style="margin-top: 8px; font-size: 0.9em; color: #888;">
              Geometry: ${geom.type === 'point' ? 'Point Location' : 
                         geom.type === 'polygon' ? 'Area/Boundary' : 
                         geom.type === 'polyline' ? 'Line/Route' : geom.type}
            </div>`
          }
        }
        
        content += '</div>'
        return content
      },
      fieldInfos: config.displayFields.map(field => ({
        fieldName: field,
        visible: true,
        label: field.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      }))
    }
  }

  // Format field values for better display
  const formatFieldValue = (value: any, fieldName: string): string => {
    if (value == null || value === '') return 'Not Available'
    
    const field = fieldName.toUpperCase()
    const strValue = String(value)
    
    // Format phone numbers
    if (field.includes('PHONE') || field.includes('TEL')) {
      const cleaned = strValue.replace(/\D/g, '')
      if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
      }
    }
    
    // Format URLs
    if (strValue.startsWith('http://') || strValue.startsWith('https://')) {
      return `<a href="${strValue}" target="_blank" rel="noopener noreferrer">Link</a>`
    }
    
    // Format email addresses
    if (strValue.includes('@') && strValue.includes('.')) {
      return `<a href="mailto:${strValue}">${strValue}</a>`
    }
    
    // Format numeric values with units
    if (!isNaN(Number(strValue)) && strValue !== '') {
      if (field.includes('HEIGHT') || field.includes('ELEVATION')) {
        return `${strValue} ft`
      }
      if (field.includes('CAPACITY') && Number(strValue) > 1000) {
        return Number(strValue).toLocaleString()
      }
      if (field.includes('AREA') && Number(strValue) > 100) {
        return `${Number(strValue).toLocaleString()} sq ft`
      }
    }
    
    // Truncate long text values
    if (strValue.length > 100) {
      return `${strValue.substring(0, 97)}...`
    }
    
    return strValue
  }

  useEffect(() => {
    // Add CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://js.arcgis.com/4.28/esri/themes/light/main.css'
    document.head.appendChild(link)

    // Load and initialize map
    const loadMap = async () => {
      const [Map, MapView] = await Promise.all([
        import('@arcgis/core/Map'),
        import('@arcgis/core/views/MapView')
      ])

      if (!mapDiv.current) return

      const map = new Map.default({
        basemap: 'streets-navigation-vector'
      })

      const view = new MapView.default({
        container: mapDiv.current,
        map: map,
        center: [-98.5795, 39.8283],
        zoom: 4
      })

      mapInstance.current = map
      viewInstance.current = view

      // Add widgets after view is ready
      view.when(async () => {
        const [Home, Search, Legend, Expand] = await Promise.all([
          import('@arcgis/core/widgets/Home'),
          import('@arcgis/core/widgets/Search'),
          import('@arcgis/core/widgets/Legend'),
          import('@arcgis/core/widgets/Expand')
        ])

        view.ui.add(new Home.default({ view }), 'top-left')
        view.ui.add(new Search.default({ view }), 'top-right')
        
        const legend = new Legend.default({ view })
        const legendExpand = new Expand.default({
          view: view,
          content: legend,
          expandIcon: 'legend'
        })
        view.ui.add(legendExpand, 'bottom-left')
      })
    }

    loadMap()

    return () => {
      if (viewInstance.current) {
        viewInstance.current.destroy()
      }
      document.head.removeChild(link)
    }
  }, [])

  // Handle layers separately
  useEffect(() => {
    if (!mapInstance.current) return

    const updateLayers = async () => {
      const [FeatureLayer] = await Promise.all([
        import('@arcgis/core/layers/FeatureLayer')
      ])

      // Remove old layers
      const currentNames = new Set(layers.map(l => l.name))
      layerRefs.current.forEach((layer, name) => {
        if (!currentNames.has(name)) {
          mapInstance.current.remove(layer)
          layerRefs.current.delete(name)
        }
      })

      // Add new layers with intelligent popups
      for (const layer of layers) {
        if (!layer.serviceUrl || layerRefs.current.has(layer.name)) continue

        const featureLayer = new FeatureLayer.default({
          url: layer.serviceUrl,
          title: layer.name,
          popupTemplate: createPopupTemplate(layer)
        })

        mapInstance.current.add(featureLayer)
        layerRefs.current.set(layer.name, featureLayer)
      }
    }

    updateLayers()
  }, [layers])

  return <div ref={mapDiv} style={{ height: '100%', width: '100%' }} />
})

export default MapView