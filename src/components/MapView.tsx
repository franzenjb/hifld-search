'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { Layer } from '@/lib/search'

interface MapViewProps {
  layers: Layer[]
}

export interface MapViewRef {
  getView: () => any
}

// Field grouping and categorization for better organization
interface FieldCategory {
  name: string
  keywords: string[]
  priority: number
}

const FIELD_CATEGORIES: FieldCategory[] = [
  {
    name: 'Identification',
    keywords: ['name', 'id', 'code', 'number', 'callsign', 'facility', 'site', 'location', 'title'],
    priority: 1
  },
  {
    name: 'Location & Address',
    keywords: ['address', 'street', 'city', 'state', 'zip', 'postal', 'county', 'lat', 'lon', 'coord', 'x', 'y'],
    priority: 2
  },
  {
    name: 'Contact Information',
    keywords: ['phone', 'tel', 'fax', 'email', 'contact', 'website', 'url', 'web'],
    priority: 3
  },
  {
    name: 'Classification & Type',
    keywords: ['type', 'class', 'category', 'kind', 'classification', 'level', 'grade', 'status'],
    priority: 4
  },
  {
    name: 'Organizational',
    keywords: ['owner', 'operator', 'agency', 'organization', 'company', 'authority', 'department', 'branch', 'unit'],
    priority: 5
  },
  {
    name: 'Temporal Information',
    keywords: ['date', 'time', 'year', 'created', 'modified', 'updated', 'start', 'end', 'built', 'established'],
    priority: 6
  },
  {
    name: 'Physical Characteristics',
    keywords: ['height', 'elevation', 'area', 'acres', 'capacity', 'size', 'length', 'width', 'depth', 'volume', 'beds', 'enrollment'],
    priority: 7
  },
  {
    name: 'Fire/Emergency Data',
    keywords: ['fire', 'incident', 'emergency', 'acres', 'contain', 'cause', 'percent', 'complex', 'gacc'],
    priority: 8
  },
  {
    name: 'Technical Specifications',
    keywords: ['frequency', 'power', 'voltage', 'bandwidth', 'signal', 'transmission', 'antenna', 'equipment'],
    priority: 9
  },
  {
    name: 'Administrative & Metadata',
    keywords: ['source', 'accuracy', 'quality', 'version', 'revision', 'method', 'datum', 'projection', 'scale'],
    priority: 10
  },
  {
    name: 'Additional Information',
    keywords: ['description', 'comment', 'note', 'remark', 'detail', 'info', 'misc', 'other'],
    priority: 11
  }
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

  // Categorize fields based on their names
  const categorizeField = (fieldName: string): string => {
    const name = fieldName.toLowerCase()
    
    for (const category of FIELD_CATEGORIES) {
      if (category.keywords.some(keyword => name.includes(keyword))) {
        return category.name
      }
    }
    
    return 'Additional Information' // default category
  }

  // Get priority for sorting categories
  const getCategoryPriority = (categoryName: string): number => {
    const category = FIELD_CATEGORIES.find(c => c.name === categoryName)
    return category ? category.priority : 99
  }

  // Create comprehensive popup template that shows ALL fields
  const createPopupTemplate = (layer: Layer) => {
    return {
      title: `${layer.name}`,
      content: (feature: any) => {
        const attributes = feature.graphic.attributes
        const allFields = Object.keys(attributes)
        
        // Filter out empty/null values and system fields
        const meaningfulFields = allFields.filter(field => {
          const value = attributes[field]
          // Skip if null, undefined, empty string, or common system fields
          if (value == null || value === '' || value === ' ') return false
          
          const fieldLower = field.toLowerCase()
          // Skip common system/geometry fields that aren't user-meaningful
          if (fieldLower.includes('objectid') || 
              fieldLower.includes('globalid') ||
              fieldLower.includes('shape_') ||
              fieldLower.includes('esri_') ||
              fieldLower === 'oid' ||
              fieldLower === 'fid') {
            return false
          }
          
          return true
        })

        // Group fields by category
        const fieldsByCategory: Record<string, string[]> = {}
        meaningfulFields.forEach(field => {
          const category = categorizeField(field)
          if (!fieldsByCategory[category]) {
            fieldsByCategory[category] = []
          }
          fieldsByCategory[category].push(field)
        })

        // Sort categories by priority
        const sortedCategories = Object.keys(fieldsByCategory).sort((a, b) => 
          getCategoryPriority(a) - getCategoryPriority(b)
        )

        // Create content HTML
        let content = `
          <div style="max-width: 500px; max-height: 600px; overflow-y: auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="background: linear-gradient(135deg, #2c5aa0 0%, #1e3a5f 100%); color: white; padding: 12px; margin: -10px -10px 15px -10px; border-radius: 6px 6px 0 0;">
              <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">📍 Feature Details</div>
              <div style="font-size: 13px; opacity: 0.9;">
                <strong>Layer:</strong> ${layer.name}<br>
                <strong>Source:</strong> ${layer.agency}
              </div>
            </div>
        `

        if (sortedCategories.length === 0) {
          content += `
            <div style="text-align: center; padding: 20px; color: #666; font-style: italic;">
              <div style="font-size: 48px; margin-bottom: 10px;">📋</div>
              No detailed information available for this feature.
            </div>
          `
        } else {
          // Add field count summary
          const totalFields = meaningfulFields.length
          content += `
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 8px; margin-bottom: 15px; font-size: 13px; color: #666;">
              📊 Showing <strong>${totalFields}</strong> data field${totalFields !== 1 ? 's' : ''} across <strong>${sortedCategories.length}</strong> categor${sortedCategories.length !== 1 ? 'ies' : 'y'}
            </div>
          `

          // Add each category with its fields
          sortedCategories.forEach((categoryName, categoryIndex) => {
            const categoryFields = fieldsByCategory[categoryName]
            
            // Get category icon
            const categoryIcon = getCategoryIcon(categoryName)
            
            content += `
              <div style="margin-bottom: 20px;">
                <div style="background: #f8f9fa; border-left: 4px solid #2c5aa0; padding: 8px 12px; margin-bottom: 10px; border-radius: 0 4px 4px 0;">
                  <div style="font-weight: bold; color: #2c5aa0; font-size: 14px;">
                    ${categoryIcon} ${categoryName} (${categoryFields.length})
                  </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px 12px; align-items: start; margin-left: 16px;">
            `

            // Sort fields within category alphabetically
            categoryFields.sort().forEach(field => {
              const value = attributes[field]
              const displayName = formatFieldName(field)
              const formattedValue = formatFieldValue(value, field)
              
              content += `
                <div style="font-weight: 600; color: #495057; font-size: 13px; padding: 4px 0;">
                  ${displayName}:
                </div>
                <div style="word-break: break-word; font-size: 13px; padding: 4px 0; line-height: 1.4;">
                  ${formattedValue}
                </div>
              `
            })

            content += '</div></div>'
          })
        }

        // Add geometry information
        const geom = feature.graphic.geometry
        if (geom) {
          content += `
            <div style="background: #e8f4fd; border: 1px solid #bee5eb; border-radius: 4px; padding: 10px; margin-top: 15px; font-size: 12px; color: #0c5460;">
              <div style="font-weight: bold; margin-bottom: 4px;">🗺️ Geometry Information</div>
              <div><strong>Type:</strong> ${formatGeometryType(geom.type)}</div>
              ${geom.type === 'point' ? `<div><strong>Coordinates:</strong> ${geom.longitude?.toFixed(6)}, ${geom.latitude?.toFixed(6)}</div>` : ''}
              ${geom.type === 'polygon' && geom.rings ? `<div><strong>Vertices:</strong> ${geom.rings.flat().length} points</div>` : ''}
              ${geom.type === 'polyline' && geom.paths ? `<div><strong>Vertices:</strong> ${geom.paths.flat().length} points</div>` : ''}
            </div>
          `
        }

        content += '</div>'
        return content
      }
    }
  }

  // Get icon for category
  const getCategoryIcon = (categoryName: string): string => {
    const icons: Record<string, string> = {
      'Identification': '🏷️',
      'Location & Address': '📍',
      'Contact Information': '📞',
      'Classification & Type': '📂',
      'Organizational': '🏢',
      'Temporal Information': '📅',
      'Physical Characteristics': '📏',
      'Fire/Emergency Data': '🔥',
      'Technical Specifications': '⚙️',
      'Administrative & Metadata': '📋',
      'Additional Information': '📝'
    }
    return icons[categoryName] || '📌'
  }

  // Format field names for display
  const formatFieldName = (fieldName: string): string => {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim()
  }

  // Format geometry type for display
  const formatGeometryType = (type: string): string => {
    const types: Record<string, string> = {
      'point': 'Point Location',
      'polygon': 'Area/Boundary',
      'polyline': 'Line/Route',
      'multipoint': 'Multiple Points'
    }
    return types[type] || type
  }

  // Enhanced field value formatting
  const formatFieldValue = (value: any, fieldName: string): string => {
    if (value == null || value === '' || value === ' ') return '<span style="color: #999; font-style: italic;">Not Available</span>'
    
    const field = fieldName.toUpperCase()
    const strValue = String(value).trim()
    
    // Handle boolean values
    if (typeof value === 'boolean' || strValue.toLowerCase() === 'true' || strValue.toLowerCase() === 'false') {
      const boolValue = typeof value === 'boolean' ? value : strValue.toLowerCase() === 'true'
      return `<span style="color: ${boolValue ? '#28a745' : '#dc3545'}; font-weight: bold;">${boolValue ? '✓ Yes' : '✗ No'}</span>`
    }

    // Format percentages
    if (field.includes('PERCENT') || (field.includes('CONTAIN') && !isNaN(Number(strValue)))) {
      const num = Number(strValue)
      if (!isNaN(num)) {
        const color = num >= 100 ? '#28a745' : num >= 75 ? '#ffc107' : '#dc3545'
        return `<span style="color: ${color}; font-weight: bold;">${num}%</span>`
      }
    }
    
    // Format areas and acres
    if (field.includes('ACRES') || (field.includes('AREA') && !field.includes('CODE'))) {
      const num = Number(strValue.replace(/,/g, ''))
      if (!isNaN(num)) {
        if (field.includes('ACRES')) {
          return `<strong>${num.toLocaleString()}</strong> <span style="color: #666;">acres</span>`
        } else {
          return `<strong>${num.toLocaleString()}</strong> <span style="color: #666;">sq ft</span>`
        }
      }
    }
    
    // Format dates with enhanced detection
    if (field.includes('DATE') || field.includes('TIME') || field.includes('YEAR')) {
      // Handle timestamp (milliseconds since epoch)
      if (/^\d{13}$/.test(strValue)) {
        const date = new Date(Number(strValue))
        return `<strong>${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>`
      }
      // Handle Unix timestamp (seconds since epoch)
      if (/^\d{10}$/.test(strValue)) {
        const date = new Date(Number(strValue) * 1000)
        return `<strong>${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>`
      }
      // Handle year only
      if (/^\d{4}$/.test(strValue) && Number(strValue) > 1800 && Number(strValue) <= new Date().getFullYear() + 10) {
        return `<strong>${strValue}</strong>`
      }
      // Handle other date formats
      const date = new Date(strValue)
      if (!isNaN(date.getTime()) && date.getFullYear() > 1800) {
        return `<strong>${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>`
      }
    }
    
    // Format phone numbers
    if (field.includes('PHONE') || field.includes('TEL') || field.includes('FAX')) {
      const cleaned = strValue.replace(/\D/g, '')
      if (cleaned.length === 10) {
        return `<a href="tel:${cleaned}" style="color: #2c5aa0; text-decoration: none; font-weight: bold;">📞 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}</a>`
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `<a href="tel:${cleaned}" style="color: #2c5aa0; text-decoration: none; font-weight: bold;">📞 ${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}</a>`
      }
    }
    
    // Format URLs and links
    if (strValue.toLowerCase().startsWith('http://') || strValue.toLowerCase().startsWith('https://')) {
      return `<a href="${strValue}" target="_blank" rel="noopener noreferrer" style="color: #2c5aa0; text-decoration: none; font-weight: bold;">🔗 View Link</a>`
    }
    
    // Format email addresses
    if (strValue.includes('@') && strValue.includes('.') && !strValue.includes(' ')) {
      return `<a href="mailto:${strValue}" style="color: #2c5aa0; text-decoration: none; font-weight: bold;">✉️ ${strValue}</a>`
    }
    
    // Format coordinates
    if ((field.includes('LAT') || field.includes('LON') || field.includes('COORD')) && !isNaN(Number(strValue))) {
      const num = Number(strValue)
      if (Math.abs(num) <= 180) {
        return `<code style="background: #f8f9fa; padding: 2px 4px; border-radius: 2px; font-family: monospace;">${num.toFixed(6)}°</code>`
      }
    }
    
    // Format heights and elevations
    if (field.includes('HEIGHT') || field.includes('ELEVATION')) {
      const num = Number(strValue.replace(/,/g, ''))
      if (!isNaN(num)) {
        return `<strong>${num.toLocaleString()}</strong> <span style="color: #666;">ft</span>`
      }
    }
    
    // Format capacities and large numbers
    if ((field.includes('CAPACITY') || field.includes('ENROLLMENT') || field.includes('BEDS')) && !isNaN(Number(strValue))) {
      const num = Number(strValue)
      if (num > 0) {
        return `<strong>${num.toLocaleString()}</strong>`
      }
    }
    
    // Format status fields with colors
    if (field.includes('STATUS') || field.includes('CONDITION')) {
      const status = strValue.toLowerCase()
      let color = '#6c757d' // default gray
      let icon = '⚪'
      
      if (status.includes('active') || status.includes('open') || status.includes('operational')) {
        color = '#28a745'
        icon = '🟢'
      } else if (status.includes('inactive') || status.includes('closed') || status.includes('non-operational')) {
        color = '#dc3545'
        icon = '🔴'
      } else if (status.includes('pending') || status.includes('under') || status.includes('construction')) {
        color = '#ffc107'
        icon = '🟡'
      }
      
      return `${icon} <span style="color: ${color}; font-weight: bold;">${strValue}</span>`
    }
    
    // Format codes and IDs
    if (field.includes('CODE') || field.includes('ID') || field.includes('NUMBER')) {
      return `<code style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; font-family: monospace; border: 1px solid #dee2e6;">${strValue}</code>`
    }
    
    // Handle very long text values
    if (strValue.length > 200) {
      const truncated = strValue.substring(0, 197) + '...'
      return `<div style="max-height: 60px; overflow-y: auto; background: #f8f9fa; padding: 8px; border-radius: 4px; border: 1px solid #dee2e6; font-size: 12px;">${truncated}</div>`
    }
    
    // Format numeric values
    if (!isNaN(Number(strValue)) && strValue !== '' && !field.includes('CODE') && !field.includes('ID')) {
      const num = Number(strValue)
      if (num > 1000) {
        return `<strong>${num.toLocaleString()}</strong>`
      }
    }
    
    // Default formatting with proper escaping
    const escaped = strValue.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<span>${escaped}</span>`
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
        const [Home, Search, Legend, BasemapGallery, Expand] = await Promise.all([
          import('@arcgis/core/widgets/Home'),
          import('@arcgis/core/widgets/Search'),
          import('@arcgis/core/widgets/Legend'),
          import('@arcgis/core/widgets/BasemapGallery'),
          import('@arcgis/core/widgets/Expand')
        ])

        view.ui.add(new Home.default({ view }), 'top-left')
        view.ui.add(new Search.default({ view }), 'top-right')
        
        // Add BasemapGallery widget
        const basemapGallery = new BasemapGallery.default({ 
          view: view,
          container: document.createElement('div')
        })
        const basemapExpand = new Expand.default({
          view: view,
          content: basemapGallery,
          expandIcon: 'basemap',
          expandTooltip: 'Change Basemap'
        })
        view.ui.add(basemapExpand, 'top-left')
        
        // Add Legend widget
        const legend = new Legend.default({ 
          view: view,
          style: {
            type: 'card',
            layout: 'auto'
          }
        })
        const legendExpand = new Expand.default({
          view: view,
          content: legend,
          expandIcon: 'legend',
          expandTooltip: 'Layer Legend',
          expanded: false,
          mode: 'floating'
        })
        view.ui.add(legendExpand, 'bottom-right')
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

      // Add new layers with comprehensive popups
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