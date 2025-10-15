import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

function Dashboard() {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        axios.get('http://127.0.0.1:8000/dashboard-stats')
            .then(response => {
                setStats(response.data);
                setIsLoading(false);
            })
            .catch(error => {
                console.error("Error fetching dashboard stats:", error);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return (
            <div className="page-container">
                <h2 className="page-header">Mission Dashboard</h2>
                <div className="placeholder-box">Loading dashboard data...</div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <h2 className="page-header">Mission Dashboard</h2>
            <div className="dashboard-grid">
                <div className="dashboard-card">
                    <h4>Object Detection Frequency</h4>
                    <ResponsiveContainer>
                        <BarChart data={stats?.detection_frequency}>
                            <XAxis dataKey="name" stroke="#a7d8ff" />
                            <YAxis stroke="#a7d8ff" />
                            <Tooltip cursor={{fill: 'rgba(66, 133, 244, 0.1)'}} />
                            <Legend />
                            <Bar dataKey="detections" fill="#4285f4" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="dashboard-card">
                    <h4>System Performance (Live)</h4>
                     <ResponsiveContainer>
                        <LineChart data={stats?.performance_metrics}>
                             <CartesianGrid strokeDasharray="3 3" stroke="rgba(66, 133, 244, 0.2)" />
                             <XAxis dataKey="time" stroke="#a7d8ff" />
                             <YAxis stroke="#a7d8ff" />
                             <Tooltip />
                             <Legend />
                             <Line type="monotone" dataKey="latency" stroke="#ffc107" name="Network Latency (ms)" />
                             <Line type="monotone" dataKey="server_ms" stroke="#34a853" name="Server Time (ms)" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="dashboard-card full-width">
                    <h4>Mission Summary</h4>
                    <div style={{display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '100%'}}>
                        <div style={{textAlign: 'center'}}>
                            <h1 style={{fontSize: '4rem', margin: 0, color: '#4285f4'}}>{stats?.active_missions ?? 0}</h1>
                            <p>Active Missions</p>
                        </div>
                        <div style={{textAlign: 'center'}}>
                             <h1 style={{fontSize: '4rem', margin: 0, color: '#ffc107'}}>{stats?.total_sightings ?? 0}</h1>
                            <p>Total Sightings Logged</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;