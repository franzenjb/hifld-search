'use client'

import { useEffect, useRef, useState } from 'react'
import { Layer } from '@/lib/search'

interface MapViewProps {
  layers: Layer[]
}

export default function MapView({ layers }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<any>(null)
  const layerRefsRef = useRef<Map<string, any>>(new Map())
  const [widgetsLoaded, setWidgetsLoaded] = useState(false)

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
        // Load core modules first
        const [Map, MapView, esriConfig] = await Promise.all([
          import('@arcgis/core/Map'),
          import('@arcgis/core/views/MapView'),
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
        console.log('View ready')

        // Load and add widgets after view is ready
        setTimeout(async () => {
          try {
            const [Home, Legend, Search, Expand] = await Promise.all([
              import('@arcgis/core/widgets/Home'),
              import('@arcgis/core/widgets/Legend'),
              import('@arcgis/core/widgets/Search'),
              import('@arcgis/core/widgets/Expand'),
            ])

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
              expandIcon: "layer-list",
              expandTooltip: "Legend",
              view: view,
              content: legend,
              expanded: false
            })
            view.ui.add(legendExpand, 'bottom-left')
            console.log('Legend widget added')

            setWidgetsLoaded(true)
          } catch (error) {
            console.error('Failed to load widgets:', error)
          }
        }, 1000) // Delay widget loading

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
            // Create simple popup template
            const popupTemplate = new PopupTemplate.default({
              title: "{NAME} {name} {FACILITY_NAME} {facility_name} {SITE_NAME} {site_name}",
              content: [{
                type: "fields",
                fieldInfos: [
                  { fieldName: "*", label: "*" }
                ]
              }],
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
                  color: [220, 38, 38, 0.8], // Red color to match your EMS points
                  outline: {
                    color: [255, 255, 255, 1],
                    width: 1.5
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
      
      {!widgetsLoaded && layers.length > 0 && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 px-4 py-2 rounded shadow">
          <p className="text-sm text-gray-600">Loading map controls...</p>
        </div>
      )}
    </div>
  )
}