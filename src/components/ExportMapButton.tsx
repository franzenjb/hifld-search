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
      // Get current map extent
      const extent = viewRef.extent ? {
        xmin: viewRef.extent.xmin,
        ymin: viewRef.extent.ymin,
        xmax: viewRef.extent.xmax,
        ymax: viewRef.extent.ymax,
        spatialReference: viewRef.extent.spatialReference?.wkid || 4326
      } : null

      // Get current basemap
      const basemap = viewRef.map?.basemap?.id || viewRef.map?.basemap?.title || 'streets-navigation-vector'

      // Create configuration object
      const mapConfig = {
        title: mapTitle,
        description: mapDescription,
        tags: mapTags,
        layers: layers.map(layer => ({
          name: layer.name,
          agency: layer.agency,
          serviceUrl: layer.serviceUrl,
          status: layer.status,
          duaRequired: layer.duaRequired,
          giiRequired: layer.giiRequired
        })),
        extent: extent,
        center: viewRef.center ? {
          longitude: viewRef.center.longitude,
          latitude: viewRef.center.latitude
        } : null,
        zoom: viewRef.zoom || 4,
        basemap: basemap,
        exportDate: new Date().toISOString(),
        version: '1.0'
      }

      // Create blob and download
      const blob = new Blob([JSON.stringify(mapConfig, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      
      // Generate filename with date and primary layer
      const date = new Date().toISOString().split('T')[0]
      const primaryLayer = layers[0].name.replace(/[^a-z0-9]/gi, '_').substring(0, 30)
      a.download = `HIFLD_Map_${primaryLayer}_${date}.json`
      
      a.href = url
      a.click()
      URL.revokeObjectURL(url)

      // Show success message
      alert(`Map configuration exported successfully!\n\nFile saved as: ${a.download}\n\nYou can later upload this to ArcGIS Online or share with colleagues.`)
      
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
        title="Export map configuration to file"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export Config
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Export Map Configuration</h3>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                This will download a JSON file with your map configuration that you can:
              </p>
              <ul className="list-disc list-inside text-sm text-blue-700 mt-2">
                <li>Upload to ArcGIS Online later</li>
                <li>Share with colleagues</li>
                <li>Use as a backup</li>
                <li>Import back into this app (future feature)</li>
              </ul>
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
                <p className="text-sm font-medium text-gray-700 mb-2">Configuration will include:</p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>✓ All {layers.length} selected layers with service URLs</li>
                  <li>✓ Current map view extent and zoom level</li>
                  <li>✓ Basemap selection</li>
                  <li>✓ Title, description, and tags for ArcGIS</li>
                  <li>✓ Export date and version</li>
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
                Download Configuration
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