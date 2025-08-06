'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { Layer } from '@/lib/search'

interface MapViewProps {
  layers: Layer[]
}

const MapView = forwardRef<any, MapViewProps>(({ layers }, ref) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<any>(null)
  const mapLoadedRef = useRef(false)
  const layersRef = useRef<Map<string, any>>(new Map())

  // Expose view ref to parent for export functionality
  useImperativeHandle(ref, () => viewRef.current)

  // Initialize map only once
  useEffect(() => {
    if (mapLoadedRef.current || !mapRef.current) return
    
    console.log('Starting map initialization...')
    
    const initMap = async () => {
      try {
        // Dynamically load CSS
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://js.arcgis.com/4.28/@arcgis/core/assets/esri/themes/light/main.css'
        document.head.appendChild(link)

        // Load ArcGIS modules
        const [Map, MapView, esriConfig, BasemapGallery, Expand] = await Promise.all([
          import('@arcgis/core/Map'),
          import('@arcgis/core/views/MapView'),
          import('@arcgis/core/config'),
          import('@arcgis/core/widgets/BasemapGallery'),
          import('@arcgis/core/widgets/Expand')
        ])

        console.log('ArcGIS modules loaded')

        // Set API key
        if (process.env.NEXT_PUBLIC_ARCGIS_API_KEY) {
          esriConfig.default.apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY
        }

        // Create map with dark basemap
        const map = new Map.default({
          basemap: 'dark-gray-vector'
        })

        // Create view
        const view = new MapView.default({
          container: mapRef.current,
          map: map,
          center: [-98.5795, 39.8283], // Center of USA
          zoom: 4
        })

        viewRef.current = view
        mapLoadedRef.current = true

        await view.when()
        console.log('Map view ready')

        // Add widgets
        const [Home, Search, Legend] = await Promise.all([
          import('@arcgis/core/widgets/Home'),
          import('@arcgis/core/widgets/Search'),
          import('@arcgis/core/widgets/Legend')
        ])

        // Home button
        const homeBtn = new Home.default({
          view: view
        })
        view.ui.add(homeBtn, 'top-left')

        // Search widget
        const searchWidget = new Search.default({
          view: view
        })
        view.ui.add(searchWidget, 'top-right')

        // Basemap Gallery
        const basemapGallery = new BasemapGallery.default({
          view: view
        })
        const bgExpand = new Expand.default({
          view: view,
          content: basemapGallery,
          expandIcon: 'basemap',
          expandTooltip: 'Change Basemap'
        })
        view.ui.add(bgExpand, 'top-right')

        // Legend
        const legend = new Legend.default({
          view: view
        })
        const legendExpand = new Expand.default({
          expandIcon: 'legend',
          view: view,
          content: legend
        })
        view.ui.add(legendExpand, 'bottom-left')

        console.log('Widgets added')

      } catch (error) {
        console.error('Failed to initialize map:', error)
      }
    }

    initMap()

    // Cleanup
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
      }
    }
  }, [])

  // Handle layers
  useEffect(() => {
    if (!viewRef.current || !mapLoadedRef.current) return

    const updateLayers = async () => {
      try {
        const [FeatureLayer, SimpleRenderer, SimpleMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol] = await Promise.all([
          import('@arcgis/core/layers/FeatureLayer'),
          import('@arcgis/core/renderers/SimpleRenderer'),
          import('@arcgis/core/symbols/SimpleMarkerSymbol'),
          import('@arcgis/core/symbols/SimpleFillSymbol'),
          import('@arcgis/core/symbols/SimpleLineSymbol')
        ])

        // Remove old layers
        const currentLayerNames = new Set(layers.map(l => l.name))
        layersRef.current.forEach((layer, name) => {
          if (!currentLayerNames.has(name)) {
            viewRef.current.map.remove(layer)
            layersRef.current.delete(name)
          }
        })

        // Add new layers
        for (const layer of layers) {
          if (!layer.serviceUrl || layersRef.current.has(layer.name)) continue

          try {
            console.log(`Adding layer: ${layer.name}`)
            
            // Create feature layer with proper popup
            const featureLayer = new FeatureLayer.default({
              url: layer.serviceUrl,
              title: layer.name,
              outFields: ['*'],
              popupEnabled: true,
              popupTemplate: {
                title: '{*}', // This will use the first available field
                content: async (feature: any) => {
                  const attributes = feature.graphic.attributes
                  let content = '<div style="padding: 10px;">'
                  
                  // Add all non-null attributes
                  for (const [key, value] of Object.entries(attributes)) {
                    if (value && value !== 'null' && 
                        !key.startsWith('OBJECTID') && 
                        !key.startsWith('Shape') &&
                        !key.startsWith('FID')) {
                      // Format dates
                      let displayValue = value
                      if (key.toLowerCase().includes('date') && typeof value === 'number') {
                        displayValue = new Date(value).toLocaleDateString()
                      }
                      content += `<p><strong>${key}:</strong> ${displayValue}</p>`
                    }
                  }
                  
                  content += `<hr><p style="color: #666; font-size: 12px;">Layer: ${layer.name}<br>Agency: ${layer.agency}</p>`
                  content += '</div>'
                  return content
                }
              }
            })

            // Add layer and wait for it to load
            viewRef.current.map.add(featureLayer)
            await featureLayer.when()
            
            // Now check geometry type and update renderer
            const geometryType = featureLayer.geometryType
            console.log(`Layer ${layer.name} geometry type: ${geometryType}`)
            
            if (geometryType === 'polygon') {
              featureLayer.renderer = new SimpleRenderer.default({
                symbol: new SimpleFillSymbol.default({
                  color: [51, 122, 183, 0.4],
                  outline: {
                    color: [51, 122, 183, 1],
                    width: 2
                  }
                })
              })
            } else if (geometryType === 'polyline') {
              featureLayer.renderer = new SimpleRenderer.default({
                symbol: new SimpleLineSymbol.default({
                  color: [220, 38, 38, 1],
                  width: 3
                })
              })
            } else {
              featureLayer.renderer = new SimpleRenderer.default({
                symbol: new SimpleMarkerSymbol.default({
                  size: 10,
                  color: [220, 38, 38, 0.8],
                  outline: {
                    color: [255, 255, 255, 1],
                    width: 1.5
                  }
                })
              })
            }
            
            layersRef.current.set(layer.name, featureLayer)
            console.log(`Layer ${layer.name} added successfully`)
            
          } catch (error) {
            console.error(`Failed to add layer ${layer.name}:`, error)
          }
        }
      } catch (error) {
        console.error('Failed to update layers:', error)
      }
    }

    updateLayers()
  }, [layers])

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      {layers.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3>No layers selected</h3>
          <p>Search for infrastructure and add layers to the map</p>
        </div>
      )}
    </div>
  )
})

MapView.displayName = 'MapView'

export default MapView