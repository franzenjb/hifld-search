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
        const [Map, MapView, FeatureLayer, Basemap, esriConfig] = await Promise.all([
          import('@arcgis/core/Map'),
          import('@arcgis/core/views/MapView'),
          import('@arcgis/core/layers/FeatureLayer'),
          import('@arcgis/core/Basemap'),
          import('@arcgis/core/config'),
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

        viewRef.current = view

        // Wait for view to be ready
        await view.when()

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
        const [FeatureLayer, PopupTemplate, SimpleRenderer, SimpleMarkerSymbol] = await Promise.all([
          import('@arcgis/core/layers/FeatureLayer'),
          import('@arcgis/core/PopupTemplate'),
          import('@arcgis/core/renderers/SimpleRenderer'),
          import('@arcgis/core/symbols/SimpleMarkerSymbol')
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
            // Create custom popup template
            const popupTemplate = new PopupTemplate.default({
              title: "{NAME} {name} {FACILITY_NAME} {facility_name} {SITE_NAME} {site_name}",
              content: async (feature: any) => {
                const attributes = feature.graphic.attributes
                console.log('Popup triggered for attributes:', attributes)
                
                // Get the actual title
                const title = attributes.NAME || attributes.name || attributes.FACILITY_NAME || 
                             attributes.facility_name || attributes.SITE_NAME || attributes.site_name ||
                             attributes.FACNAME || attributes.facname || layer.name
                
                // Create a nicely formatted HTML content
                let content = `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 300px;">
                    <div style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827;">${title}</h3>
                      <p style="margin: 0; font-size: 14px; color: #6b7280;">
                        <strong>Layer:</strong> ${layer.name}
                      </p>
                      <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">
                        <strong>Agency:</strong> ${layer.agency}
                      </p>
                    </div>
                    <div style="padding: 12px 0;">
                `
                
                // Add key attributes in a clean format
                const importantFields = ['ADDRESS', 'CITY', 'STATE', 'ZIP', 'PHONE', 'WEBSITE', 
                                       'STATUS', 'TYPE', 'CATEGORY', 'OWNER', 'OPERATOR', 'COUNTY']
                
                let hasImportantFields = false
                let displayedFields = new Set(['NAME', 'name', 'FACILITY_NAME', 'facility_name', 
                                               'SITE_NAME', 'site_name', 'FACNAME', 'facname'])
                
                for (const field of importantFields) {
                  const fieldLower = field.toLowerCase()
                  const value = attributes[field] || attributes[fieldLower]
                  if (value && value !== 'null' && value !== 'NULL' && value !== 'Null') {
                    hasImportantFields = true
                    displayedFields.add(field)
                    displayedFields.add(fieldLower)
                    content += `
                      <p style="margin: 8px 0; font-size: 14px;">
                        <strong style="color: #374151;">${field.charAt(0) + field.slice(1).toLowerCase()}:</strong>
                        <span style="color: #4b5563; margin-left: 8px;">${value}</span>
                      </p>
                    `
                  }
                }
                
                // If no important fields found, show first 5 non-null attributes
                if (!hasImportantFields) {
                  let count = 0
                  for (const [key, value] of Object.entries(attributes)) {
                    if (count >= 5) break
                    if (value && value !== 'null' && value !== 'NULL' && 
                        !key.startsWith('OBJECTID') && !key.startsWith('Shape') &&
                        !key.startsWith('FID') && !displayedFields.has(key)) {
                      content += `
                        <p style="margin: 8px 0; font-size: 14px;">
                          <strong style="color: #374151;">${key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}:</strong>
                          <span style="color: #4b5563; margin-left: 8px;">${value}</span>
                        </p>
                      `
                      count++
                    }
                  }
                }
                
                content += `
                    </div>
                    <div style="padding: 12px 0; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                        Total attributes: ${Object.keys(attributes).length}
                      </p>
                    </div>
                  </div>
                `
                
                return content
              },
              outFields: ["*"]
            })

            // Create a more visible renderer for point features
            const renderer = new SimpleRenderer.default({
              symbol: new SimpleMarkerSymbol.default({
                size: 10,
                color: [51, 122, 183, 0.8],
                outline: {
                  color: [255, 255, 255, 1],
                  width: 2
                }
              })
            })

            const featureLayer = new FeatureLayer.default({
              url: layer.serviceUrl,
              title: layer.name,
              popupEnabled: true,
              popupTemplate: popupTemplate,
              outFields: ["*"], // Request all fields
              renderer: renderer // Make points more visible
            })

            // Wait for layer to load
            await featureLayer.load()
            console.log(`Layer ${layer.name} loaded, geometry type:`, featureLayer.geometryType)

            viewRef.current.map.add(featureLayer)
            layerRefsRef.current.set(layer.name, featureLayer)
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