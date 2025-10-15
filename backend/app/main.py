# File: backend/app/main.py
# --- FINAL VERSION 4.7.0 with Demo Data Seeding ---

import os, uuid, shutil, base64, time, datetime, random, json
from io import BytesIO
import numpy as np
import cv2
from fpdf import FPDF
from typing import List, Optional

import torch
import librosa 
from fastapi import FastAPI, File, UploadFile, HTTPException, WebSocket, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image
from pydantic import BaseModel
from collections import Counter 

from app.ml.nets.funiegan import GeneratorFunieGAN as Generator
from app.processing import enhance_image_with_model

app = FastAPI(title="NETRA: Naval Enhancement & Threat Recognition Assistant", version="4.7.0")
origins = ["http://localhost:3000"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Data Models ---
class Detection(BaseModel):
    label: str
    box: List[int]
    confidence: float
class Sighting(BaseModel):
    timestamp: str
    notes: str
    snapshot: str
    detections: Optional[List[Detection]] = []
class Mission(BaseModel):
    id: str
    name: str
    objectives: str
    status: str = "Active"

# --- In-memory "database" ---
sightings_log: List[dict] = []
missions_log: List[dict] = []
tasks = {}

# --- NEW: Function to create fake data for demos ---
def seed_initial_data():
    """Creates a set of fake sightings on startup to populate the UI for demos."""
    global sightings_log
    if sightings_log: # Don't add data if it already exists (e.g., on reload)
        return

    print("🌱 Seeding initial demo data...")
    anomaly_types = [
        "Unusual Geological Formation", "Vessel Debris", "Pipeline Anomaly",
        "Unknown Contact", "Marine Life Cluster", "Seabed Anomaly"
    ]
    # A valid 1x1 transparent pixel PNG to use as a placeholder snapshot
    placeholder_snapshot = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

    for i in range(12): # Create 12 fake sightings
        chosen_anomaly = random.choice(anomaly_types)
        sighting = {
            "id": str(uuid.uuid4()),
            "timestamp": (datetime.datetime.now() - datetime.timedelta(minutes=i*15)).strftime("%H:%M:%S"),
            "notes": f"Initial survey detected a {chosen_anomaly.lower()}.",
            "snapshot": placeholder_snapshot,
            "gps": get_simulated_gps(),
            "detections": [{
                "label": chosen_anomaly,
                "box": [random.randint(10,50), random.randint(10,50), random.randint(100,150), random.randint(100,150)],
                "confidence": round(random.uniform(0.85, 0.99), 2)
            }]
        }
        sightings_log.append(sighting)
    print(f"🌱 {len(sightings_log)} demo sightings created.")

# --- Model Loading ---
model = None
@app.on_event("startup")
def load_model():
    global model
    model_path = "app/ml/finetuned_generator.pth"
    if not os.path.exists(model_path):
        print(f"❌ ERROR: Model file not found at '{model_path}'.")
        model = None
    else:
        try:
            model = Generator()
            model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
            model.eval()
            print("✅ FUnIE-GAN Model loaded successfully!")
        except Exception as e:
            print(f"❌ ERROR: An error occurred while loading the GAN model: {e}")
            model = None

    seed_initial_data() # <-- Call the data seeder here

# --- Helper Functions ---
def check_model_loaded():
    if model is None:
        raise HTTPException(status_code=503, detail="Enhancement model is not loaded.")

def fake_object_detection(frame):
    detections = []
    if random.random() > 0.96:
        threats = ["Mine", "Submarine", "Unidentified Debris"]
        label = random.choice(threats)
        h, w, _ = frame.shape
        x, y = random.randint(int(w*0.1), int(w*0.9)-100), random.randint(int(h*0.1), int(h*0.9)-100)
        dw, dh = random.randint(50, 100), random.randint(50, 100)
        detections.append({"label": label, "box": [x, y, x+dw, y+dh], "confidence": round(random.uniform(0.75, 0.98), 2)})
    return detections

def get_simulated_gps():
    base_lat, base_lon = 23.2599, 77.4126
    offset = (datetime.datetime.now().timestamp() % 1000) / 5000.0
    return {"lat": base_lat + offset, "lon": base_lon + offset, "depth": round(50 + (offset * 1000), 2)}

# --- Background Video Processing Function ---
def process_video_in_background(in_path: str, out_path: str, task_id: str):
    try:
        tasks[task_id] = {"status": "PROCESSING", "progress": 0, "result_path": None}
        cap = cv2.VideoCapture(in_path)
        if not cap.isOpened(): raise IOError(f"OpenCV could not open video file at {in_path}")
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)); original_fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = original_fps if original_fps > 0 else 30.0
        fourcc = cv2.VideoWriter_fourcc(*'avc1'); out = cv2.VideoWriter(out_path, fourcc, fps, (width, height))
        if not out.isOpened(): raise IOError("Could not open video writer.")
        frame_count = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
            pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            enhanced_pil = enhance_image_with_model(pil_img, model)
            enhanced_frame = cv2.cvtColor(np.array(enhanced_pil), cv2.COLOR_RGB2BGR)
            out.write(enhanced_frame); frame_count += 1
            if total_frames > 0: tasks[task_id]["progress"] = round((frame_count / total_frames) * 100)
        cap.release(); out.release()
        if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
            tasks[task_id]["status"] = "COMPLETED"; tasks[task_id]["result_path"] = out_path
            print(f"✅ Background task {task_id} completed successfully.")
        else: raise IOError("Processing finished, but the output file is empty or missing.")
    except Exception as e:
        print(f"❌ ERROR in background task {task_id}: {e}")
        tasks[task_id]["status"] = "FAILED"; tasks[task_id]["error"] = str(e)
    finally:
        if os.path.exists(in_path): os.remove(in_path)

