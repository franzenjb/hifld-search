'use client'

import { useEffect, useRef } from 'react'
import { Layer } from '@/lib/search'

interface MapViewProps {
  layers: Layer[]
}

export default function MapView({ layers }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<any>(null)
  const layerRefsRef = useRef<Map<string, any>>(new Map())

  useEffect(() => {
    // Dynamically load ArcGIS CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://js.arcgis.com/4.28/@arcgis/core/assets/esri/themes/light/main.css'
    document.head.appendChild(link)

    return () => {
      document.head.removeChild(link)
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return

    let isMounted = true

    const initializeMap = async () => {
      try {
        const [Map, MapView, FeatureLayer, Basemap, esriConfig, Home, Legend, Search, Expand] = await Promise.all([
          import('@arcgis/core/Map'),
          import('@arcgis/core/views/MapView'),
          import('@arcgis/core/layers/FeatureLayer'),
          import('@arcgis/core/Basemap'),
          import('@arcgis/core/config'),
          import('@arcgis/core/widgets/Home'),
          import('@arcgis/core/widgets/Legend'),
          import('@arcgis/core/widgets/Search'),
          import('@arcgis/core/widgets/Expand'),
        ])

        if (!isMounted) return

        // Configure API key if available
        const apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY
        if (apiKey) {
          esriConfig.default.apiKey = apiKey
        }

        const map = new Map.default({
          basemap: 'streets-navigation-vector'
        })

        const view = new MapView.default({
          container: mapRef.current!,
          map: map,
          center: [-98.5795, 39.8283], // Center of USA
          zoom: 4,
          popup: {
            dockEnabled: true,
            dockOptions: {
              buttonEnabled: false,
              position: 'bottom-right',
              breakpoint: false
            }
          }
        })

        // Wait for view to be ready
        await view.when()
        console.log('View ready, adding widgets...')

        // Add Home widget
        const homeWidget = new Home.default({
          view: view
        })
        view.ui.add(homeWidget, 'top-left')
        console.log('Home widget added')

        // Add Search widget
        const searchWidget = new Search.default({
          view: view,
          includeDefaultSources: true,
          locationEnabled: false,
          popupEnabled: false
        })
        view.ui.add(searchWidget, {
          position: 'top-right',
          index: 0
        })
        console.log('Search widget added')

        // Add Legend widget inside an Expand widget
        const legend = new Legend.default({
          view: view
        })
        const legendExpand = new Expand.default({
          expandIconClass: "esri-icon-layer-list",
          expandTooltip: "Legend",
          view: view,
          content: legend,
          expanded: false
        })
        view.ui.add(legendExpand, 'bottom-left')
        console.log('Legend widget added')

        viewRef.current = view

        // Add click event to show coordinates if no features found
        view.on('click', (event: any) => {
          console.log('Map clicked at:', event.mapPoint.longitude, event.mapPoint.latitude)
        })
      } catch (error) {
        console.error('Failed to initialize map:', error)
      }
    }

    initializeMap()

    return () => {
      isMounted = false
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!viewRef.current) return

    const updateLayers = async () => {
      try {
        const [FeatureLayer, PopupTemplate, SimpleRenderer, SimpleMarkerSymbol, SimpleFillSymbol] = await Promise.all([
          import('@arcgis/core/layers/FeatureLayer'),
          import('@arcgis/core/PopupTemplate'),
          import('@arcgis/core/renderers/SimpleRenderer'),
          import('@arcgis/core/symbols/SimpleMarkerSymbol'),
          import('@arcgis/core/symbols/SimpleFillSymbol')
        ])
        
        // Get current layer names
        const currentLayerNames = new Set(layers.map(l => l.name))
        
        // Remove layers that are no longer selected
        layerRefsRef.current.forEach((layerRef, layerName) => {
          if (!currentLayerNames.has(layerName)) {
            viewRef.current.map.remove(layerRef)
            layerRefsRef.current.delete(layerName)
          }
        })

        // Add new layers
        for (const layer of layers) {
          if (!layer.serviceUrl || layerRefsRef.current.has(layer.name)) continue

          try {
            // Create custom popup template with simple content
            const popupTemplate = new PopupTemplate.default({
              title: layer.name,
              content: (feature: any) => {
                const attributes = feature.graphic.attributes
                console.log('Popup triggered for attributes:', attributes)
                
                // Get the best available title
                const possibleTitleFields = ['NAME', 'name', 'FACILITY_NAME', 'facility_name', 
                                           'SITE_NAME', 'site_name', 'FACNAME', 'facname',
                                           'FIRE_NAME', 'fire_name', 'INCIDENT_NAME', 'incident_name']
                
                let title = layer.name
                for (const field of possibleTitleFields) {
                  if (attributes[field]) {
                    title = attributes[field]
                    break
                  }
                }
                
                // Create simple table for attributes
                let content = `<div style="padding: 10px;">
                  <h3 style="margin: 0 0 10px 0;">${title}</h3>
                  <p><strong>Layer:</strong> ${layer.name}</p>
                  <p><strong>Agency:</strong> ${layer.agency}</p>
                  <hr style="margin: 10px 0;">
                  <table style="width: 100%;">
                `
                
                // Add key attributes
                const importantFields = ['ADDRESS', 'CITY', 'STATE', 'ZIP', 'PHONE', 'WEBSITE', 
                                       'STATUS', 'TYPE', 'CATEGORY', 'OWNER', 'OPERATOR', 'COUNTY',
                                       'ACRES', 'AREA', 'PERIMETER', 'DATE', 'START_DATE', 'END_DATE']
                
                let displayedCount = 0
                const displayedFields = new Set<string>()
                
                // Show important fields first
                for (const field of importantFields) {
                  const variations = [field, field.toLowerCase(), field.replace(/_/g, '')]
                  for (const variant of variations) {
                    if (attributes[variant] && !displayedFields.has(variant)) {
                      const value = attributes[variant]
                      if (value && value !== 'null' && value !== 'NULL' && value !== 'Null') {
                        displayedFields.add(variant)
                        content += `
                          <tr>
                            <td style="padding: 4px; font-weight: bold;">${field.replace(/_/g, ' ')}:</td>
                            <td style="padding: 4px;">${value}</td>
                          </tr>
                        `
                        displayedCount++
                        break
                      }
                    }
                  }
                }
                
                // If we haven't shown enough fields, add some more
                if (displayedCount < 5) {
                  for (const [key, value] of Object.entries(attributes)) {
                    if (displayedCount >= 8) break
                    if (value && value !== 'null' && value !== 'NULL' && 
                        !key.startsWith('OBJECTID') && !key.startsWith('Shape') &&
                        !key.startsWith('FID') && !displayedFields.has(key)) {
                      content += `
                        <tr>
                          <td style="padding: 4px; font-weight: bold;">${key.replace(/_/g, ' ')}:</td>
                          <td style="padding: 4px;">${value}</td>
                        </tr>
                      `
                      displayedCount++
                    }
                  }
                }
                
                content += `
                  </table>
                  <p style="margin-top: 10px; font-size: 12px; color: #666;">
                    Total attributes: ${Object.keys(attributes).length}
                  </p>
                </div>`
                
                return content
              },
              outFields: ["*"]
            })

            // First, create a basic feature layer to check geometry type
            const tempLayer = new FeatureLayer.default({
              url: layer.serviceUrl,
              outFields: ["*"]
            })

            // Load the layer to get its properties
            await tempLayer.load()
            const geometryType = tempLayer.geometryType
            console.log(`Layer ${layer.name} loaded, geometry type:`, geometryType)

            // Create appropriate renderer based on geometry type
            let renderer
            if (geometryType === 'point') {
              renderer = new SimpleRenderer.default({
                symbol: new SimpleMarkerSymbol.default({
                  size: 10,
                  color: [51, 122, 183, 0.8],
                  outline: {
                    color: [255, 255, 255, 1],
                    width: 2
                  }
                })
              })
            } else if (geometryType === 'polygon') {
              renderer = new SimpleRenderer.default({
                symbol: new SimpleFillSymbol.default({
                  color: [51, 122, 183, 0.4],
                  outline: {
                    color: [51, 122, 183, 1],
                    width: 2
                  }
                })
              })
            }

            const featureLayer = new FeatureLayer.default({
              url: layer.serviceUrl,
              title: layer.name,
              popupEnabled: true,
              popupTemplate: popupTemplate,
              outFields: ["*"],
              renderer: renderer
            })

            viewRef.current.map.add(featureLayer)
            layerRefsRef.current.set(layer.name, featureLayer)
            console.log(`Layer ${layer.name} added to map`)
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
    <div className="relative h-full w-full">
      <div ref={mapRef} className="map-container" />
      
      {layers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white bg-opacity-90 p-8 rounded-lg shadow-lg text-center">
            <h3 className="text-xl font-semibold mb-2">No layers selected</h3>
            <p className="text-gray-600">Search for infrastructure and add layers to the map</p>
          </div>
        </div>
      )}
    </div>
  )
}