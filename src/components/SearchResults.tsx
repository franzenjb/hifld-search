'use client'

import { Layer } from '@/lib/search'

interface SearchResultsProps {
  results: Layer[]
  isLoading: boolean
  onAddLayer: (layer: Layer) => void
  selectedLayers: Layer[]
}

export default function SearchResults({ 
  results, 
  isLoading, 
  onAddLayer,
  selectedLayers 
}: SearchResultsProps) {
  const isLayerSelected = (layer: Layer) => {
    return selectedLayers.some(l => l.name === layer.name)
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        Searching...
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No results found</p>
        <p className="text-sm mt-2">Try searching for: fire, hospital, school, power, water</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-sm text-gray-600 mb-3">
        Found {results.length} layers
      </p>
      
      {results.map((layer, index) => (
        <div 
          key={`${layer.name}-${index}`}
          className="bg-white p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-gray-800 flex-1 pr-2">{layer.name}</h4>
            {layer.serviceUrl && (
              <button
                onClick={() => onAddLayer(layer)}
                disabled={isLayerSelected(layer)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  isLayerSelected(layer)
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isLayerSelected(layer) ? 'Added' : 'Add'}
              </button>
            )}
          </div>
          
          <div className="text-sm text-gray-600 space-y-1">
            <p>Agency: {layer.agency}</p>
            <p>Status: {layer.status}</p>
            
            <div className="flex items-center gap-3 mt-2">
              {!layer.serviceUrl && (
                <span className="text-red-600">❌ No map service</span>
              )}
              {layer.duaRequired && (
                <span className="text-orange-600">📝 DUA Required</span>
              )}
              {layer.giiRequired && (
                <span className="text-orange-600">🔒 GII Access</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}