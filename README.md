# Smart Roster Management System

## 🌟 Key Highlights & Standout Frontend Architecture

- **Executive Glassmorphism Dashboard**: Deep slate theme with real-time KPI metrics (Coverage Health %, Active Team, Critical Conflicts, Preference Alerts, and 80/20 Brand Architecture Distribution).
- **The 5 Core Roster Views (Assessment Section 3.E)**:
  1. **Company-Wide View**: Complete 31-day interactive scheduling grid across all pods with sticky employee headers, weekend shading, shift status badges (`W`, `OFF`, `L`, `CO`, `H`), and click-to-edit shift modals with locked indicators (`🔒`).
  2. **Pod-Wise View**: Breakdown of operational pods (Alpha, Bravo, Charlie, Delta), designated Pod Leads, member headcounts, and individual pod schedules.
  3. **Brand-Wise View**: Interactive portfolio view distinguishing the **80% Single-Resource Dedicated Brands** from the **20% Multi-Resource Brands**, showcasing operating calendar rules (365-day 24/7 vs Daily vs Mon-Sat) and daily coverage health tables (`Working / Required`).
  4. **Process-Wise View**: Cross-brand staffing matrices for Customer Support (CS), Abandoned Cart Conversion (ACC), Non-Delivery Reports (NDR), and Retention.
  5. **Employee-Wise Individual Schedule Card**: Personal profile views with weekly off preferences, max consecutive working days, assigned client brands/processes, monthly breakdown charts, and an interactive day-by-day calendar.
- **Interactive Shift Modification with Live Preview**: Click any calendar cell to modify shifts; includes a **"Preview Impact"** mode that validates downstream compliance before changes are committed.
- **What-If Scenario Lab & Change Management (Assessment Section 3.F)**: Allows operations managers to simulate leave or emergency unavailability, visualize newly created coverage gaps, inspect recommended pod backup floaters, and commit with one-click **"Approve & Auto-Regenerate"**.
- **Conflict Detection & Diagnostic Center (Assessment Section 3.D)**: Separates **Critical Hard Constraints** (uncovered client commitments, leave conflicts, max consecutive days exceeded) from **Soft Preference Warnings** (preferred weekly-off day overrides), complete with engine-recommended resolutions.
- **Master Data CRUD Management (Assessment Section 3.A)**: Full in-app control to dynamically add, edit, deactivate, or remove employees, brands, pods, processes, assignments, rules, leaves, and public holidays without code modifications.

---

## 🏗️ System Architecture

```
smart-roster-management/
├── backend/
│   ├── app/
│   │   ├── api/routes.py            # REST API endpoints & CRUD
│   │   ├── database/session.py      # SQLAlchemy DB configuration (SQLite / PostgreSQL)
│   │   ├── models/                  # Declarative ORM models & relational schema
│   │   ├── scheduler/
│   │   │   ├── constraints.py       # Calendar operating rules & requirements
│   │   │   ├── engine.py            # CP-SAT / Integer optimization solver logic
│   │   │   └── validator.py         # Independent constraint validation engine
│   │   └── services/roster_service.py # Core business orchestration
│   └── tests/                       # Unit tests & constraint verification
├── frontend/
│   ├── src/
│   │   ├── components/              # Modular UI components (Navbar, StatCards, 5 Views, WhatIfLab, MasterData)
│   │   ├── api.ts                   # Typed API client
│   │   ├── types.ts                 # Complete TypeScript schema definitions
│   │   ├── index.css                # Premium Slate design system (CSS variables, glassmorphism, responsive tables)
│   │   └── App.tsx                  # Root application shell
│   ├── package.json
│   └── vite.config.ts
└── seed/
    └── sample_data.py               # Realistic dataset: 31 employees, 20 brands, 4 pods, holidays & leaves
```

---

## 🚀 Quickstart & Setup Instructions

### 1. Backend Setup
```bash
cd backend
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed the realistic dataset (31 employees, 20 brands, 4 pods)
python ../seed/sample_data.py

# Launch FastAPI server (runs on http://localhost:8000)
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
# Install dependencies
npm install

# Start Vite development server (runs on http://localhost:5173)
npm run dev

# Or build for production
npm run build
```

---

## 🧠 Tell Us How You Think (Assessment Section 8)

### 1. How did you model employees, brands, processes, pods, and their relationships?
- **Employees**: Modeled with core identity, pod association (`pod_id`), preferred weekly off days (`weekly_off_days`), weekly off count (`weekly_offs_per_week = 1`), and consecutive work limit (`max_consecutive_days = 6`).
- **Pods & Pod Leads**: Pods group employees under an assigned team lead (`lead_id` foreign key referencing `employees.id`).
- **Brands & Processes**: Brands represent client accounts. Processes (`CS`, `ACC`, `NDR`, `Retention`) define operational domains.
- **Assignments**: A many-to-many junction (`employee_id`, `brand_id`, `process_id`) defining which employee is certified/assigned to execute a specific process for a given brand.
- **Operating Rules**: Brand-process rules (`brand_id`, `process_id`, `operating_days`, `holiday_policy`, `min_coverage`, `coverage_overrides`), decoupling client operational requirements from individual employee contracts.

