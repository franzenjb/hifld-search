'use client'

import { useState, useEffect } from 'react'
import { Layer } from '@/lib/search'

interface SaveMapButtonProps {
  layers: Layer[]
  viewRef: any
  className?: string
}

export default function SaveMapButton({ layers, viewRef, className = '' }: SaveMapButtonProps) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
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

        // Limit to 4 most relevant tags plus HIFLD
        const tagArray = Array.from(autoTags)
        setMapTags(tagArray.slice(0, 5))
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

  const handleSaveMap = async () => {
    if (!viewRef || layers.length === 0) {
      setMessage('No layers to save')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      // Dynamically import required modules
      const [WebMap, Portal] = await Promise.all([
        import('@arcgis/core/WebMap'),
        import('@arcgis/core/portal/Portal')
      ])

      // Create a portal instance (will trigger authentication)
      const portal = new Portal.default({
        url: 'https://www.arcgis.com',
        authMode: 'immediate' // This will prompt for login
      })

      // Load the portal (user must be authenticated)
      await portal.load()
      console.log('Portal loaded, user:', portal.user?.username)

      if (!portal.user) {
        throw new Error('User not authenticated')
      }

      // Create a new WebMap from the current view
      const webmap = new WebMap.default()
      
      // Update the webmap from the current view
      await webmap.updateFrom(viewRef)
      
      // Save the webmap to the portal with user-edited metadata
      const savedItem = await webmap.saveAs({
        title: mapTitle,
        snippet: mapDescription,
        tags: mapTags,
        portal: portal
      })

      console.log('Map saved:', savedItem)
      setMessage(`Map saved successfully! ID: ${savedItem.id}`)
      
      // Reset form after successful save
      setTimeout(() => {
        setShowDialog(false)
        setMapTitle('')
        setMapDescription('')
        setMapTags([])
        setMessage('')
      }, 2000)

      // Optionally open the saved map in ArcGIS Online
      if (savedItem.id) {
        const mapUrl = `https://www.arcgis.com/home/webmap/viewer.html?webmap=${savedItem.id}`
        window.open(mapUrl, '_blank')
      }
    } catch (error: any) {
      console.error('Failed to save map:', error)
      if (error.message?.includes('User not authenticated')) {
        setMessage('Please sign in to ArcGIS Online to save maps')
      } else {
        setMessage(`Failed to save map: ${error.message || 'Unknown error'}`)
      }
    } finally {
      setSaving(false)
    }
  }

  if (layers.length === 0) {
    return null
  }

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className={`bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 ${className}`}
        disabled={saving}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2" />
        </svg>
        Save to ArcGIS
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Save Map to ArcGIS Online</h3>
            
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
                  Tags
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
                <p className="text-sm font-medium text-gray-700 mb-2">Layers to be saved:</p>
                <ul className="space-y-1">
                  {layers.map((layer, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start">
                      <span className="mr-2">•</span>
                      <span className="flex-1">
                        <span className="font-medium">{layer.name}</span>
                        <span className="text-gray-500 ml-2">({layer.agency})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {message && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${
                message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {message}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveMap}
                disabled={saving || !mapTitle.trim() || !mapDescription.trim()}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  saving || !mapTitle.trim() || !mapDescription.trim()
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {saving ? 'Saving...' : 'Save Map'}
              </button>
              <button
                onClick={() => {
                  setShowDialog(false)
                  setMessage('')
                  setMapTitle('')
                  setMapDescription('')
                  setMapTags([])
                  setTagInput('')
                }}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              Note: You&apos;ll be prompted to sign in to ArcGIS Online if not already authenticated.
            </p>
          </div>
        </div>
      )}
    </>
  )
}