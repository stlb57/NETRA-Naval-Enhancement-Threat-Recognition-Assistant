import React, { useState } from 'react';
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { FiLayout, FiCamera, FiFilm, FiRadio, FiBarChart2, FiCpu, FiFileText, FiMusic } from 'react-icons/fi';

import Dashboard from './components/Dashboard';
import ImageEnhancer from './components/ImageEnhancer';
import VideoEnhancer from './components/VideoEnhancer';
import LiveStream from './components/LiveStream';
import MissionAnalysis from './components/MissionAnalysis';
import SystemHealth from './components/SystemHealth';
import MissionPlanning from './components/MissionPlanning';
import AcousticAnalysis from './components/AcousticAnalysis';

function App() {
    const [activeView, setActiveView] = useState('dashboard');

    const renderContent = () => {
        switch (activeView) {
            case 'dashboard': return <Dashboard />;
            case 'image': return <ImageEnhancer />;
            case 'video': return <VideoEnhancer />;
            case 'livestream': return <LiveStream />;
            case 'analysis': return <MissionAnalysis />;
            case 'planning': return <MissionPlanning />;
            case 'acoustic': return <AcousticAnalysis />;
            case 'health': return <SystemHealth />;
            default: return <Dashboard />;
        }
    };

    return (
        <div className="app-container">
            {/* For global notifications */}
            <ToastContainer theme="dark" position="bottom-right" autoClose={5000} hideProgressBar={false} />

            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1>NETRA</h1>
                    <p>Naval Enhancement & Threat Recognition Assistant</p>
                </div>
                <nav className="sidebar-nav">
                    <button onClick={() => setActiveView('dashboard')} className={activeView === 'dashboard' ? 'active' : ''}>
                        <FiLayout /> Dashboard
                    </button>
                    <button onClick={() => setActiveView('planning')} className={activeView === 'planning' ? 'active' : ''}>
                        <FiFileText /> Mission Planning
                    </button>
                    <button onClick={() => setActiveView('livestream')} className={activeView === 'livestream' ? 'active' : ''}>
                        <FiRadio /> Live Mission
                    </button>
                    <button onClick={() => setActiveView('image')} className={activeView === 'image' ? 'active' : ''}>
                        <FiCamera /> Image Enhancement
                    </button>
                    <button onClick={() => setActiveView('video')} className={activeView === 'video' ? 'active' : ''}>
                        <FiFilm /> Video Analysis
                    </button>
                    <button onClick={() => setActiveView('acoustic')} className={activeView === 'acoustic' ? 'active' : ''}>
                        <FiMusic /> Acoustic Analysis
                    </button>
                     <button onClick={() => setActiveView('analysis')} className={activeView === 'analysis' ? 'active' : ''}>
                        <FiBarChart2 /> Mission Report
                    </button>
                    <button onClick={() => setActiveView('health')} className={activeView === 'health' ? 'active' : ''}>
                        <FiCpu /> System Health
                    </button>
                </nav>
            </aside>
            <main className="main-content">
                {renderContent()}
            </main>
        </div>
    );
}

export default App;