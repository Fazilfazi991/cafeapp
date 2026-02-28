'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function GmbLocationManager({ 
    initialLocationName 
}: { 
    initialLocationName?: string 
}) {
    const router = useRouter()
    const [locations, setLocations] = useState<any[]>([])
    const [selectedLocation, setSelectedLocation] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    const [showSelector, setShowSelector] = useState(!initialLocationName)

    useEffect(() => {
        if (showSelector) {
            fetchLocations()
        }
    }, [showSelector])

    const fetchLocations = async () => {
        setIsLoading(true)
        setError('')
        try {
            const res = await fetch('/api/gmb/locations')
            const data = await res.json()
            if (data.success && data.locations) {
                setLocations(data.locations)
                if (data.locations.length > 0) {
                    setSelectedLocation(data.locations[0].name)
                }
            } else {
                setError(data.error || 'Failed to fetch locations')
            }
        } catch (err: any) {
            setError('An error occurred while fetching locations.')
        } finally {
            setIsLoading(false)
        }
    }

    const saveLocation = async () => {
        setIsSaving(true)
        setError('')
        try {
            const locationObj = locations.find(l => l.name === selectedLocation)
            if (!locationObj) return

            const res = await fetch('/api/gmb/save-location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locationId: locationObj.name, // "locations/12345"
                    locationName: locationObj.title
                })
            })
            const data = await res.json()
            if (data.success) {
                setShowSelector(false)
                router.refresh()
            } else {
                setError(data.error || 'Failed to save location')
            }
        } catch (err: any) {
            setError('An error occurred while saving the location.')
        } finally {
            setIsSaving(false)
        }
    }

    if (!showSelector) {
        return (
            <div>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600"><span className="font-medium text-gray-800">Location:</span> {initialLocationName}</p>
                    <button 
                        onClick={() => setShowSelector(true)}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        Change Location
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="mt-3 p-4 bg-white border rounded-md">
            <h4 className="text-sm font-medium text-gray-800 mb-2">Select Google My Business Location</h4>
            
            {isLoading ? (
                <p className="text-sm text-gray-500">Loading locations...</p>
            ) : error ? (
                <p className="text-sm text-red-500">{error}</p>
            ) : (
                <div className="flex flex-col gap-3">
                    <select 
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                    >
                        {locations.map((loc) => (
                            <option key={loc.name} value={loc.name}>
                                {loc.title}
                            </option>
                        ))}
                    </select>
                    
                    <button 
                        onClick={saveLocation}
                        disabled={isSaving || !selectedLocation}
                        className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 self-start"
                    >
                        {isSaving ? 'Saving...' : 'Save Selection'}
                    </button>
                    
                    {initialLocationName && (
                        <button 
                            onClick={() => setShowSelector(false)}
                            className="text-xs text-gray-500 hover:underline self-start mt-1 cursor-pointer bg-transparent border-0"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
