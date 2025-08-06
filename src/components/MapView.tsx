'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Layer } from '@/lib/search'

interface MapViewProps {
  layers: Layer[]
}

const MapView = forwardRef<any, MapViewProps>(({ layers }, ref) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<any>(null)
  const layerRefsRef = useRef<Map<string, any>>(new Map())
  const [widgetsLoaded, setWidgetsLoaded] = useState(false)
  const [mapInitialized, setMapInitialized] = useState(false)

  // Expose the view reference to parent components
  useImperativeHandle(ref, () => viewRef.current)

  useEffect(() => {
    // Dynamically load ArcGIS CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://js.arcgis.com/4.28/@arcgis/core/assets/esri/themes/light/main.css'
    document.head.appendChild(link)

    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link)
      }
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || mapInitialized) return

    let isMounted = true

    const initializeMap = async () => {
      try {
        // Load core modules first
        const [Map, MapView, esriConfig, Extent] = await Promise.all([
          import('@arcgis/core/Map'),
          import('@arcgis/core/views/MapView'),
          import('@arcgis/core/config'),
          import('@arcgis/core/geometry/Extent'),
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

        // Define extent for continental US (excludes Alaska and Hawaii)
        const continentalUSExtent = new Extent.default({
          xmin: -130,
          ymin: 24,
          xmax: -65,
          ymax: 50,
          spatialReference: { wkid: 4326 }
        })

        const view = new MapView.default({
          container: mapRef.current!,
          map: map,
          extent: continentalUSExtent, // Use extent instead of center/zoom
          constraints: {
            minZoom: 3,
            maxZoom: 18
          },
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
        setMapInitialized(true)

        // Wait for view to be ready
        await view.when()
        console.log('View ready')

        // Load widgets immediately after view is ready
        try {
          const [Home, Legend, Search, Expand] = await Promise.all([
            import('@arcgis/core/widgets/Home'),
            import('@arcgis/core/widgets/Legend'),
            import('@arcgis/core/widgets/Search'),
            import('@arcgis/core/widgets/Expand'),
          ])

          if (!isMounted) return

          // Add Home widget with continental US extent
          const homeWidget = new Home.default({
            view: view,
            viewpoint: {
              targetGeometry: continentalUSExtent
            }
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
            expandIcon: "legend",
            expandTooltip: "Show Map Legend",
            view: view,
            content: legend,
            expanded: false,
            group: "bottom-left"
          })
          view.ui.add(legendExpand, 'bottom-left')
          console.log('Legend widget added')

          setWidgetsLoaded(true)
        } catch (error) {
          console.error('Failed to load widgets:', error)
          // Set to true anyway to hide the loading message
          setWidgetsLoaded(true)
        }

        // Add click event to show coordinates if no features found
        view.on('click', (event: any) => {
          console.log('Map clicked at:', event.mapPoint.longitude, event.mapPoint.latitude)
        })
      } catch (error) {
        console.error('Failed to initialize map:', error)
        setMapInitialized(true) // Prevent infinite retries
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
  }, [mapInitialized])

  useEffect(() => {
    if (!viewRef.current || !mapInitialized) return

    const updateLayers = async () => {
      try {
        const [FeatureLayer, SimpleRenderer, SimpleMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol] = await Promise.all([
          import('@arcgis/core/layers/FeatureLayer'),
          import('@arcgis/core/renderers/SimpleRenderer'),
          import('@arcgis/core/symbols/SimpleMarkerSymbol'),
          import('@arcgis/core/symbols/SimpleFillSymbol'),
          import('@arcgis/core/symbols/SimpleLineSymbol')
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
            // Try to guess geometry type from layer name
            let renderer
            const lowerName = layer.name.toLowerCase()
            
            if (lowerName.includes('boundary') || lowerName.includes('area') || 
                lowerName.includes('zone') || lowerName.includes('perimeter') ||
                lowerName.includes('polygon') || lowerName.includes('district')) {
              // Likely a polygon layer
              renderer = new SimpleRenderer.default({
                symbol: new SimpleFillSymbol.default({
                  color: [220, 38, 38, 0.3],
                  outline: {
                    color: [220, 38, 38, 1],
                    width: 2
                  }
                })
              })
            } else if (lowerName.includes('road') || lowerName.includes('route') || 
                       lowerName.includes('rail') || lowerName.includes('line') ||
                       lowerName.includes('pipeline') || lowerName.includes('transmission')) {
              // Likely a line layer
              renderer = new SimpleRenderer.default({
                symbol: new SimpleLineSymbol.default({
                  color: [220, 38, 38, 1],
                  width: 3
                })
              })
            } else {
              // Default to points
              renderer = new SimpleRenderer.default({
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

            // Create feature layer with guessed renderer
            const featureLayer = new FeatureLayer.default({
              url: layer.serviceUrl,
              title: layer.name,
              popupEnabled: true,
              outFields: ["*"],
              popupTemplate: {
                title: layer.name,
                content: `<p>Layer: ${layer.name}</p><p>Agency: ${layer.agency}</p><p>{*}</p>`
              },
              renderer: renderer
            })

            // After layer loads, update renderer if our guess was wrong
            featureLayer.on("layerview-create", (event) => {
              const layerView = event.layerView
              const actualGeometryType = featureLayer.geometryType
              
              if (actualGeometryType) {
                console.log(`Layer ${layer.name} actual geometry: ${actualGeometryType}`)
                
                // Update renderer if needed
                if (actualGeometryType === 'polygon' && !lowerName.includes('boundary')) {
                  featureLayer.renderer = new SimpleRenderer.default({
                    symbol: new SimpleFillSymbol.default({
                      color: [220, 38, 38, 0.3],
                      outline: {
                        color: [220, 38, 38, 1],
                        width: 2
                      }
                    })
                  })
                } else if (actualGeometryType === 'polyline' && !lowerName.includes('road')) {
                  featureLayer.renderer = new SimpleRenderer.default({
                    symbol: new SimpleLineSymbol.default({
                      color: [220, 38, 38, 1],
                      width: 3
                    })
                  })
                }
              }
            })

            // Add error handling
            featureLayer.on("layerview-create-error", (event) => {
              console.error(`Layer failed to create view: ${layer.name}`, event.error)
            })

            // Add the layer immediately
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
  }, [layers, mapInitialized])

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
})

MapView.displayName = 'MapView'

export default MapView