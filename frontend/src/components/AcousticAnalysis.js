import React, { useState } from 'react';
import axios from 'axios';

function AcousticAnalysis() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
            setResults(null);
            setError('');
        }
    };

    const handleAnalyze = async () => {
        if (!selectedFile) return;
        setIsAnalyzing(true);
        setError('');
        setResults(null);
        
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await axios.post('http://127.0.0.1:8000/analyze-audio', formData);
            setResults(response.data);
        } catch (err) {
            console.error("Error analyzing audio:", err);
            setError("Failed to analyze audio. Please check the file format or server status.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="page-container">
            <h2 className="page-header">Acoustic Analysis</h2>
            <div className="input-file-wrapper">
                <label htmlFor="audio-upload" className="form-button">Choose Audio File (.wav, .mp3)</label>
                <input id="audio-upload" type="file" onChange={handleFileChange} accept="audio/*" />
                <span className="file-name-display">{selectedFile ? selectedFile.name : 'No file chosen'}</span>
            </div>
            <button className="form-button primary" style={{width: '100%'}} onClick={handleAnalyze} disabled={!selectedFile || isAnalyzing}>
                {isAnalyzing ? "Analyzing..." : "Analyze Audio Signature"}
            </button>
            {error && <p style={{ color: '#ff8a8a' }}>{error}</p>}
            <div className="placeholder-box">
                {isAnalyzing && "Processing audio waveform and running classification..."}
                {results && (
                    <div style={{textAlign: 'left', padding: '20px'}}>
                        <h3>Analysis Complete:</h3>
                        <p><strong>Classification:</strong> {results.class}</p>
                        <p><strong>Confidence:</strong> {(results.confidence * 100).toFixed(1)}%</p>
                        <p><strong>Estimated Bearing:</strong> {results.source_bearing}°</p>
                        <p><strong>System Notes:</strong> {results.notes}</p>
                    </div>
                )}
                {!isAnalyzing && !results && "Upload an audio file to analyze its acoustic signature."}
            </div>
        </div>
    );
}

export default AcousticAnalysis;