# --- API Endpoints ---
@app.get("/")
def read_root(): return {"message": "Welcome to NETRA!"}

@app.post("/log-sighting")
async def log_sighting(sighting: Sighting):
    sighting_data = sighting.dict(); sighting_data["gps"] = get_simulated_gps()
    sighting_data["id"] = str(uuid.uuid4()); sightings_log.append(sighting_data)
    return {"status": "success"}

@app.get("/sightings")
async def get_sightings(): return sightings_log

@app.get("/export-report")
async def export_report():
    if not sightings_log: raise HTTPException(status_code=404, detail="No sightings logged.")
    pdf = FPDF(); pdf.add_page(); pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "NETRA Mission Report", 0, 1, 'C'); pdf.ln(10)
    for sighting in sightings_log:
        pdf.set_font("Helvetica", "B", 12); pdf.cell(0, 10, f"Sighting ID: {sighting['id']}", 0, 1)
        pdf.set_font("Helvetica", "", 10); pdf.multi_cell(0, 5, f"Timestamp: {sighting['timestamp']}\nNotes: {sighting['notes']}\nLocation: {sighting['gps']['lat']:.4f}, {sighting['gps']['lon']:.4f}")
        try:
            img_data = base64.b64decode(sighting['snapshot'].split(',')[1]); img_path = f"temp_{sighting['id']}.jpg"
            with open(img_path, "wb") as f: f.write(img_data)
            pdf.image(img_path, x=pdf.get_x(), y=pdf.get_y(), w=100); os.remove(img_path); pdf.ln(70)
        except Exception as e: print(f"Could not process image for sighting {sighting['id']}: {e}"); pdf.ln(5)
    pdf_output = pdf.output(dest='S').encode('latin1')
    return Response(content=pdf_output, media_type='application/pdf', headers={"Content-Disposition": "attachment; filename=netra_report.pdf"})

@app.post("/analyze-video/")
async def analyze_video(file: UploadFile = File(...)):
    check_model_loaded(); temp_dir = "app/uploads"; os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, f"{uuid.uuid4()}_{file.filename}")
    try:
        with open(file_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
        cap = cv2.VideoCapture(file_path); fps = cap.get(cv2.CAP_PROP_FPS); scores = []; timestamps = []; frame_count = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
            if frame_count % int(fps or 30) == 0:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY); laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
                scores.append(laplacian_var / 1000.0); timestamps.append(frame_count / (fps or 30))
            frame_count += 1
        cap.release(); return {"scores": scores, "timestamps": timestamps}
    finally:
        if os.path.exists(file_path): os.remove(file_path)

@app.post("/enhance-image/")
async def enhance_image_endpoint(file: UploadFile = File(...), mode: str = "normal"):
    check_model_loaded(); contents = await file.read()
    image = Image.open(BytesIO(contents)).convert("RGB"); enhanced_image = enhance_image_with_model(image, model, mode=mode)
    buffered = BytesIO(); enhanced_image.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return {"image_b64": img_str}

