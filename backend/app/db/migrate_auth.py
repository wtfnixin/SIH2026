"""
Database Migration & Auth Table Sync
Ensures Postgres has all modern auth columns and seeds initial accounts.
"""
import os
from sqlalchemy import text
from app.db.postgres_driver import engine, SessionLocal
from app.models.audit import User
from app.auth.password import hash_password

def migrate_and_seed():
    with engine.connect() as conn:
        # Add any missing columns to users table safely
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
            ("updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ]
        for col_name, col_type in columns:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                conn.commit()
            except Exception as e:
                print(f"Column {col_name} note:", e)

        # Add any missing columns to audit_logs table safely
        audit_cols = [
            ("user_id", "INTEGER"),
            ("session_id", "VARCHAR(100)"),
            ("ip_address", "VARCHAR(45)"),
            ("user_agent", "VARCHAR(255)"),
            ("status", "VARCHAR(20) DEFAULT 'SUCCESS'")
        ]
        for col_name, col_type in audit_cols:
            try:
                conn.execute(text(f"ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                conn.commit()
            except Exception as e:
                print(f"Audit column {col_name} note:", e)

        # Ensure user_sessions table exists with exact columns
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS user_sessions (
            id VARCHAR(64) PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            refresh_token_hash VARCHAR(64) NOT NULL,
            ip_address VARCHAR(45),
            user_agent VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            revoked_at TIMESTAMP
        );
        """))
        conn.commit()

        try:
            conn.execute(text("ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))
            conn.commit()
        except Exception as e:
            print("user_sessions alter note:", e)

    # Seed accounts
    db = SessionLocal()
    try:
        seed_users = [
            {
                "username": "admin",
                "email": "admin@sih2026.gov.in",
                "full_name": "Chief Cyber Administrator",
                "password": "Admin@Secure2026!",
                "role": "ADMIN"
            },
            {
                "username": "investigator",
                "email": "dsp.sharma@police.gov.in",
                "full_name": "DSP Vikrant Sharma (Lead Investigator)",
                "password": "Investigator@2026!",
                "role": "INVESTIGATOR"
            },
            {
                "username": "analyst",
                "email": "analyst.patel@cybercell.gov.in",
                "full_name": "SI Rajesh Patel (Cyber Analyst)",
                "password": "Analyst@Secure2026!",
                "role": "ANALYST"
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
                    is_active=True,
                    is_locked=False,
                    failed_login_attempts=0
                )
                db.add(user)
                print(f"Created seed user: {u['username']} ({u['role']})")
            else:
                user.full_name = u["full_name"]
                user.role = u["role"]
                user.is_active = True
                user.is_locked = False
                user.password_hash = hash_password(u["password"])
                print(f"Updated password for existing user: {u['username']}")

        db.commit()
        print("Auth database migration and user seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print("Migration error:", e)
    finally:
        db.close()

if __name__ == "__main__":
    migrate_and_seed()
