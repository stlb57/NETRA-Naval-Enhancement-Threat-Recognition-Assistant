import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function MissionAnalysis() {
    const [sightings, setSightings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const position = [20.5937, 78.9629]; // India center

    const fetchSightings = () => {
        setIsLoading(true);
        axios.get('http://127.0.0.1:8000/sightings')
            .then(response => {
                setSightings(response.data);
                setIsLoading(false);
            })
            .catch(error => {
                console.error("Error fetching sightings:", error);
                setIsLoading(false);
            });
    };

    useEffect(() => {
        fetchSightings();
    }, []);

    const handleExportReport = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8000/export-report', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `NETRA_mission_report_${new Date().toISOString().split('T')[0]}.pdf`);
            link.click();
            link.remove();
        } catch (error) {
            alert("Failed to download report.");
        }
    };

    const pathCoordinates = sightings.map(s => [s.gps.lat, s.gps.lon]);

    return (
        <div className="page-container">
            <h2 className="page-header">Mission Analysis & Reporting</h2>
            <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                <button className="form-button primary" onClick={handleExportReport} disabled={sightings.length === 0}>
                    Export Report (PDF)
                </button>
                <button className="form-button" onClick={fetchSightings}>Refresh</button>
            </div>
            <div className="analysis-layout">
                <div className="sighting-list">
                    <h4>Logged Sightings ({sightings.length})</h4>
                    {isLoading && <p>Loading...</p>}
                    {!isLoading && sightings.length === 0 && <p>No sightings logged yet.</p>}
                    {sightings.map(sighting => (
                        <div key={sighting.id} className="sighting-item">
                            <img src={sighting.snapshot} alt="Sighting snapshot" />
                            <div>
                                <strong>Time:</strong> {sighting.timestamp}<br/>
                                <strong>Location:</strong> {sighting.gps.lat.toFixed(4)}, {sighting.gps.lon.toFixed(4)}<br/>
                                <strong>Notes:</strong> {sighting.notes}
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{minHeight: '300px'}}>
                    <h4>Mission Path</h4>
                    <MapContainer center={pathCoordinates.length > 0 ? pathCoordinates[0] : position} zoom={pathCoordinates.length > 0 ? 13 : 5} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {pathCoordinates.length > 1 && <Polyline pathOptions={{ color: '#4285f4' }} positions={pathCoordinates} />}
                        {sightings.map(sighting => (
                            <Marker key={sighting.id} position={[sighting.gps.lat, sighting.gps.lon]}>
                                <Popup><strong>{sighting.notes}</strong><br/>{sighting.timestamp}</Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
}

export default MissionAnalysis;