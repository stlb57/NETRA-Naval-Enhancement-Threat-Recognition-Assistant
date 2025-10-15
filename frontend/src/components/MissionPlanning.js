import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer } from 'react-leaflet';

function MissionPlanning() {
    const [missions, setMissions] = useState([]);
    const [missionName, setMissionName] = useState('');
    const [missionObjectives, setMissionObjectives] = useState('');
    const position = [20.5937, 78.9629];

    const fetchMissions = () => {
        axios.get('http://127.0.0.1:8000/missions')
            .then(res => setMissions(res.data))
            .catch(err => console.error("Failed to fetch missions:", err));
    };

    useEffect(() => {
        fetchMissions();
    }, []);

    const handleSaveMission = async (e) => {
        e.preventDefault();
        if (!missionName.trim() || !missionObjectives.trim()) {
            alert("Please fill out all fields.");
            return;
        }
        try {
            await axios.post('http://127.0.0.1:8000/missions', { name: missionName, objectives: missionObjectives });
            fetchMissions(); // Refresh the list
            setMissionName('');
            setMissionObjectives('');
        } catch (err) {
            console.error("Failed to save mission:", err);
            alert("Failed to save mission.");
        }
    };

    return (
        <div className="page-container">
            <h2 className="page-header">Mission Planning</h2>
            <div className="planning-layout">
                <div>
                    <form className="planning-form" onSubmit={handleSaveMission}>
                        <h4>Create New Mission</h4>
                        <div className="form-group">
                            <label htmlFor="missionName">Mission Name</label>
                            <input type="text" id="missionName" value={missionName} onChange={e => setMissionName(e.target.value)} placeholder="e.g., Reef Survey - Sector 7G"/>
                        </div>
                        <div className="form-group">
                            <label htmlFor="missionObjectives">Objectives</label>
                            <textarea id="missionObjectives" rows="8" value={missionObjectives} onChange={e => setMissionObjectives(e.target.value)} placeholder="1. Scan for..."></textarea>
                        </div>
                        <button type="submit" className="form-button primary" style={{width: '100%'}}>Save Mission Plan</button>
                    </form>
                    <div style={{marginTop: '20px'}}>
                        <h4>Active Missions ({missions.length})</h4>
                        <div style={{maxHeight: '200px', overflowY: 'auto'}}>
                            {missions.map(m => <div key={m.id} style={{background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '5px', marginBottom: '5px'}}>{m.name}</div>)}
                        </div>
                    </div>
                </div>
                <div>
                    <h4>Area of Operation</h4>
                    <MapContainer center={position} zoom={5} style={{ height: '100%', borderRadius: '8px' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    </MapContainer>
                </div>
            </div>
        </div>
    );
}

export default MissionPlanning;