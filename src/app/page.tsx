'use client'

import { useState, useRef } from 'react'
import SearchBar from '@/components/SearchBar'
import SearchResults from '@/components/SearchResults'
import MapView from '@/components/MapView'
import ExportMapButton from '@/components/ExportMapButton'
import { searchLayers, type Layer } from '@/lib/search'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Layer[]>([])
  const [selectedLayers, setSelectedLayers] = useState<Layer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const mapViewRef = useRef<any>(null)

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    setIsLoading(true)
    try {
      const results = await searchLayers(query)
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddLayer = (layer: Layer) => {
    if (!selectedLayers.find(l => l.name === layer.name)) {
      setSelectedLayers([...selectedLayers, layer])
    }
  }

  const handleRemoveLayer = (layerName: string) => {
    setSelectedLayers(selectedLayers.filter(l => l.name !== layerName))
  }

  const handleClearMap = () => {
    setSelectedLayers([])
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">HIFLD Infrastructure Search</h1>
            <p className="text-blue-100">Search and visualize critical infrastructure data</p>
          </div>
          <span className="text-xs text-blue-200 mt-1">
            Questions or Comments jeff.franzen2@redcross.org
          </span>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="w-96 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <SearchBar onSearch={handleSearch} />
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <SearchResults 
              results={searchResults}
              isLoading={isLoading}
              onAddLayer={handleAddLayer}
              selectedLayers={selectedLayers}
            />
          </div>

          {selectedLayers.length > 0 && (
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-700">
                  Active Layers ({selectedLayers.length})
                </h3>
                <button
                  onClick={handleClearMap}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear All
                </button>
              </div>
              
              
              <div className="flex gap-2 mb-3">
                <ExportMapButton 
                  layers={selectedLayers} 
                  viewRef={mapViewRef.current}
                />
              </div>
              
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {selectedLayers.map((layer) => (
                  <div key={layer.name} className="flex items-center justify-between text-sm">
                    <span className="truncate text-gray-600">{layer.name}</span>
                    <button
                      onClick={() => handleRemoveLayer(layer.name)}
                      className="text-red-500 hover:text-red-600 ml-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 relative">
          <MapView ref={mapViewRef} layers={selectedLayers} />
        </main>
      </div>
    </div>
  )
}