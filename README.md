# SIH26189: AI-Powered Criminal Network Analysis System

An autonomous intelligence platform for law enforcement agencies (NCRB / Ministry of Home Affairs) to ingest, extract, resolve, and analyze complex criminal network entities across FIRs, Call Detail Records (CDRs), Bank Transactions, and Surveillance feeds.

---

## 🚀 Quick Start (One-Command Setup via Docker)

The entire system—including **Neo4j Graph DB**, **PostgreSQL Database**, **FastAPI Backend**, and **React Command Center UI**—is fully containerized and can be launched with a single command.

### Prerequisites
Make sure your system has the following installed:
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine (v20.10+)
* [Docker Compose](https://docs.docker.com/compose/) (v2.0+)
* Git

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-org/sih2026-criminal-network-analysis.git
cd sih2026-criminal-network-analysis
```

### Step 2: Configure Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```
*(Default settings in `.env.example` work out-of-the-box for local development).*

### Step 3: Launch Docker Containers
Run Docker Compose to build and spin up all 4 microservices in detached mode:
```bash
docker compose up -d --build
```

---

## 📍 Services & Dashboard Ports

Once `docker compose up -d` completes, access the application services at the following URLs:

| Service | Description | URL / Access | Default Credentials |
| :--- | :--- | :--- | :--- |
| **Frontend Command Center** | React 18 SPA Investigation Dashboard | [http://localhost:3001](http://localhost:3001) | N/A |
| **FastAPI Backend API** | REST API & Interactive Swagger Docs | [http://localhost:8000/docs](http://localhost:8000/docs) | N/A |
| **Neo4j Browser UI** | Graph Database Visual Query Interface | [http://localhost:7474](http://localhost:7474) | User: `neo4j`<br>Pass: `sih2026password` |
| **PostgreSQL Database** | Relational DB & Audit Logger | `localhost:5432` | DB: `sih_investigation`<br>User: `sih_admin`<br>Pass: `sih_secure_password` |

---

## 🛠️ Alternative: Local Development Setup (Without Docker Containers)

If you need to develop or debug frontend/backend services locally on your host machine without running Docker containers:

### 1. Backend Setup (Python FastAPI)
Requirements: Python 3.11+

```bash
# Navigate to backend directory
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Download spaCy English NLP model
python -m spacy download en_core_web_sm

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```
Backend will be available at: `http://localhost:8000`

### 2. Frontend Setup (React 18 + Vite)
Requirements: Node.js 18+ & npm

```bash
# Navigate to frontend directory
cd frontend

# Install node dependencies
npm install

# Start Vite local development server
npm run dev
```
Frontend will be available at: `http://localhost:3000`

---

## 🔍 Health Check Verification

To verify all database connections and backend services are active, run:
```bash
curl http://localhost:8000/api/health
```
**Expected Response:**
```json
{
  "status": "healthy",
  "database_connections": {
    "neo4j": "configured",
    "postgresql": "configured"
  }
}
```

---

## 📁 Repository Directory Structure

├── SIH 2026/
├── docker-compose.yml          # Container orchestration (Neo4j, Postgres, FastAPI, React)
├── .env.example                # Environment template
├── .gitignore                  # Git tracking exclusions (venv, node_modules, logs)
├── README.md                   # Installation & Setup guide (This file)
├── data/                       # Synthetic test evidence (calls.csv, transactions.csv, vehicle_sightings.csv, surveillance.json, firs/)
├── backend/
│   ├── Dockerfile              # Python 3.11 container environment
│   ├── requirements.txt        # FastAPI, spaCy, RapidFuzz, NetworkX, Neo4j driver
│   └── app/
│       ├── main.py             # FastAPI application entrypoint
│       ├── config.py           # Environment loader settings
│       ├── db/                 # Neo4j driver and session context managers
│       ├── ingestion/          # Multi-source Data Ingestion Engine (cleaner, parsers, NLP extractor, graph loader)
│       ├── entity_res/         # Fuzzy string & phonetic matching (In Progress)
│       └── graph_engine/       # Neo4j Cypher queries & GDS algorithms (In Progress)
└── frontend/
    ├── Dockerfile              # Production Node/Nginx container setup (Port 3001:80)
    ├── package.json            # React 18, Vite, Cytoscape.js, Leaflet, Tailwind CSS
    └── src/
        ├── App.jsx             # Command Center Dashboard shell & navigation
        ├── index.css           # Tailwind directives & dark theme styling
        └── main.jsx            # React root entrypoint

---

## 🛠️ Useful Docker Commands for Teammates

* **Check running containers**:
  ```bash
  docker ps
  ```
* **View backend logs**:
  ```bash
  docker logs sih_backend -f
  ```
* **View frontend logs**:
  ```bash
  docker logs sih_frontend -f
  ```
* **Stop all containers**:
  ```bash
  docker compose down
  ```
* **Stop containers and wipe volumes (Reset Database)**:
  ```bash
  docker compose down -v
  ```

---

## 👥 Tech Stack Overview

* **Frontend**: React 18, Vite, Tailwind CSS, Cytoscape.js (Graph UI), Leaflet.js (Map UI), Lucide Icons.
* **Backend**: Python 3.11, FastAPI, Pydantic v2, spaCy NLP, RapidFuzz, Jellyfish.
* **Graph DB**: Neo4j 5 Community + Graph Data Science (GDS) Plugin + APOC.
* **Relational DB**: PostgreSQL 16 (Case metadata & SHA-256 Hash Chain Audit Logs).
* **Containerization**: Docker & Docker Compose.
