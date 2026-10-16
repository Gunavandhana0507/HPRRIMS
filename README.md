# HPRRIMS

Hospital Patient Records, Readmission and ICU Management System. An academic full-stack project for managing patients, admissions, discharges, medical records, 30-day readmission detection, readmission risk prediction and ICU bed allocation.

> **Synthetic data only.** Every patient in the development database is generated. Do not enter real patient information.
>
> **Advisory models.** The readmission and ICU priority models are trained on synthetic data. Their output supports, and never replaces, clinical judgement.

## Architecture

```
React (Vite) frontend  :5173
        | HTTP/JSON + JWT
        v
Spring Boot backend    :8080 ----> MySQL 8          :3306
        |
        +---------------------> FastAPI ML service :8001
                                 (scikit-learn, joblib)
```

| Folder | Stack |
| --- | --- |
| `frontend/` | React 18, Vite 5, React Router 6, Axios, Tailwind CSS, Recharts, Lucide React |
| `backend/` | Java 17, Spring Boot 3.3, Spring Web, Spring Data JPA/Hibernate, Spring Security + JWT, Bean Validation, Actuator, springdoc-openapi |
| `database/` | `schema.sql` (tables, keys, constraints, indexes). The backend runs the same script on startup. |
| `ml-service/` | Python 3.10+, FastAPI, Uvicorn, pandas, NumPy, scikit-learn, Joblib |

## Prerequisites

- Java 17+ and Maven 3.9+
- Node.js 20+
- Python 3.10+
- MySQL 8.0+ (local install, MySQL Workbench, or Docker)

## 1. Database

Create the database and user (MySQL Workbench or the `mysql` client):

```sql
CREATE DATABASE hprrims CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hprrims'@'%' IDENTIFIED BY 'choose-a-password';
GRANT ALL PRIVILEGES ON hprrims.* TO 'hprrims'@'%';
FLUSH PRIVILEGES;
```

Tables are created by the backend from `backend/src/main/resources/schema.sql` on first start (a copy is in `database/schema.sql` for review in Workbench).

Docker alternative:

```bash
docker run -d --name hprrims-mysql -p 3306:3306 \
  -e MYSQL_DATABASE=hprrims -e MYSQL_USER=hprrims -e MYSQL_PASSWORD=hprrims_pass \
  -e MYSQL_ROOT_PASSWORD=rootpass mysql:8.0
```

## 2. ML service

```bash
cd ml-service
python -m venv .venv
.venv\Scripts\activate          # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
python -m training.train_models  # optional: retrains models into models/
uvicorn app.main:app --port 8001
```

Check: `http://localhost:8001/health` returns `{"status":"UP","models_loaded":true}`. Interactive docs: `http://localhost:8001/docs`.

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Liveness and model load status |
| `GET /models` | Model versions, features and evaluation metrics |
| `POST /predict/readmission` | Logistic regression: 30-day readmission probability and risk level |
| `POST /predict/icu-priority` | Random forest classifier: advisory ICU priority (LOW to CRITICAL) |

If `ML_SERVICE_API_KEY` is set, callers must send it in the `X-Service-Key` header. Set the same value for the backend.

## 3. Backend

```bash
cd backend
# Windows PowerShell
$env:SPRING_PROFILES_ACTIVE="dev"; $env:DB_PASSWORD="choose-a-password"
mvn spring-boot:run
```

All variables are listed in `backend/.env.example`. The `dev` profile supplies local defaults and enables the demo seeder. Without the `dev` profile, `DB_USERNAME`, `DB_PASSWORD` and `JWT_SECRET` are required and no demo users are created.

- API base: `http://localhost:8080/api`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- Health: `http://localhost:8080/actuator/health`

## 4. Frontend

```bash
cd frontend
copy .env.example .env.local     # macOS/Linux: cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:5173`. `VITE_API_BASE_URL` is the only frontend setting; no secrets are shipped to the browser.

## Docker Compose (optional)

