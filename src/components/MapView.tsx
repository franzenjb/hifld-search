'use client'

import { useEffect, useRef } from 'react'
import { Layer } from '@/lib/search'

interface MapViewProps {
  layers: Layer[]
}

export default function MapView({ layers }: MapViewProps) {
  const mapDiv = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const viewInstance = useRef<any>(null)
  const layerRefs = useRef<Map<string, any>>(new Map())

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
        const [Home, Search, Legend, Expand] = await Promise.all([
          import('@arcgis/core/widgets/Home'),
          import('@arcgis/core/widgets/Search'),
          import('@arcgis/core/widgets/Legend'),
          import('@arcgis/core/widgets/Expand')
        ])

        view.ui.add(new Home.default({ view }), 'top-left')
        view.ui.add(new Search.default({ view }), 'top-right')
        
        const legend = new Legend.default({ view })
        const legendExpand = new Expand.default({
          view: view,
          content: legend,
          expandIcon: 'legend'
        })
        view.ui.add(legendExpand, 'bottom-left')
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

      // Add new layers
      for (const layer of layers) {
        if (!layer.serviceUrl || layerRefs.current.has(layer.name)) continue

        const featureLayer = new FeatureLayer.default({
          url: layer.serviceUrl,
          title: layer.name,
          popupTemplate: {
            title: layer.name,
            content: `{*}`
          }
        })

        mapInstance.current.add(featureLayer)
        layerRefs.current.set(layer.name, featureLayer)
      }
    }

    updateLayers()
  }, [layers])

  return <div ref={mapDiv} style={{ height: '100%', width: '100%' }} />
}