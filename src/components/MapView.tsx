'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { Layer } from '@/lib/search'

interface MapViewProps {
  layers: Layer[]
}

export interface MapViewRef {
  getView: () => any
}

const MapView = forwardRef<MapViewRef, MapViewProps>(function MapView({ layers }, ref) {
  const mapDiv = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const viewInstance = useRef<any>(null)
  const layerRefs = useRef<Map<string, any>>(new Map())

  // Expose the view instance through ref
  useImperativeHandle(ref, () => ({
    getView: () => viewInstance.current
  }))

  // Create popup template that shows ALL raw fields with NO filtering
  const createPopupTemplate = (layer: Layer) => {
    return {
      title: `${layer.name} - RAW DATA VIEW`,
      content: (feature: any) => {
        const attributes = feature.graphic.attributes
        const allFields = Object.keys(attributes)
        
        // Sort all fields alphabetically for consistent display
        const sortedFields = allFields.sort()
        
        // Create content HTML - simple table format showing everything
        let content = `
          <div style="max-width: 600px; max-height: 700px; overflow-y: auto; font-family: monospace; font-size: 12px;">
            <div style="background: #dc3545; color: white; padding: 8px; margin: -10px -10px 15px -10px; text-align: center;">
              <div style="font-weight: bold;">RAW FEATURE DATA - ALL FIELDS SHOWN</div>
              <div style="font-size: 11px;">Layer: ${layer.name} | Source: ${layer.agency}</div>
              <div style="font-size: 11px;">Total Fields: ${sortedFields.length}</div>
            </div>
        `

        // Add debug section with raw attributes object
        content += `
          <div style="background: #f8f9fa; border: 2px solid #dc3545; border-radius: 4px; padding: 10px; margin-bottom: 15px;">
            <div style="font-weight: bold; color: #dc3545; margin-bottom: 8px;">🐛 DEBUG: Raw Attributes Object</div>
            <pre style="background: #ffffff; border: 1px solid #ddd; padding: 8px; border-radius: 2px; overflow-x: auto; font-size: 10px; white-space: pre-wrap; word-wrap: break-word;">${JSON.stringify(attributes, null, 2)}</pre>
          </div>
        `

        // Show ALL fields in simple table format
        if (sortedFields.length === 0) {
          content += `
            <div style="text-align: center; padding: 20px; color: #dc3545; font-weight: bold;">
              ERROR: No attributes found in feature!
            </div>
          `
        } else {
          content += `
            <div style="background: #ffffff; border: 1px solid #ddd; border-radius: 4px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                  <tr style="background: #f8f9fa;">
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; width: 40%;">Field Name (Raw)</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; width: 15%;">Type</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; width: 45%;">Value (Raw)</th>
                  </tr>
                </thead>
                <tbody>
          `

          // Add every single field - NO FILTERING
          sortedFields.forEach(field => {
            const value = attributes[field]
            const valueType = typeof value
            const displayValue = value === null ? 'NULL' : 
                               value === undefined ? 'UNDEFINED' : 
                               value === '' ? 'EMPTY_STRING' :
                               String(value)
            
            // Color coding based on value type/content
            let rowColor = '#ffffff'
            let valueColor = '#000000'
            
            if (value === null || value === undefined) {
              rowColor = '#fff3cd'  // Light yellow for null/undefined
              valueColor = '#856404'
            } else if (value === '') {
              rowColor = '#f8d7da'  // Light red for empty strings
              valueColor = '#721c24'
            } else if (field.toLowerCase().includes('objectid') || 
                      field.toLowerCase().includes('globalid') || 
                      field.toLowerCase().includes('shape_') || 
                      field.toLowerCase().includes('esri_')) {
              rowColor = '#e2e3e5'  // Light gray for system fields
              valueColor = '#383d41'
            }
            
            content += `
              <tr style="background: ${rowColor};">
                <td style="border: 1px solid #ddd; padding: 6px; font-weight: bold; color: #495057; word-break: break-all;">${field}</td>
                <td style="border: 1px solid #ddd; padding: 6px; color: #6c757d; font-style: italic;">${valueType}</td>
                <td style="border: 1px solid #ddd; padding: 6px; color: ${valueColor}; word-break: break-word; max-width: 200px;">${displayValue.length > 100 ? displayValue.substring(0, 97) + '...' : displayValue}</td>
              </tr>
            `
          })
          
          content += `
                </tbody>
              </table>
            </div>
          `
        }

        // Add geometry information (still useful for debugging)
        const geom = feature.graphic.geometry
        if (geom) {
          content += `
            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 10px; margin-top: 15px;">
              <div style="font-weight: bold; color: #155724; margin-bottom: 4px;">🗺️ Geometry Debug Info</div>
              <div style="font-size: 11px; color: #155724;">
                <strong>Type:</strong> ${geom.type}<br>
                ${geom.type === 'point' ? `<strong>Longitude:</strong> ${geom.longitude}<br><strong>Latitude:</strong> ${geom.latitude}` : ''}
                ${geom.type === 'polygon' && geom.rings ? `<strong>Rings:</strong> ${geom.rings.length}<br><strong>Total Points:</strong> ${geom.rings.flat().length}` : ''}
                ${geom.type === 'polyline' && geom.paths ? `<strong>Paths:</strong> ${geom.paths.length}<br><strong>Total Points:</strong> ${geom.paths.flat().length}` : ''}
                <br><strong>Raw Geometry Object:</strong>
                <pre style="background: #ffffff; border: 1px solid #c3e6cb; padding: 4px; border-radius: 2px; overflow-x: auto; font-size: 10px; margin-top: 4px; white-space: pre-wrap;">${JSON.stringify(geom, null, 2)}</pre>
              </div>
            </div>
          `
        }

        content += '</div>'
        return content
      }
    }
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