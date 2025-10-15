import React, { useState } from 'react';
import axios from 'axios';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';

function ImageEnhancer() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [originalImage, setOriginalImage] = useState(null);
    const [enhancedImage, setEnhancedImage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [thermalMode, setThermalMode] = useState(false);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            setOriginalImage(URL.createObjectURL(file));
            setEnhancedImage(null);
            setError('');
        }
    };

    const handleEnhance = async () => {
        if (!selectedFile) return;
        setIsLoading(true);
        setError('');
        const formData = new FormData();
        formData.append('file', selectedFile);

        const API_URL = `http://127.0.0.1:8000/enhance-image/?mode=${thermalMode ? 'thermal' : 'normal'}`;

        try {
            // --- FIX: Now expects a JSON response, not a blob ---
            const response = await axios.post(API_URL, formData);
            
            // --- FIX: Construct data URL from the Base64 string ---
            const imageUrl = `data:image/png;base64,${response.data.image_b64}`;
            setEnhancedImage(imageUrl);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to enhance image. Is the backend server running?');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="page-container">
            <h2 className="page-header">Image Enhancement</h2>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexShrink: 0 }}>
                <div className="input-file-wrapper">
                    <label htmlFor="file-upload" className="form-button">Choose Image</label>
                    <input id="file-upload" type="file" onChange={handleFileChange} accept="image/*" />
                    <span className="file-name-display">{selectedFile ? selectedFile.name : 'No file chosen'}</span>
                </div>
                <label htmlFor="thermal-switch" className="thermal-toggle">
                    <input id="thermal-switch" type="checkbox" checked={thermalMode} onChange={(e) => setThermalMode(e.target.checked)} />
                    Digital Anomaly Mode
                </label>
            </div>

            <button className="form-button primary" onClick={handleEnhance} disabled={!selectedFile || isLoading} style={{ width: '100%', flexShrink: 0 }}>
                {isLoading ? 'Enhancing...' : 'Enhance Image'}
            </button>
            {error && <p style={{ color: '#ff8a8a', flexShrink: 0 }}>{error}</p>}

            <div className="comparison-slider-container">
                {(isLoading) && <div className="placeholder-box">Processing...</div>}
                
                {(!originalImage || !enhancedImage) && !isLoading && 
                    <div className="placeholder-box">
                        Upload an image to see the comparison.
                    </div>
                }
                
                {originalImage && enhancedImage && !isLoading && (
                    <ReactCompareSlider
                        itemOne={<ReactCompareSliderImage src={originalImage} alt="Original" />}
                        itemTwo={<ReactCompareSliderImage src={enhancedImage} alt="Enhanced" />}
                    />
                )}
            </div>
        </div>
    );
}

export default ImageEnhancer;