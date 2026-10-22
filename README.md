# T226: Hospital Patient Bed-Exit & Wandering Monitor
[![Build Status](https://img.shields.io/badge/Frontend-Vite%20%7C%20React%20%7C%20TypeScript-blue)](https://vitejs.dev/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.10%2B-green)](https://fastapi.tiangolo.com/)
[![Tests](https://img.shields.io/badge/Unit%20Tests-18%2F18%20Passed-emerald)](docs/TESTING.md)
[![Privacy](https://img.shields.io/badge/Privacy-Skeleton%20%2F%20Gaussian%20Blur-purple)](docs/PRIVACY.md)

**A professional, visually impressive, privacy-preserving visual AI monitoring system that detects patient bed exits, prolonged absence, and possible wandering from video and alerts hospital staff in real-time.**

Built for B.Tech Computer Science & Artificial Intelligence internship presentation and local execution in VS Code on Windows / Mac / Linux.

---

## 🌟 Key Features

1. **Dual Architecture Modes:**
   - **Integrated In-Browser Engine:** Zero-configuration instant execution via HTML5 Canvas, MediaPipe-compatible geometry rules, real-time state machine, and local SQLite storage.
   - **Standalone Python FastAPI Backend:** Complete modular backend service with OpenCV, SQLite persistence, temporal state machine, and REST APIs.
2. **Real Computer Vision & Pose Pipeline:**
   - 33-landmark body skeleton extraction with visibility thresholding.
   - Real-time geometric posture classification (`lying`, `sitting`, `standing`, `unknown`).
   - Interactive normalized Bed-Zone spatial calibration (`[x_min, y_min, x_max, y_max]`).
3. **Temporal Bed-Exit State Machine:**
   - Pre-exit candidate frame countdown prevents false alarms from patient rolling.
   - Prolonged bed absence detection with configurable threshold.
   - Single-event alert deduplication (never floods the nurse station during a continuous event).
4. **Rule-Based Wandering Detection:**
   - Kinematic trajectory analysis tracking path displacement, room spread, and movement velocity outside the bed zone.
5. **Privacy-Preserving Display:**
   - Default high-contrast dark vector skeleton overlay (100% anonymized).
   - Optional Gaussian blur video stream.
   - Zero raw video persistence to disk.
6. **Clinical Dashboard & Audit Desk:**
   - Overview Dashboard with real-time KPI metrics.
   - Live AI Monitoring workstation with video upload, webcam, and clinical scenario benchmarking.
   - Alerts Center with search, triage, nursing acknowledgment, and resolution notes.
   - Event Timeline with RFC 4180-compliant CSV audit export.
   - Clear distinction between real detected alerts and simulated demo data.

---

## 💻 Windows 10/11 & VS Code Setup Instructions

Run these exact commands in Windows PowerShell or the VS Code terminal to run the project locally:

### Terminal 1: Python FastAPI Backend (Port 8000)
```powershell
# 1. Check Python version (requires Python 3.10+)
python --version

# 2. Navigate to backend directory
cd backend

# 3. Create virtual environment
python -m venv venv

# 4. Activate virtual environment
.\venv\Scripts\Activate.ps1

# 5. Install backend dependencies
pip install -r requirements.txt

# 6. Run automated test suite (18 tests)
python tests/run_tests.py

# 7. Start FastAPI server with live reload
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*Backend API Documentation: http://localhost:8000/docs*  
*Health Check Endpoint: http://localhost:8000/api/health*

---

### Terminal 2: React Frontend (Port 3000)
```powershell
# 1. Check Node.js version (requires Node 18+)
node --version
npm --version

# 2. Install frontend dependencies
npm install

# 3. Start Vite development server
npm run dev
```
*Frontend Application URL: http://localhost:3000*

---

## 📁 Project Directory Structure

```
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py              # REST API endpoints (rooms, monitoring, alerts, CSV)
│   │   ├── core/
│   │   │   └── config.py              # System thresholds and defaults
│   │   ├── database/
│   │   │   └── db.py                  # SQLite schema, indices, queries, and transactions
│   │   ├── detection/
│   │   │   ├── state_machine.py       # Temporal bed-exit state machine
│   │   │   ├── wandering_detector.py  # Sliding-window trajectory kinematics
│   │   │   └── zone_evaluator.py      # Normalized spatial boundary evaluator
│   │   ├── schemas/
│   │   │   └── schemas.py             # Pydantic & domain models
│   │   ├── services/
│   │   │   ├── csv_service.py         # RFC 4180 audit trail exporter
│   │   │   └── event_service.py       # Session orchestrator and alert deduplicator
│   │   └── vision/
│   │       ├── pose_estimator.py      # 33-landmark skeleton extractor
│   │       └── posture_classifier.py  # Geometric angle & aspect ratio classifier
│   ├── tests/
│   │   ├── run_tests.py               # Test runner (18 automated tests)
│   │   ├── test_event_service.py      # DB & CSV tests
│   │   ├── test_posture_classifier.py # Posture angle tests
│   │   ├── test_state_machine.py      # Temporal state machine tests
│   │   ├── test_wandering_detector.py # Wandering kinematics tests
│   │   └── test_zone_evaluator.py     # Coordinate logic tests
│   ├── main.py                        # FastAPI application entry point
│   └── requirements.txt               # Python package dependencies
├── docs/
│   ├── ARCHITECTURE.md                # Mathematical formulas & state machine diagrams
│   ├── PRIVACY.md                     # Ethical AI & HIPAA/GDPR minimization
│   ├── PROJECT_DOCUMENTATION.md       # Full engineering specification
│   └── TESTING.md                     # Automated test execution evidence
├── src/
│   ├── components/
│   │   ├── Charts/                    # Responsive clinical SVG charts
│   │   │   ├── ActivityTimelineChart.tsx
│   │   │   ├── PostureDonutChart.tsx
│   │   │   └── RoomRiskChart.tsx
│   │   ├── AlertCard.tsx              # Zero-pill WCAG-compliant alert component
│   │   ├── AlertModal.tsx             # Resolution modal with staff notes
│   │   ├── BedZoneEditor.tsx          # Interactive drag & drop bed calibrator
│   │   ├── DemoModeBanner.tsx         # Regulatory demo disclaimer
│   │   ├── Sidebar.tsx                # Clinical sidebar navigation
│   │   └── TopNavbar.tsx              # Shift header, room switcher & clock
│   ├── pages/
│   │   ├── AlertsCenter.tsx           # Multi-tier alert triage desk
│   │   ├── Analytics.tsx              # Operational safety metrics
│   │   ├── Documentation.tsx          # Interactive in-app technical manual
│   │   ├── EventTimeline.tsx          # Chronological audit table with CSV download
│   │   ├── LiveMonitoring.tsx         # Vision workspace (upload, webcam, HUD)
│   │   ├── OverviewDashboard.tsx      # Command center KPIs & unit status
│   │   ├── RoomConfig.tsx             # Spatial calibration & threshold tuning
│   │   └── SettingsHealth.tsx         # Daemon ping & database maintenance
│   ├── services/
│   │   ├── api.ts                     # Dual-mode API client layer
│   │   ├── demoData.ts                # Synthetic reference dataset
│   │   ├── storage.ts                 # Local persistence layer
│   │   └── visionEngine.ts            # Client-side computer vision & canvas renderer
│   ├── types/
│   │   └── monitor.ts                 # TypeScript domain definitions
│   ├── App.tsx                        # Root layout & audio synthesizer
│   ├── index.css                      # Tailwind CSS entrypoint
│   └── main.tsx                       # React DOM root
├── metadata.json                      # AI Studio application metadata
├── package.json                       # Node dependencies
└── README.md                          # Main project guide
```

---

## 🧪 Automated Testing Verification

All 18 unit tests run out-of-the-box:
```bash
python3 backend/tests/run_tests.py
# Result: Ran 18 tests in 0.017s -- OK
```

To run frontend TypeScript and production build checks:
```bash
npm run lint
npm run build
```

---

## 🛡️ Minimum Practical System Requirements
- **OS:** Windows 10/11 (64-bit), macOS 12+, or Ubuntu 20.04+
- **Processor:** Dual-core Intel Core i3 / AMD Ryzen 3 or higher
- **Memory:** 4 GB RAM minimum (8 GB recommended)
- **Storage:** 500 MB free space for code, model weights, and SQLite database
- **Webcam (Optional):** 720p 30 FPS USB or integrated camera for live optical testing

Demo link of the project :
                https://t226-hospital-patient-bed-exit-wandering-monitor-1.ai.studio
                
