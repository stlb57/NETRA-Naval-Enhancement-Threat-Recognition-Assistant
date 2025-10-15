import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const ThreatLevels = {
    NONE: { label: 'NOMINAL', color: '#34a853' },
    LOW: { label: 'CAUTION', color: '#ffc107' },
    CRITICAL: { label: 'THREAT DETECTED', color: '#dc3545' },
};

// Helper function to determine threat level from detections
function getThreatLevel(detections) {
    if (!detections || detections.length === 0) return ThreatLevels.NONE;
    for (const det of detections) {
        if (det.label === 'Submarine' || det.label === 'Mine') {
            return ThreatLevels.CRITICAL;
        }
    }
    return ThreatLevels.LOW;
}

function LiveStream() {
    const [isStreaming, setIsStreaming] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [stats, setStats] = useState({ latency: 0, serverTime: 0, fps: 0 });
    const [detections, setDetections] = useState([]);
    const [currentThreat, setCurrentThreat] = useState(ThreatLevels.NONE);

    const videoRef = useRef(null);
    const outputCanvasRef = useRef(null);
    const webSocketRef = useRef(null);
    const intervalRef = useRef(null);
    const sendTimeRef = useRef(0);
    const frameCountRef = useRef(0);
    const lastFPSTimeRef = useRef(0);
    const lastImageRef = useRef(null);
    const inputCanvasRef = useRef(null);

    useEffect(() => {
        webSocketRef.current = new WebSocket("ws://127.0.0.1:8000/ws/live-enhance/");
        webSocketRef.current.onopen = () => setIsConnected(true);

        webSocketRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const now = Date.now();
            const latency = now - sendTimeRef.current;
            frameCountRef.current++;

            if (now - lastFPSTimeRef.current > 1000) {
                setStats({ latency, serverTime: data.server_time_ms, fps: frameCountRef.current });
                frameCountRef.current = 0;
                lastFPSTimeRef.current = now;
            } else {
                setStats(prevStats => ({ ...prevStats, latency, serverTime: data.server_time_ms }));
            }

            const newThreat = getThreatLevel(data.detections);
            if (newThreat.label !== currentThreat.label) {
                setCurrentThreat(newThreat);
                if (newThreat.label === ThreatLevels.CRITICAL.label) {
                    const criticalObject = data.detections.find(d => d.label.match(/Submarine|Mine/));
                    toast.error(`🚨 CRITICAL THREAT DETECTED: ${criticalObject.label}`);
                } else if (newThreat.label === ThreatLevels.LOW.label) {
                    toast.warn(`⚠️ Anomaly Detected: ${data.detections[0].label}`);
                }
            }

            setDetections(data.detections);
            const img = new Image();
            img.src = data.image;
            img.onload = () => { lastImageRef.current = img; };
        };

        webSocketRef.current.onclose = () => setIsConnected(false);
        webSocketRef.current.onerror = (err) => console.error("WebSocket Error:", err);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (webSocketRef.current) webSocketRef.current.close();
        };
    }, [currentThreat]); // Dependency array includes currentThreat to avoid stale state in the closure

    useEffect(() => {
        if (outputCanvasRef.current && lastImageRef.current) {
            const ctx = outputCanvasRef.current.getContext('2d');
            const canvas = outputCanvasRef.current;
            const hRatio = canvas.width / lastImageRef.current.width;
            const vRatio = canvas.height / lastImageRef.current.height;
            const ratio = Math.min(hRatio, vRatio);
            const centerShift_x = (canvas.width - lastImageRef.current.width * ratio) / 2;
            const centerShift_y = (canvas.height - lastImageRef.current.height * ratio) / 2;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(lastImageRef.current, 0, 0, lastImageRef.current.width, lastImageRef.current.height,
                          centerShift_x, centerShift_y, lastImageRef.current.width * ratio, lastImageRef.current.height * ratio);
            
            detections.forEach(det => {
                const [x1, y1, x2, y2] = det.box;
                const scaleX = (lastImageRef.current.width * ratio) / 256;
                const scaleY = (lastImageRef.current.height * ratio) / 256;
                ctx.strokeStyle = '#FFFF00';
                ctx.lineWidth = 2;
                ctx.strokeRect(centerShift_x + x1 * scaleX, centerShift_y + y1 * scaleY, (x2 - x1) * scaleX, (y2 - y1) * scaleY);
                ctx.fillStyle = '#FFFF00';
                ctx.font = '14px sans-serif';
                ctx.fillText(`${det.label} (${(det.confidence * 100).toFixed(0)}%)`, centerShift_x + x1 * scaleX, centerShift_y + y1 * scaleY - 5);
            });
        }
    }, [detections]);

    const sendFrame = useCallback(() => {
        if (videoRef.current && inputCanvasRef.current && webSocketRef.current?.readyState === WebSocket.OPEN) {
            const inputCtx = inputCanvasRef.current.getContext('2d');
            inputCtx.drawImage(videoRef.current, 0, 0, 320, 240);
            const frameData = inputCanvasRef.current.toDataURL('image/jpeg', 0.6);
            sendTimeRef.current = Date.now();
            webSocketRef.current.send(frameData);
        }
    }, []);

    const startStreaming = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) { videoRef.current.srcObject = stream; }
            setIsStreaming(true);
            intervalRef.current = setInterval(sendFrame, 100);
        } catch (err) { console.error("Error accessing webcam:", err); }
    };

    const stopStreaming = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        setIsStreaming(false);
        setCurrentThreat(ThreatLevels.NONE);
    };

    const handleLogSighting = () => {
        const notes = prompt("Enter notes for this sighting:");
        if (notes && notes.trim() !== '') {
            const snapshot = outputCanvasRef.current.toDataURL('image/jpeg', 0.8);
            const timestamp = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
            
            axios.post('http://127.0.0.1:8000/log-sighting', { 
                timestamp, 
                notes, 
                snapshot, 
                detections: detections
            })
            .then(() => toast.success("Sighting logged successfully!"))
            .catch(error => toast.error("Failed to log sighting."));
        }
    };

    return (
        <div className="page-container">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h2 className="page-header" style={{border: 'none', paddingBottom: 0}}>Live Mission Console</h2>
                {isStreaming && (
                    <div style={{padding: '10px 20px', borderRadius: '8px', backgroundColor: currentThreat.color, border: '1px solid rgba(255,255,255,0.3)'}}>
                        <strong style={{color: 'white'}}>STATUS: {currentThreat.label}</strong>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                {!isStreaming ? (
                    <button className="form-button primary" onClick={startStreaming} disabled={!isConnected}>{isConnected ? 'Start Webcam' : 'Connecting...'}</button>
                ) : (
                    <button className="form-button" style={{ backgroundColor: '#dc3545' }} onClick={stopStreaming}>Stop Webcam</button>
                )}
                {isStreaming && <button className="form-button" onClick={handleLogSighting}>Log Sighting</button>}
            </div>

            {isStreaming && (
                <div className="stats-overlay">
                    <span>Server: <strong>{stats.serverTime} ms</strong></span>
                    <span>Latency: <strong>{stats.latency} ms</strong></span>
                    <span>FPS: <strong>{stats.fps}</strong></span>
                </div>
            )}

            <div className="live-feed-layout">
                <div>
                    <h4>Live Webcam Feed</h4>
                    <video ref={videoRef} autoPlay playsInline muted style={{ display: isStreaming ? 'block' : 'none', transform: 'scaleX(-1)' }}></video>
                    <canvas ref={inputCanvasRef} width="320" height="240" style={{ display: 'none' }}></canvas>
                    {!isStreaming && <div className="placeholder-box">Webcam is off.</div>}
                </div>
                <div>
                    <h4>Enhanced & Analyzed Feed</h4>
                    <canvas ref={outputCanvasRef} width="640" height="480" style={{backgroundColor: '#000'}}></canvas>
                </div>
            </div>
        </div>
    );
}

export default LiveStream;