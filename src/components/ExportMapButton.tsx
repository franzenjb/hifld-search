'use client'

import { useState, useEffect } from 'react'
import { Layer } from '@/lib/search'

interface ExportMapButtonProps {
  layers: Layer[]
  viewRef: any
}

export default function ExportMapButton({ layers, viewRef }: ExportMapButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [mapTitle, setMapTitle] = useState('')
  const [mapDescription, setMapDescription] = useState('')
  const [mapTags, setMapTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // Auto-populate fields when dialog opens or layers change
  useEffect(() => {
    if (showDialog && layers.length > 0) {
      // Auto-populate title if not already set
      if (!mapTitle) {
        const primaryLayer = layers[0].name
        const additionalCount = layers.length > 1 ? ` + ${layers.length - 1} more` : ''
        setMapTitle(`HIFLD Map: ${primaryLayer}${additionalCount}`)
      }

      // Auto-populate description if not already set
      if (!mapDescription) {
        const layerNames = layers.slice(0, 3).map(l => l.name).join(', ')
        const moreText = layers.length > 3 ? `, and ${layers.length - 3} more layers` : ''
        setMapDescription(`This map contains HIFLD infrastructure data including: ${layerNames}${moreText}. Data sources: ${Array.from(new Set(layers.map(l => l.agency))).join(', ')}.`)
      }

      // Auto-populate tags if not already set
      if (mapTags.length === 0) {
        const autoTags = new Set<string>(['HIFLD', 'Infrastructure'])
        
        // Add agency names as tags
        layers.forEach(layer => {
          if (layer.agency && layer.agency !== 'Unknown') {
            autoTags.add(layer.agency)
          }
        })

        // Add keywords from layer names
        const keywords = ['Fire', 'Hospital', 'School', 'Emergency', 'Police', 'Water', 'Power', 'Airport', 'EMS']
        layers.forEach(layer => {
          keywords.forEach(keyword => {
            if (layer.name.toLowerCase().includes(keyword.toLowerCase())) {
              autoTags.add(keyword)
            }
          })
        })

        // Limit to 10 most relevant tags
        const tagArray = Array.from(autoTags)
        setMapTags(tagArray.slice(0, 10))
      }
    }
  }, [showDialog, layers, mapTitle, mapDescription, mapTags.length])

  const handleAddTag = () => {
    if (tagInput.trim() && !mapTags.includes(tagInput.trim())) {
      setMapTags([...mapTags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setMapTags(mapTags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleExport = async () => {
    if (!viewRef || layers.length === 0) {
      alert('No layers to export')
      return
    }

    try {
      // Get current map extent and spatial reference
      const extent = viewRef.extent ? {
        xmin: viewRef.extent.xmin,
        ymin: viewRef.extent.ymin,
        xmax: viewRef.extent.xmax,
        ymax: viewRef.extent.ymax,
        spatialReference: {
          wkid: viewRef.extent.spatialReference?.wkid || 102100 // Web Mercator by default
        }
      } : null

      // Get current basemap
      const basemapId = viewRef.map?.basemap?.id || 'streets-navigation-vector'
      
      // Map our basemap IDs to ArcGIS basemap names
      const basemapMapping: Record<string, string> = {
        'streets-navigation-vector': 'streets-navigation-vector',
        'topo-vector': 'topo-vector',
        'satellite': 'satellite',
        'hybrid': 'hybrid',
        'gray-vector': 'gray-vector',
        'dark-gray-vector': 'dark-gray-vector',
        'oceans': 'oceans',
        'osm': 'osm'
      }

      // Create ArcGIS Web Map JSON format
      const webMapJson = {
        operationalLayers: layers.map((layer, index) => ({
          id: `layer_${index}`,
          title: layer.name,
          url: layer.serviceUrl,
          layerType: "ArcGISFeatureLayer",
          visibility: true,
          opacity: 1,
          // Add popup info if available
          popupInfo: {
            title: layer.name,
            description: `Source: ${layer.agency}`
          }
        })),
        baseMap: {
          baseMapLayers: [{
            id: "defaultBasemap",
            layerType: "ArcGISBasemapLayer",
            url: `https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer`,
            visibility: true,
            opacity: 1,
            title: "Basemap"
          }],
          title: basemapMapping[basemapId] || "Basemap"
        },
        spatialReference: extent?.spatialReference || { wkid: 102100 },
        initialState: {
          viewpoint: {
            targetGeometry: extent || {
              xmin: -14478840,
              ymin: 2761109,
              xmax: -7246958,
              ymax: 6525624,
              spatialReference: { wkid: 102100 }
            }
          }
        },
        authoringApp: "HIFLD Search Application",
        authoringAppVersion: "1.0",
        version: "2.26"
      }

      // Create the full item JSON that ArcGIS Online expects
      const itemJson = {
        title: mapTitle,
        snippet: mapDescription.substring(0, 250), // ArcGIS limits snippet to 250 chars
        description: mapDescription,
        tags: mapTags.join(','),
        type: "Web Map",
        typeKeywords: [
          "ArcGIS Online",
          "Explorer Web Map",
          "Map",
          "Online Map",
          "Web Map",
          "HIFLD"
        ],
        extent: extent ? [
          [extent.xmin, extent.ymin],
          [extent.xmax, extent.ymax]
        ] : [[-130, 24], [-65, 50]], // Continental US as fallback
        text: JSON.stringify(webMapJson)
      }

      // Create blob and download
      const blob = new Blob([JSON.stringify(itemJson, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      
      // Generate filename with date
      const date = new Date().toISOString().split('T')[0]
      a.download = `HIFLD_WebMap_${date}.json`
      
      a.href = url
      a.click()
      URL.revokeObjectURL(url)

      // Show success message with instructions
      alert(`Web Map exported successfully!\n\nTo import to ArcGIS Online:\n1. Go to https://ago-assistant.esri.com/\n2. Sign in with your ArcGIS account\n3. Click "I want to..." → "Add Item"\n4. Paste the contents of ${a.download}\n5. Select Type: "Web Map"\n6. Click "Add Item"`)
      
      // Close dialog
      setShowDialog(false)
    } catch (error) {
      console.error('Failed to export map:', error)
      alert('Failed to export map configuration')
    }
  }

  if (layers.length === 0) {
    return null
  }

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        title="Export map for ArcGIS Online"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export to ArcGIS
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Export Web Map for ArcGIS Online</h3>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">
                This will create a Web Map JSON file that you can import directly into ArcGIS Online
              </p>
              <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                <li>Download the JSON file</li>
                <li>Go to <span className="font-mono">ago-assistant.esri.com</span></li>
                <li>Sign in and click "Add Item"</li>
                <li>Paste the JSON and select Type: "Web Map"</li>
              </ol>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Map Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={mapTitle}
                  onChange={(e) => setMapTitle(e.target.value)}
                  placeholder="Enter a title for your map"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={mapDescription}
                  onChange={(e) => setMapDescription(e.target.value)}
                  placeholder="Describe what this map contains..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (for ArcGIS Online)
                </label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {mapTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-blue-600"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a tag..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Web Map will include:</p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>✓ All {layers.length} selected layers as operational layers</li>
                  <li>✓ Current map extent and spatial reference</li>
                  <li>✓ Layer visibility and popup configuration</li>
                  <li>✓ Metadata for ArcGIS Online item</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleExport}
                disabled={!mapTitle.trim() || !mapDescription.trim()}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  !mapTitle.trim() || !mapDescription.trim()
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                Download Web Map JSON
              </button>
              <button
                onClick={() => {
                  setShowDialog(false)
                  setMapTitle('')
                  setMapDescription('')
                  setMapTags([])
                  setTagInput('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}