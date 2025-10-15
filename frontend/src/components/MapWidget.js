import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

const MapWidget = () => {
    // Default position (e.g., Indian Ocean)
    const position = [ -2.8, 72.8 ];

    return (
        <MapContainer center={position} zoom={5} scrollWheelZoom={false}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[5.9, 80.4]}>
                <Popup>
                    USS Eagle, Patrol Route Alpha. <br /> All systems nominal.
                </Popup>
            </Marker>
        </MapContainer>
    );
};

export default MapWidget;