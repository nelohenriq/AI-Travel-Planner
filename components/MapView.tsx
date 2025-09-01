
import React, { useEffect, useRef } from 'react';
import { ItineraryPlan, Location } from '../types';

interface MapViewProps {
    itinerary: ItineraryPlan;
    onMarkerClick: (itemId: string) => void;
}

interface MapPoint {
    id: string;
    location: Location;
    title: string;
    description: string;
}

const MapView: React.FC<MapViewProps> = ({ itinerary, onMarkerClick }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null); // To hold the Leaflet map instance

    useEffect(() => {
        if (!mapRef.current || mapInstance.current) return;

        // Initialize map
        const L = (window as any).L;
        if (!L) {
            console.error("Leaflet is not loaded");
            return;
        }

        mapInstance.current = L.map(mapRef.current);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstance.current);

        return () => {
            // Cleanup map instance on component unmount
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!mapInstance.current || !itinerary) return;
        
        const L = (window as any).L;
        const map = mapInstance.current;

        // Clear existing markers
        map.eachLayer((layer: any) => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        const points: MapPoint[] = [];
        
        // Collect all points with locations
        itinerary.accommodation.examples.forEach((acc, index) => {
            if (acc.location) points.push({
                id: `acc-${index}`,
                location: acc.location,
                title: acc.name,
                description: `Accommodation (${acc.priceRange})`
            });
        });

        itinerary.dailyItineraries.forEach((day, dayIndex) => {
            day.activities.forEach((activity, activityIndex) => {
                if (activity.location) points.push({
                    id: `activity-${dayIndex}-${activityIndex}`,
                    location: activity.location,
                    title: activity.description,
                    description: `Day ${day.day} - ${activity.time}`
                });
            });
            day.food.forEach((food, foodIndex) => {
                if (food.location) points.push({
                    id: `food-${dayIndex}-${foodIndex}`,
                    location: food.location,
                    title: food.suggestion,
                    description: `Day ${day.day} - ${food.meal}`
                });
            });
        });

        if (points.length === 0) {
            // Default view if no points (e.g., center of the world)
            map.setView([0, 0], 2);
            return;
        }

        const bounds = L.latLngBounds(points.map(p => [p.location.latitude, p.location.longitude]));
        
        points.forEach(point => {
            const marker = L.marker([point.location.latitude, point.location.longitude])
                .addTo(map)
                .bindPopup(`<b>${point.title}</b><br>${point.description}`);
            
            marker.on('click', () => {
                onMarkerClick(point.id);
            });
        });

        map.fitBounds(bounds.pad(0.1)); // Fit map to bounds with some padding

    }, [itinerary, onMarkerClick]);


    return <div ref={mapRef} style={{ height: '600px', width: '100%' }} className="rounded-lg shadow-md" />;
};

export default MapView;