'use client'

import { useEffect, useRef } from 'react'
import { Layer } from '@/lib/search'

interface MapViewProps {
  layers: Layer[]
}

export default function MapView({ layers }: MapViewProps) {
  const mapDiv = useRef<HTMLDivElement>(null)
  const mapView = useRef<any>(null)

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

  return (
    <div className="h-full w-full bg-gray-100">
      <div ref={mapDiv} className="h-full w-full" />
    </div>
  )
}