### 2. How does your system generate a roster and determine whether it satisfies the required constraints?
- Roster generation utilizes a constraint optimization model combined with an **independent dual-layer validation engine**:
  1. **Solver Layer**: Assigns binary decision variables $x_{e,d} \in \{0, 1\}$ (employee $e$ works on day $d$) subject to client minimum coverage, weekly off frequencies, approved leave freezes, and maximum consecutive day limits.
  2. **Independent Validator**: Completely decoupled from solver internals. Inspects any roster (auto-generated or manually edited) against all hard SLAs and soft preferences, emitting structured diagnostic issues (`COVERAGE_GAP`, `LEAVE_CONFLICT`, `WEEKLY_OFF_MISSING`, `MAX_CONSECUTIVE`, `PREFERENCE`).
  3. A roster can only be **Published** if `report.valid == true` (zero critical hard conflicts).

### 3. How did you handle the difference between single-resource brands and brands with multiple employees?
- **80% Single-Resource Dedicated Brands**: One dedicated owner is assigned to handle all processes for that brand. Because the owner must receive weekly rest and planned leaves, each pod is staffed with an agile **pod floater/backup** certified across those brands. When the dedicated owner takes a weekly off or leave, the engine automatically routes the floater to maintain 100% SLA coverage.
- **20% Multi-Resource Brands**: Staffed by 2 to 3 employees with overlapping process assignments (e.g. Employee A handles CS & ACC, Employee B handles CS & NDR, Employee C handles ACC & NDR). The solver staggers their weekly offs so that minimum staffing thresholds (e.g. Saturday surges needing 2 CS agents) are continuously maintained.

### 4. What happens when an employee manages all processes for a brand but is unavailable on a required working day?
- The system immediately flags a **`COVERAGE_GAP`** critical issue for that brand and process on that specific date.
- The **What-If Availability Lab** simulates this exact scenario in real time: it evaluates whether a certified pod floater can step in.
- If no certified floater is available or all eligible staff are already occupied, the diagnostic center flags the gap and provides actionable recommendations (e.g. recommending other employees within the pod who have process training on other brands for manager approval).

### 5. How does your system handle conflicting requirements or insufficient staffing?
- The engine enforces a strict hierarchy: **Mandatory Hard Constraints take precedence over Soft Preferences**.
  - Client operating coverage requirements and approved leaves are hard constraints.
  - An employee's preference for a specific day off (e.g. Sundays) is a soft constraint.
- When an inescapable conflict occurs (e.g. all certified staff are on leave simultaneously), the system refuses to silently generate an invalid roster. Instead, it transitions the roster to `Draft (Has Gaps)`, blocks publishing, and pinpoints the exact date, brand, and missing headcount in the Conflict Diagnostic Center.

### 6. Which parts of the process did you automate, and which did you leave under human control? Why?
- **Automated**:
  - Global combinatorial schedule generation across 30+ staff and 20+ brands.
  - Rest day pacing (ensuring no one works > 6 days in a row and everyone gets weekly rest).
  - Downstream conflict detection and coverage delta calculations.
- **Human Control**:
  - Final Roster Publishing (requires explicit operations manager review).
  - Manual Shift Overrides (managers can click any cell to manually toggle a shift; the system provides a preview impact check and locks the edit).
  - Adding new cross-brand assignments or granting process exception waivers.
- **Why**: Operations management requires contextual empathy and client nuance; algorithms should handle mathematical complexity while managers retain executive authority.

### 7. If the company doubled its team and brand count, what would you change about your solution?
- **Pod-Level Partitioning & Distributed Solving**: Decompose the solver to solve pod-by-pod in parallel, since single-resource brands and floaters are scoped to operational pods.
- **Role-Based Access Control (RBAC)**: Dedicated portal views where Pod Leads approve pod-level leave requests, while the Operations Manager oversees the global roster.
- **Database & Queue Scalability**: Transition from SQLite to PostgreSQL with background asynchronous job workers (Celery / Redis) for solving large monthly schedules with real-time WebSocket progress updates.

### 8. If you had one additional week to work on this, what would you improve first?
- **Automated Floater Shift Swapping**: Auto-proposing one-click peer shift swap recommendations when an employee requests emergency leave.
- **Interactive Multi-Month Continuity**: Carrying forward rolling 7-day rest constraints and consecutive day counters across calendar month boundaries.
- **Direct Google Sheets / Slack Integration**: Two-way sync to push published rosters directly to client Slack channels and pull leave requests from Google Sheets.
