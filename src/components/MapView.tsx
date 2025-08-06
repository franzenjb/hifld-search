'use client'

import { useEffect, useRef } from 'react'
import { Layer } from '@/lib/search'

interface MapViewProps {
  layers: Layer[]
}

export default function MapView({ layers }: MapViewProps) {
  const mapDiv = useRef<HTMLDivElement>(null)
  const mapView = useRef<any>(null)
  const layerRefs = useRef<Map<string, any>>(new Map())

  useEffect(() => {
    let view: any = null

    async function initializeMap() {
      if (!mapDiv.current) return

      try {
        console.log('1. Starting map initialization')
        
        // Add CSS
        if (!document.querySelector('link[href*="arcgis"]')) {
          const cssLink = document.createElement('link')
          cssLink.rel = 'stylesheet'
          cssLink.href = 'https://js.arcgis.com/4.28/@arcgis/core/assets/esri/themes/light/main.css'
          document.head.appendChild(cssLink)
          console.log('2. CSS link added')
        }

        // Load modules
        const [Map, MapView, esriConfig] = await Promise.all([
          import('@arcgis/core/Map'),
          import('@arcgis/core/views/MapView'),
          import('@arcgis/core/config')
        ])
        console.log('3. Modules loaded')

        // Set API key
        if (process.env.NEXT_PUBLIC_ARCGIS_API_KEY) {
          esriConfig.default.apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY
          console.log('4. API key set')
        }

        // Create map
        const map = new Map.default({
          basemap: 'topo-vector'
        })
        console.log('5. Map created')

        // Create view
        view = new MapView.default({
          container: mapDiv.current,
          map: map,
          center: [-98, 39],
          zoom: 4
        })
        console.log('6. View created')

        mapView.current = view

        await view.when()
        console.log('7. Map ready!')

        // Add widgets
        try {
          const [Home, Search, Legend, Expand] = await Promise.all([
            import('@arcgis/core/widgets/Home'),
            import('@arcgis/core/widgets/Search'),
            import('@arcgis/core/widgets/Legend'),
            import('@arcgis/core/widgets/Expand')
          ])

          // Home button
          const homeWidget = new Home.default({ view })
          view.ui.add(homeWidget, 'top-left')

          // Search widget
          const searchWidget = new Search.default({ view })
          view.ui.add(searchWidget, 'top-right')

          // Legend
          const legend = new Legend.default({ view })
          const legendExpand = new Expand.default({
            view: view,
            content: legend,
            expandIcon: 'legend'
          })
          view.ui.add(legendExpand, 'bottom-left')

          console.log('8. Widgets added')
        } catch (error) {
          console.error('Widget error:', error)
        }

      } catch (error) {
        console.error('CRITICAL MAP ERROR:', error)
      }
    }

    initializeMap()

    return () => {
      if (view) {
        view.destroy()
      }
    }
  }, [])

  // Handle layers
  useEffect(() => {
    if (!mapView.current) return

    async function updateLayers() {
      try {
        const [FeatureLayer] = await Promise.all([
          import('@arcgis/core/layers/FeatureLayer')
        ])

        // Remove old layers
        const currentNames = new Set(layers.map(l => l.name))
        layerRefs.current.forEach((layer, name) => {
          if (!currentNames.has(name)) {
            mapView.current.map.remove(layer)
            layerRefs.current.delete(name)
          }
        })

        // Add new layers
        for (const layer of layers) {
          if (!layer.serviceUrl || layerRefs.current.has(layer.name)) continue

          try {
            const featureLayer = new FeatureLayer.default({
              url: layer.serviceUrl,
              title: layer.name,
              outFields: ['*']
            })

            mapView.current.map.add(featureLayer)
            layerRefs.current.set(layer.name, featureLayer)
            console.log(`Added layer: ${layer.name}`)
          } catch (err) {
            console.error(`Failed to add layer ${layer.name}:`, err)
          }
        }
      } catch (error) {
        console.error('Failed to update layers:', error)
      }
    }

    updateLayers()
  }, [layers])

  return (
    <div className="h-full w-full bg-gray-100">
      <div ref={mapDiv} className="h-full w-full" />
    </div>
  )
}