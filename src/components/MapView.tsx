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
        })

        viewRef.current = view

        // Wait for view to be ready
        await view.when()
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
        const FeatureLayer = (await import('@arcgis/core/layers/FeatureLayer')).default
        
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
            const featureLayer = new FeatureLayer({
              url: layer.serviceUrl,
              title: layer.name,
              popupEnabled: true,
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