@app.post("/enhance-video/")
async def enhance_video_endpoint(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    check_model_loaded(); upload_dir = "app/uploads"; results_dir = "app/results"
    os.makedirs(upload_dir, exist_ok=True); os.makedirs(results_dir, exist_ok=True)
    task_id = str(uuid.uuid4())
    in_path = os.path.join(upload_dir, f"{task_id}_{file.filename}")
    out_path = os.path.join(results_dir, f"enhanced_{task_id}.mp4")
    with open(in_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
    background_tasks.add_task(process_video_in_background, in_path, out_path, task_id)
    return {"task_id": task_id}

@app.get("/tasks/{task_id}/status")
async def get_task_status(task_id: str):
    task = tasks.get(task_id)
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.get("/results/{task_id}")
async def get_result(task_id: str):
    task = tasks.get(task_id)
    if not task or task.get("status") != "COMPLETED": raise HTTPException(status_code=404, detail="Result not available yet.")
    result_path = task.get("result_path")
    if not result_path or not os.path.exists(result_path): raise HTTPException(status_code=404, detail="Result file not found.")
    return FileResponse(result_path, media_type="video/mp4", filename=f"enhanced_{task_id}.mp4")

@app.websocket("/ws/live-enhance/")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    if model is None: await websocket.send_text(json.dumps({"error": "Enhancement model not loaded."})); await websocket.close(code=1011, reason="Model not available"); return
    try:
        while True:
            data = await websocket.receive_text(); start_time = time.time()
            header, encoded = data.split(",", 1); img_data = base64.b64decode(encoded)
            pil_img = Image.open(BytesIO(img_data)).convert("RGB"); enhanced_pil = enhance_image_with_model(pil_img, model)
            frame_np = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR); detections = fake_object_detection(frame_np)
            buffered = BytesIO(); enhanced_pil.save(buffered, format="JPEG")
            img_str = base64.b64encode(buffered.getvalue()).decode("utf-8"); server_time_ms = round((time.time() - start_time) * 1000)
            await websocket.send_text(json.dumps({"image": "data:image/jpeg;base64," + img_str, "detections": detections, "server_time_ms": server_time_ms}))
    except Exception as e: print(f"WebSocket Error: {e}")
    finally: print("WebSocket connection closed.")

@app.post("/missions", status_code=201)
async def create_mission(mission_data: dict):
    mission = Mission(id=str(uuid.uuid4()), name=mission_data.get("name"), objectives=mission_data.get("objectives"))
    missions_log.append(mission.dict()); print(f"✅ Mission '{mission.name}' created. Total missions: {len(missions_log)}")
    return mission

@app.get("/missions")
async def get_missions(): return missions_log

@app.post("/analyze-audio")
async def analyze_audio(file: UploadFile = File(...)):
    if not file.content_type.startswith("audio/"): raise HTTPException(status_code=400, detail="File is not an audio type.")
    temp_dir = "app/uploads"; os.makedirs(temp_dir, exist_ok=True); file_path = os.path.join(temp_dir, f"{uuid.uuid4()}_{file.filename}")
    try:
        with open(file_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
        y, sr = librosa.load(file_path, duration=30)
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr); pitch_variance = np.var(pitches[magnitudes > np.median(magnitudes)])
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr); is_rhythmic = len(beats) > 20 and tempo > 60
        if pitch_variance > 3500 and not is_rhythmic:
            classification = "Human Voice Detected"; notes = "High pitch variance indicates spoken words."
        elif is_rhythmic:
            classification = "Music or Rhythmic Noise"; notes = f"Strong rhythmic patterns detected at ~{int(tempo)} BPM."
        else:
            classification = random.choice(["Anomalous Engine Signature", "Common Marine Life", "Geological Activity"])
            notes = "Signature does not match common bio-acoustic or rhythmic patterns."
        confidence = random.uniform(0.75, 0.95)
        return {"class": classification, "confidence": round(confidence, 2), "source_bearing": round(random.uniform(0, 360), 1), "notes": notes}
    except Exception as e: raise HTTPException(status_code=500, detail=f"Failed to process audio: {e}")
    finally:
        if os.path.exists(file_path): os.remove(file_path)

@app.get("/dashboard-stats")
async def get_dashboard_stats():
    all_labels = [];
    for sighting in sightings_log:
        if sighting.get("detections"):
            for det in sighting["detections"]: all_labels.append(det["label"])
    detection_data = [{"name": label, "detections": count} for label, count in Counter(all_labels).items()]
    performance_data = []; now = datetime.datetime.now()
    for i in range(6):
        timestamp = now - datetime.timedelta(minutes=i * 5)
        performance_data.append({"time": timestamp.strftime("%H:%M"), "latency": random.randint(90, 140), "server_ms": random.randint(40, 60)})
    performance_data.reverse()
    return {"detection_frequency": detection_data, "performance_metrics": performance_data, "active_missions": len(missions_log), "total_sightings": len(sightings_log)}