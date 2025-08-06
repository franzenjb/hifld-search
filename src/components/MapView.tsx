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
  const [mapReady, setMapReady] = useState(false)

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
    if (!mapRef.current || viewRef.current) return

    const initializeMap = async () => {
      try {
        // Load core modules
        const [Map, MapView, esriConfig] = await Promise.all([
          import('@arcgis/core/Map'),
          import('@arcgis/core/views/MapView'),
          import('@arcgis/core/config')
        ])

        // Configure API key
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
          center: [-95, 38], // Center of US
          zoom: 4
        })

        viewRef.current = view
        
        await view.when()
        setMapReady(true)

        // Load widgets
        const [Home, Legend, Search, Expand] = await Promise.all([
          import('@arcgis/core/widgets/Home'),
          import('@arcgis/core/widgets/Legend'),
          import('@arcgis/core/widgets/Search'),
          import('@arcgis/core/widgets/Expand')
        ])

        // Add widgets
        const homeWidget = new Home.default({ view })
        view.ui.add(homeWidget, 'top-left')

        const searchWidget = new Search.default({ view })
        view.ui.add(searchWidget, 'top-right')

        const legend = new Legend.default({ view })
        const legendExpand = new Expand.default({
          expandIcon: "legend",
          view: view,
          content: legend
        })
        view.ui.add(legendExpand, 'bottom-left')

      } catch (error) {
        console.error('Failed to initialize map:', error)
      }
    }

    initializeMap()

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!viewRef.current || !mapReady) return

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
            // Guess geometry type from name
            const lowerName = layer.name.toLowerCase()
            let renderer
            
            if (lowerName.includes('boundary') || lowerName.includes('area') || 
                lowerName.includes('zone') || lowerName.includes('perimeter')) {
              renderer = new SimpleRenderer.default({
                symbol: new SimpleFillSymbol.default({
                  color: [220, 38, 38, 0.3],
                  outline: { color: [220, 38, 38, 1], width: 2 }
                })
              })
            } else if (lowerName.includes('road') || lowerName.includes('route') || 
                       lowerName.includes('rail') || lowerName.includes('line')) {
              renderer = new SimpleRenderer.default({
                symbol: new SimpleLineSymbol.default({
                  color: [220, 38, 38, 1],
                  width: 3
                })
              })
            } else {
              renderer = new SimpleRenderer.default({
                symbol: new SimpleMarkerSymbol.default({
                  size: 10,
                  color: [220, 38, 38, 0.8],
                  outline: { color: [255, 255, 255, 1], width: 1.5 }
                })
              })
            }

            const featureLayer = new FeatureLayer.default({
              url: layer.serviceUrl,
              title: layer.name,
              popupEnabled: true,
              outFields: ["*"],
              popupTemplate: {
                title: layer.name,
                content: `<p>Layer: {name}</p><p>Agency: ${layer.agency}</p>`
              },
              renderer: renderer
            })

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
  }, [layers, mapReady])

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="map-container" style={{ height: '100%', width: '100%' }} />
      
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="text-lg font-semibold mb-2">Loading map...</div>
            <div className="text-sm text-gray-600">Initializing ArcGIS map</div>
          </div>
        </div>
      )}
      
      {mapReady && layers.length === 0 && (
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