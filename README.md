# Project NETRA: Naval Enhancement & Threat Recognition Assistant

![Python](https://img.shields.io/badge/Python-3.9+-blue?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-green?style=for-the-badge&logo=fastapi)
![PyTorch](https://img.shields.io/badge/PyTorch-orange?style=for-the-badge&logo=pytorch)

An AI-powered, unified command-and-control platform that transforms raw underwater visual and acoustic data into clear, actionable intelligence for real-time maritime operations.

*(It is highly recommended to add a GIF of the application in action here!)*
![NETRA Demo GIF](https://your-gif-url-here.com/demo.gif)

## 🌊 The Problem
Underwater operations are critically dependent on visual data, which suffers from severe limitations like light scattering, color attenuation, and turbidity. Manual analysis of this degraded footage is slow, inefficient, and highly prone to human error, creating a critical gap in real-time situational awareness.

## 💡 Our Solution
Project NETRA is an integrated web platform that acts as a mission control center for underwater operations. It leverages state-of-the-art AI to enhance degraded visuals, automatically detect objects of interest, and provide a unified interface for mission planning, execution, and reporting.

## ✨ Core Features
- **📊 Real-Time Dashboard:** A strategic overview with live charts for object detection frequency and system performance metrics.
- **🗺️ Mission Planning:** Create and manage mission objectives and operational areas before deployment.
- **🛰️ Live Mission Console:** Ingests a real-time video feed with an AI-powered object detection overlay, an automated threat-assessment engine, and one-click sighting logging.
- **🖼️ Forensic Media Enhancement:** Utilizes a FUnIE-GAN model to clarify and restore color to degraded underwater images and videos, using a robust asynchronous architecture to handle large files.
- **🎶 Acoustic Analysis:** Processes underwater audio recordings to identify and classify acoustic signatures for marine life, mechanical noise, or other anomalies.
- **📋 Mission Report & Geospatial Analysis:** Aggregates all logged sightings on an interactive map, visualizes the mission path, and generates comprehensive PDF reports.
- **💚 System Health Monitoring:** A dedicated dashboard to monitor the status and latency of all backend services in real-time.

## 🛠️ Technology Stack

### 🖥️ Frontend
- **Framework:** React.js
- **API Communication:** Axios
- **Data Visualization:** Recharts, Leaflet & React-Leaflet
- **UI/UX:** React-Toastify for notifications, pure CSS3 for styling

### ⚙️ Backend
- **Framework:** Python with FastAPI
- **Web Server:** Uvicorn (ASGI)
- **Real-time Communication:** WebSockets

### 🧠 Machine Learning
- **Core Framework:** PyTorch
- **Image/Video Processing:** OpenCV, Pillow
- **Audio Processing:** Librosa, NumPy
- **AI Model:** FUnIE-GAN (for enhancement)

## 📂 Project Structure
```
/project-netra/
├── /backend/
│   ├── /app/
│   │   ├── /ml/
│   │   │   └── finetuned_generator.pth  (NOTE: Not in Git)
│   │   ├── main.py
│   │   └── processing.py
│   └── requirements.txt
├── /frontend/
│   ├── /public/
│   └── /src/
│       ├── /components/
│       ├── App.js
│       └── index.js
├── .gitignore
└── README.md
```

## 🚀 Setup and Installation

### Prerequisites
- Python 3.9+
- Node.js & npm
- Git

### 1. Backend Setup
```bash
# 1. Clone the repository
git clone [https://github.com/your-username/project-netra.git](https://github.com/your-username/project-netra.git)
cd project-netra/backend

# 2. Create a virtual environment and activate it
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. IMPORTANT: Download the model
# Create the folder: app/ml/
# Download the 'finetuned_generator.pth' file and place it inside app/ml/

# 5. Run the backend server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
# Open a new terminal

# 1. Navigate to the frontend directory
cd project-netra/frontend

# 2. Install Node.js dependencies
npm install

# 3. Run the frontend development server
npm start
```
The application should now be running at `http://localhost:3000`.