`docker compose up --build` starts MySQL, the ML service, the backend (dev profile with seed data) and the frontend on the same ports as above.

## Demo accounts (development seed only)

Created by `DevDataSeeder` when the `dev` profile is active and the `users` table is empty. Not created in any other profile.

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin` | `Admin@2026` |
| Doctor | `dr.mehta` | `Doctor@2026` |
| Doctor | `dr.rao` | `Doctor@2026` |
| Hospital Staff | `staff.priya` | `Staff@2026` |
| Hospital Staff | `staff.arun` | `Staff@2026` |

The seed also creates 24 synthetic patients, 47 admissions (including readmissions), medical records, saved predictions, 8 ICU beds and ICU requests. To reseed, empty the database and restart the backend.

## Roles

Permissions are enforced by Spring Security on every endpoint (`@PreAuthorize`), and the React routes and menus mirror them. Missing or invalid tokens return 401; insufficient role returns 403.

| Capability | Admin | Doctor | Staff |
| --- | :-: | :-: | :-: |
| Dashboards | Admin | Doctor | Staff |
| Search patients, view profiles and admission history | Yes | Yes | Yes |
| Register patients, create admissions, assign doctors, discharge | Corrections only | No | Yes |
| View diagnoses, prescriptions, treatment notes | Yes | Yes | No |
| Add medical records (assigned active admission) | No | Yes | No |
| Correct medical records (with audited reason) | Yes | Own entries | No |
| View / request readmission predictions | Yes | Yes | Retry after discharge |
| Submit ICU requests | No | No | Yes |
| Allocate / reject ICU requests, manage beds | Yes | No | No |
| Reports, users, audit log, settings | Yes | No | No |

## Business rules implemented

- **Patient ID** is generated by the backend (`PAT-000001` format). Date of birth must be in the past.
- **One active admission** per patient. Admission time cannot precede date of birth or be in the future.
- **Readmission detection** (Spring Boot, rule-based): on admission, the patient's most recent previous discharge is found; if the new admission starts within the configured window (default 30 days, Admin > Settings), the admission is flagged and linked to the previous one. Runs in the same transaction as the admission insert.
- **Discharge** only for `ADMITTED` admissions; discharge time must be after admission time. Repeated discharge requests are rejected. Staff may edit discharge details for 24 hours (`app.discharge.staff-edit-hours`); afterwards only Admin corrections with a reason are accepted and audited.
- **Readmission prediction** is requested from the ML service after each discharge. If the service is down the discharge still succeeds, the admission is marked "prediction unavailable", and an authorised user can retry.
- **Medical records** have no delete endpoint. Corrections keep the previous version in `medical_record_revisions` with the reason and author.
- **ICU allocation** locks the bed row (`PESSIMISTIC_WRITE`) so two administrators cannot allocate the same bed. ICU priority is advisory; if scoring fails the request is saved as unscored and can be rescored.
- **Audit log** records sign-ins, failed sign-ins, user changes, patient corrections, admissions, discharges, record corrections, ICU decisions and setting changes.
- **Reports** (Admin > Reports) are CSV files built from the database, with spreadsheet formula injection neutralised.

## Assumptions

The original brief was cut off in section 7.12. Where it was silent, these conservative choices were made and can be changed:

- The readmission window counts calendar time from the previous discharge to the new admission (`<=` window days).
- Doctors cannot register patients; the brief lists this as "unless explicitly authorized".
- Admins do not add medical records; they can correct them with a reason.
- Risk levels (set in the ML service): probability below 0.35 is Low, 0.35 to below 0.65 Medium, 0.65 and above High.

## Production cautions

This is an academic MVP. Before any real deployment: use a strong `JWT_SECRET` from a secret store, disable the `dev` profile and seeder, serve over HTTPS, restrict CORS, set `ML_SERVICE_API_KEY`, review data-protection obligations, and have clinical stakeholders validate the models on real data. No legal or regulatory compliance is claimed.
