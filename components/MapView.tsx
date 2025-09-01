
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
    day: number; // 0 for accommodation, 1+ for itinerary days
}

// A vibrant, accessible color palette
const DAY_COLORS = [
    '#16a34a', // green-600
    '#2563eb', // blue-600
    '#ca8a04', // yellow-500
    '#c026d3', // fuchsia-600
    '#dc2626', // red-600
    '#ea580c', // orange-600
    '#0d9488', // teal-600
    '#6d28d9', // violet-700
];
const ACCOMMODATION_COLOR = '#475569'; // slate-600

const generateIcon = (color: string) => {
    const L = (window as any).L;
    if (!L) return null;

    const markerHtml = `
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="${color}" stroke="#FFF" stroke-width="1.5"/>
    </svg>`;

    return L.divIcon({
        html: markerHtml,
        className: 'custom-map-marker', // an empty class name
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    });
};

const MapLegend: React.FC<{ days: { day: number, color: string }[] }> = ({ days }) => (
    <div className="absolute bottom-4 right-4 z-[1000] p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-md shadow-lg text-xs text-slate-700 dark:text-slate-200">
        <h4 className="font-bold mb-1">Legend</h4>
        <ul>
            <li className="flex items-center mb-1">
                <i className="w-4 h-4 rounded-sm mr-2" style={{ backgroundColor: ACCOMMODATION_COLOR }}></i>
                <span>Accommodation</span>
            </li>
            {days.map(({ day, color }) => (
                <li key={day} className="flex items-center">
                    <i className="w-4 h-4 rounded-sm mr-2" style={{ backgroundColor: color }}></i>
                    <span>Day {day}</span>
                </li>
            ))}
        </ul>
    </div>
);


const MapView: React.FC<MapViewProps> = ({ itinerary, onMarkerClick }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null); // To hold the Leaflet map instance

    useEffect(() => {
        if (!mapRef.current || mapInstance.current) return;

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

        map.eachLayer((layer: any) => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        const points: MapPoint[] = [];
        
        itinerary.accommodation.examples.forEach((acc, index) => {
            if (acc.location) points.push({
                id: `acc-${index}`,
                location: acc.location,
                title: acc.name,
                description: `Accommodation (${acc.priceRange})`,
                day: 0 // Special day number for accommodation
            });
        });

        itinerary.dailyItineraries.forEach((day, dayIndex) => {
            day.activities.forEach((activity, activityIndex) => {
                if (activity.location) points.push({
                    id: `activity-${dayIndex}-${activityIndex}`,
                    location: activity.location,
                    title: activity.description,
                    description: `Day ${day.day} - ${activity.time}`,
                    day: day.day
                });
            });
            day.food.forEach((food, foodIndex) => {
                if (food.location) points.push({
                    id: `food-${dayIndex}-${foodIndex}`,
                    location: food.location,
                    title: food.suggestion,
                    description: `Day ${day.day} - ${food.meal}`,
                    day: day.day
                });
            });
        });

        if (points.length === 0) {
            map.setView([0, 0], 2);
            return;
        }

        const bounds = L.latLngBounds(points.map(p => [p.location.latitude, p.location.longitude]));
        
        points.forEach(point => {
            const color = point.day === 0 
                ? ACCOMMODATION_COLOR 
                : DAY_COLORS[(point.day - 1) % DAY_COLORS.length];
            const icon = generateIcon(color);
            if (!icon) return;

            const marker = L.marker([point.location.latitude, point.location.longitude], { icon })
                .addTo(map)
                .bindPopup(`<b>${point.title}</b><br>${point.description}`);
            
            marker.on('click', () => {
                onMarkerClick(point.id);
            });
        });
        
        if (bounds.isValid()) {
            map.fitBounds(bounds.pad(0.1));
        }

    }, [itinerary, onMarkerClick]);

    const legendDays = itinerary.dailyItineraries.map(day => ({
        day: day.day,
        color: DAY_COLORS[(day.day - 1) % DAY_COLORS.length]
    }));

    return (
        <div className="relative">
            <div ref={mapRef} style={{ height: '600px', width: '100%' }} className="rounded-lg shadow-md" />
            {legendDays.length > 0 && <MapLegend days={legendDays} />}
        </div>
    );
};

export default MapView;
