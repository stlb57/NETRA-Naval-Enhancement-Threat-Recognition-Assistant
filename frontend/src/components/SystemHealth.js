import React, { useState, useEffect } from 'react';
import axios from 'axios';

const endpoints = [
    { name: 'API Root', url: 'http://127.0.0.1:8000/', method: 'get' },
    { name: 'Missions API', url: 'http://127.0.0.1:8000/missions', method: 'get' },
    { name: 'Dashboard Stats API', url: 'http://127.0.0.1:8000/dashboard-stats', method: 'get' },
    { name: 'WebSocket Service', url: 'ws://127.0.0.1:8000/ws/live-enhance/', method: 'ws' },
];

function SystemHealth() {
    const [statuses, setStatuses] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const checkHealth = async () => {
        setIsLoading(false); // Set to false after the first run starts
        const newStatuses = {};
        for (const endpoint of endpoints) {
            const startTime = Date.now();
            try {
                if (endpoint.method === 'ws') {
                    const ws = new WebSocket(endpoint.url);
                    await new Promise((resolve, reject) => {
                        ws.onopen = resolve;
                        ws.onerror = reject;
                        setTimeout(() => reject(new Error("Timeout")), 3000);
                    });
                    ws.close();
                } else {
                    await axios({ method: endpoint.method, url: endpoint.url, timeout: 3000 });
                }
                const latency = Date.now() - startTime;
                newStatuses[endpoint.name] = { status: 'Online', latency };
            } catch (error) {
                newStatuses[endpoint.name] = { status: 'Offline', latency: -1 };
            }
        }
        setStatuses(newStatuses);
    };

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Re-check every 30 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="page-container">
            <h2 className="page-header">System Health & Status</h2>
            <div className="health-grid">
                {endpoints.map(ep => (
                    <div className="health-card" key={ep.name}>
                        <h4>{ep.name}</h4>
                        <div className="health-status">
                            <span>Status</span>
                            {statuses[ep.name] ? (
                                <span className={`health-status-indicator ${statuses[ep.name]?.status.toLowerCase()}`}>
                                    {statuses[ep.name]?.status}
                                </span>
                            ) : (
                                <span>Checking...</span>
                            )}
                        </div>
                        <p style={{wordBreak: 'break-all'}}><strong>Endpoint:</strong> {ep.url}</p>
                        <p><strong>Latency:</strong> {statuses[ep.name]?.latency > -1 ? `${statuses[ep.name]?.latency} ms` : 'N/A'}</p>
                    </div>
                ))}
            </div>
            {isLoading && <p>Initial health check in progress...</p>}
        </div>
    );
}

export default SystemHealth;