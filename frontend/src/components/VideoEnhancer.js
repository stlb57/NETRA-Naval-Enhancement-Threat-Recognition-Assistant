import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

function VideoEnhancer() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [originalVideo, setOriginalVideo] = useState(null);
    const [enhancedVideo, setEnhancedVideo] = useState(null);
    const [error, setError] = useState('');
    const [analysisData, setAnalysisData] = useState(null);
    
    const [taskStatus, setTaskStatus] = useState('');
    const [taskProgress, setTaskProgress] = useState(0);
    const pollingInterval = useRef(null);

    const videoRef = useRef(null);

    useEffect(() => {
        return () => {
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
            }
        };
    }, []);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            setOriginalVideo(URL.createObjectURL(file));
            setEnhancedVideo(null);
            setAnalysisData(null);
            setError('');
            setTaskStatus('');
            setTaskProgress(0);
            if (pollingInterval.current) clearInterval(pollingInterval.current);
        }
    };

    const pollTaskStatus = (taskId) => {
        pollingInterval.current = setInterval(async () => {
            try {
                const response = await axios.get(`http://127.0.0.1:8000/tasks/${taskId}/status`);
                const { status, progress, error: taskError } = response.data;
                
                setTaskStatus(status);
                if (progress) setTaskProgress(progress);

                if (status === 'COMPLETED') {
                    setEnhancedVideo(`http://127.0.0.1:8000/results/${taskId}`);
                    clearInterval(pollingInterval.current);
                } else if (status === 'FAILED') {
                    setError(`Processing failed: ${taskError || 'Unknown error'}`);
                    clearInterval(pollingInterval.current);
                }
            } catch (err) {
                setError("Could not get task status.");
                clearInterval(pollingInterval.current);
            }
        }, 3000);
    };

    const handleEnhance = async () => {
        if (!selectedFile) { setError('Please select a video file first.'); return; }
        setError('');
        setTaskStatus('');
        setEnhancedVideo(null);

        const formData = new FormData();
        formData.append('file', selectedFile);
        
        try {
            setTaskStatus('ANALYZING');
            const analysisResponse = await axios.post('http://127.0.0.1:8000/analyze-video/', formData);
            setAnalysisData(analysisResponse.data);
            
            setTaskStatus('UPLOADING');
            const enhanceResponse = await axios.post('http://127.0.0.1:8000/enhance-video/', formData);
            const { task_id } = enhanceResponse.data;

            if (task_id) {
                setTaskStatus('QUEUED');
                pollTaskStatus(task_id);
            } else {
                setError("Failed to start enhancement task.");
            }

        } catch (err) {
            setError(err.response?.data?.detail || 'An error occurred during the process.');
            setTaskStatus('FAILED');
        }
    };

    const handleTimelineClick = (time) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            videoRef.current.play();
        }
    };
    
    const isProcessing = ['ANALYZING', 'UPLOADING', 'QUEUED', 'PROCESSING'].includes(taskStatus);
    let statusMessage = "Enhance Video";
    if (isProcessing) {
        statusMessage = taskStatus === 'PROCESSING' ? `Processing... ${taskProgress}%` : `${taskStatus}...`;
    } else if (taskStatus === 'COMPLETED') {
        // --- FIX: This message wasn't showing before the video loaded ---
        statusMessage = enhancedVideo ? 'Completed!' : 'Loading Result...';
    } else if (taskStatus === 'FAILED') {
        statusMessage = 'Failed';
    }


    return (
        <div className="page-container">
            <h2 className="page-header">Video Analysis</h2>
            <div className="input-file-wrapper">
                <label htmlFor="video-upload" className="form-button">Choose a Video</label>
                <input id="video-upload" type="file" onChange={handleFileChange} accept="video/*" />
                <span className="file-name-display">{selectedFile ? selectedFile.name : 'No file chosen'}</span>
            </div>
            <button className="form-button primary" onClick={handleEnhance} disabled={!selectedFile || isProcessing} style={{ width: '100%' }}>
                {statusMessage}
            </button>
            {error && <p style={{ color: '#ff8a8a' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '20px', flexGrow: 1, minHeight: 0 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4>Original Video</h4>
                    {originalVideo ? (
                        <>
                            <video ref={videoRef} src={originalVideo} style={{width: '100%', borderRadius: '8px' }} controls />
                            <div className="timeline-container">
                                {taskStatus === 'ANALYZING' && <div className="timeline-loading">Analyzing moments...</div>}
                                {analysisData && analysisData.scores.map((score, index) => (
                                    <div 
                                        key={index}
                                        className="timeline-bar"
                                        style={{ height: `${Math.max(score * 100, 5)}%` }}
                                        onClick={() => handleTimelineClick(analysisData.timestamps[index])}
                                        title={`Jump to ${analysisData.timestamps[index].toFixed(1)}s`}
                                    ></div>
                                ))}
                            </div>
                        </>
                    ) : (<div className="placeholder-box">Your original video will appear here.</div>)}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h4>Enhanced Video</h4>
                    {isProcessing && <div className="placeholder-box">{statusMessage}</div>}
                    {taskStatus === 'COMPLETED' && !enhancedVideo && <div className="placeholder-box">Loading Result...</div>}
                    {enhancedVideo && (
                        <video src={enhancedVideo} style={{width: '100%', borderRadius: '8px' }} controls autoPlay loop />
                    )}
                    {!isProcessing && !enhancedVideo && taskStatus !== 'COMPLETED' && (
                         <div className="placeholder-box">The enhanced result will appear here.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default VideoEnhancer;