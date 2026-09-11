"""
Database Migration & Enterprise Security Seed Script.
Ensures Postgres tables (Auth, ABAC, Audit Ledger, Evidence Vault, Break-Glass)
are created, seeds realistic police roles with ABAC attributes, hashes evidence files,
and initializes the cryptographic ledger genesis block.
"""
import os
import json
from pathlib import Path
from sqlalchemy import text
from app.db.postgres_driver import engine, SessionLocal, Base
from app.models.audit import User, AuditLog
from app.models.session import UserSession
from app.models.rbac import Role, Permission, RolePermission, ROLE_PERMISSIONS_MAP
from app.models.ledger import AuditLedgerBlock
from app.models.evidence import EvidenceVaultRecord
from app.models.break_glass import BreakGlassRequest
from app.auth.password import hash_password
from app.services.integrity_service import register_evidence_file
from app.services.ledger_service import append_ledger_event


def migrate_and_seed():
    # 1. Create all tables in PostgreSQL
    Base.metadata.create_all(bind=engine)

    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50);"))
            conn.commit()
        except Exception:
            pass

        # Add any missing ABAC columns to users table safely
        columns = [
            ("full_name", "VARCHAR(100)"),
            ("password_hash", "VARCHAR(255)"),
            ("is_active", "BOOLEAN DEFAULT TRUE"),
            ("is_locked", "BOOLEAN DEFAULT FALSE"),
            ("failed_login_attempts", "INTEGER DEFAULT 0"),
            ("last_failed_login", "TIMESTAMP"),
            ("locked_until", "TIMESTAMP"),
            ("last_login_at", "TIMESTAMP"),
            ("password_changed_at", "TIMESTAMP"),
            ("department", "VARCHAR(100) DEFAULT 'Cyber Crime Division'"),
            ("jurisdiction", "VARCHAR(100) DEFAULT 'Bengaluru City'"),
            ("clearance_level", "VARCHAR(30) DEFAULT 'CONFIDENTIAL'"),
            ("assigned_cases", "JSON DEFAULT '[]'::json"),
            ("updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ]
        for col_name, col_type in columns:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                conn.commit()
            except Exception as e:
                pass

    db = SessionLocal()
    try:
        # 2. Seed Default Police Accounts with ABAC context
        seed_users = [
            {
                "username": "admin",
                "email": "admin@sih2026.gov.in",
                "full_name": "Chief Information Security Officer (Admin)",
                "password": "Admin@Secure2026!",
                "role": "SYSTEM_ADMINISTRATOR",
                "department": "National Cyber Crime Bureau",
                "jurisdiction": "National",
                "clearance_level": "HIGHLY_RESTRICTED",
                "assigned_cases": ["FIR-2026-0891", "FIR-2026-0412", "FIR-2026-0104", "FIR-2026-0099", "FIR-2026-0055"]
            },
            {
                "username": "officer_sharma",
                "email": "dsp.sharma@ksp.gov.in",
                "full_name": "DSP Vikrant Sharma (Investigation Officer)",
                "password": "sih2026_secure",
                "role": "INVESTIGATION_OFFICER",
                "department": "Special Investigation Division",
                "jurisdiction": "Bengaluru City",
                "clearance_level": "RESTRICTED",
                "assigned_cases": ["FIR-2026-0891", "FIR-2026-0412", "FIR-2026-0104"]
            },
            {
                "username": "analyst_patel",
                "email": "si.patel@cybercell.gov.in",
                "full_name": "Sub-Inspector Rajesh Patel (Financial Analyst)",
                "password": "Analyst@Secure2026!",
                "role": "INTELLIGENCE_ANALYST",
                "department": "Financial Crime & Hawala Unit",
                "jurisdiction": "Karnataka State",
                "clearance_level": "CONFIDENTIAL",
                "assigned_cases": ["FIR-2026-0891", "FIR-2026-0412"]
            },
            {
                "username": "supervisor_deshmukh",
                "email": "acp.deshmukh@ksp.gov.in",
                "full_name": "ACP Anjali Deshmukh (Case Supervisor)",
                "password": "Supervisor@2026!",
                "role": "CASE_SUPERVISOR",
                "department": "Central Crime Branch",
                "jurisdiction": "Bengaluru City",
                "clearance_level": "HIGHLY_RESTRICTED",
                "assigned_cases": ["FIR-2026-0891", "FIR-2026-0412", "FIR-2026-0104", "FIR-2026-0099"]
            },
            {
                "username": "auditor_verma",
                "email": "auditor.verma@mha.gov.in",
                "full_name": "Senior Auditor Suresh Verma",
                "password": "Auditor@Secure2026!",
                "role": "AUDITOR",
                "department": "Police Oversight & Integrity Commission",
                "jurisdiction": "National",
                "clearance_level": "HIGHLY_RESTRICTED",
                "assigned_cases": []
            }
        ]

        for u in seed_users:
            user = db.query(User).filter(User.username == u["username"]).first()
            if not user:
                user = User(
                    username=u["username"],
                    email=u["email"],
                    full_name=u["full_name"],
                    password_hash=hash_password(u["password"]),
                    role=u["role"],
                    department=u["department"],
                    jurisdiction=u["jurisdiction"],
                    clearance_level=u["clearance_level"],
                    assigned_cases=u["assigned_cases"],
                    is_active=True,
                    is_locked=False,
                    failed_login_attempts=0
                )
                db.add(user)
                print(f"Provisioned Officer: {u['username']} ({u['role']}, Clearance: {u['clearance_level']})")
            else:
                user.full_name = u["full_name"]
                user.role = u["role"]
                user.department = u["department"]
                user.jurisdiction = u["jurisdiction"]
                user.clearance_level = u["clearance_level"]
                user.assigned_cases = u["assigned_cases"]
                user.is_active = True
                user.is_locked = False
                user.password_hash = hash_password(u["password"])
                print(f"Updated Officer ABAC Profile: {u['username']}")

        db.commit()

        # 3. Seed Genesis Block in Cryptographic Ledger if empty
        block_count = db.query(AuditLedgerBlock).count()
        if block_count == 0:
            genesis_block = append_ledger_event(
                db=db,
                actor_username="SYSTEM",
                action="GENESIS_INITIALIZATION",
                target_entity="SYSTEM_ROOT",
                details="PS189 Cryptographic Tamper-Evident Audit Ledger Initialized."
            )
            print(f"Initialized Ledger Genesis Block #{genesis_block.block_index} (Hash: {genesis_block.current_hash[:16]}...)")

        # 4. Hash and register synthetic dataset files into Evidence Vault
        base_dir = Path(__file__).resolve().parent.parent.parent.parent
        data_dirs = [
            Path("/app/data/cleaned_datasets"),
            Path("/app/data/synthetic_data"),
            Path("/app/data/uploads"),
            base_dir / "data" / "cleaned_datasets",
            base_dir / "data" / "synthetic_data",
            base_dir / "data" / "uploads"
        ]

        registered_ev = 0
        seen_paths = set()
        for d in data_dirs:
            if d.exists() and d.is_dir():
                for f in d.glob("*.*"):
                    if f.is_file() and f.suffix.lower() in [".json", ".csv", ".txt", ".pdf"] and str(f) not in seen_paths:
                        seen_paths.add(str(f))
                        try:
                            # determine evidence type
                            fn = f.name.lower()
                            ev_t = "CDR"
                            if "trans" in fn or "bank" in fn or "upi" in fn:
                                ev_t = "BANK_TRANSACTION"
                            elif "vehicle" in fn or "anpr" in fn or "toll" in fn:
                                ev_t = "ANPR_LOG"
                            elif "surv" in fn or "field" in fn or "intel" in fn:
                                ev_t = "SURVEILLANCE"
                            elif "fir" in fn:
                                ev_t = "FIR_DOCUMENT"

                            register_evidence_file(
                                db=db,
                                file_path=f,
                                case_id="FIR-2026-0891",
                                evidence_type=ev_t,
                                ingested_by="SYSTEM_INGEST",
                                classification="CONFIDENTIAL"
                            )
                            registered_ev += 1
                        except Exception as ex:
                            pass

        print(f"Registered and SHA-256 hashed {registered_ev} evidence files in Cryptographic Vault.")
        db.commit()
        print("Enterprise Security Architecture & ABAC Database Migration Completed Successfully!")

    except Exception as e:
        db.rollback()
        print("Migration error:", e)
    finally:
        db.close()


if __name__ == "__main__":
    migrate_and_seed()
