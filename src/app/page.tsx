'use client'

import { useState, useEffect, useRef } from 'react'
import SearchBar from '@/components/SearchBar'
import SearchResults from '@/components/SearchResults'
import MapView, { type MapViewRef } from '@/components/MapView'
import ExportMapButton from '@/components/ExportMapButton'
import SaveMapButton from '@/components/SaveMapButton'
import { searchLayers, type Layer } from '@/lib/search'
import { fetchActiveHurricanes } from '@/lib/hurricaneService'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Layer[]>([])
  const [selectedLayers, setSelectedLayers] = useState<Layer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hurricaneData, setHurricaneData] = useState<any[]>([])
  const mapViewRef = useRef<MapViewRef>(null)

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
    setHurricaneData([])
  }

  const handleHurricanePreset = async () => {
    // Clear existing layers
    setSelectedLayers([])
    
    // Add loading state
    setIsLoading(true)
    
    try {
      // Fetch hurricane data
      const hurricanes = await fetchActiveHurricanes()
      
      if (hurricanes.length > 0) {
        // Add hurricane visualization to map
        setHurricaneData(hurricanes)
        console.log('Active hurricanes:', hurricanes)
      }
      
      // Auto-search and add relevant infrastructure layers
      const emergencyLayers = [
        'hospital',
        'emergency medical',
        'shelter',
        'power plant',
        'airport',
        'evacuation route'
      ]
      
      // Search for each emergency layer type
      for (const searchTerm of emergencyLayers) {
        const results = await searchLayers(searchTerm)
        // Add first few results with map services
        const layersToAdd = results
          .filter(layer => layer.serviceUrl)
          .slice(0, 2) // Limit to prevent overload
        
        layersToAdd.forEach(layer => {
          if (!selectedLayers.find(l => l.name === layer.name)) {
            setSelectedLayers(prev => [...prev, layer])
          }
        })
      }
      
      // Show success message
      alert(`Hurricane response mode activated!\n${hurricanes.length > 0 ? `Tracking ${hurricanes.length} active storm(s)` : 'No active storms'}\nEmergency infrastructure layers loaded.`)
      
    } catch (error) {
      console.error('Error loading hurricane preset:', error)
      alert('Error loading hurricane data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="container mx-auto">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold mb-2">HIFLD Infrastructure Search</h1>
              <p className="text-blue-100">Search and visualize critical infrastructure data</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Emergency Presets - Smaller and less prominent */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleHurricanePreset()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-700 text-white text-xs rounded hover:bg-blue-800 transition-colors"
                  title="Load hurricane tracking and emergency infrastructure"
                >
                  <span className="text-sm">🌀</span>
                  <span>Hurricane</span>
                </button>
                <button
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-700 text-white text-xs rounded opacity-50 cursor-not-allowed"
                  disabled
                  title="Coming soon"
                >
                  <span className="text-sm">🔥</span>
                  <span>Wildfire</span>
                </button>
                <button
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-700 text-white text-xs rounded opacity-50 cursor-not-allowed"
                  disabled
                  title="Coming soon"
                >
                  <span className="text-sm">🌊</span>
                  <span>Flood</span>
                </button>
              </div>
              <span className="text-xs text-blue-200 border-l border-blue-500 pl-4">
                Questions or Comments jeff.franzen2@redcross.org
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-96 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <SearchBar onSearch={handleSearch} />
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-0">
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
              <div className="space-y-1 max-h-32 overflow-y-auto mb-4">
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
              
              {/* Export and Save Buttons */}
              <div className="space-y-2">
                <ExportMapButton 
                  layers={selectedLayers} 
                  viewRef={mapViewRef.current?.getView()} 
                />
                <SaveMapButton 
                  layers={selectedLayers} 
                  viewRef={mapViewRef.current?.getView()} 
                />
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 relative">
          <MapView ref={mapViewRef} layers={selectedLayers} hurricaneData={hurricaneData} />
        </main>
      </div>
    </div>
  )
}