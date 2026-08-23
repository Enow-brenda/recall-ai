import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db.connector import SessionLocal
from app.db.models import Provider, Plan

PROVIDERS = [
    {"key": "gmail", "display_name": "Gmail", "auth_type": "oauth",
     "is_active": True, "activated_at": func.now()},
    {"key": "whatsapp", "display_name": "WhatsApp",
     "auth_type": "phone_verification", "is_active": False, "activated_at": None},
    {"key": "slack", "display_name": "Slack",
     "auth_type": "oauth", "is_active": False, "activated_at": None},
    {"key": "sms", "display_name": "SMS",
     "auth_type": "phone_verification", "is_active": False, "activated_at": None},
]

PLANS = [
    {"name": "free", "max_daily_queries": 25, "price": 0.00, "memory_limit_gb": 0.5},
    {"name": "pro", "max_daily_queries": -1, "price": 9.99, "memory_limit_gb": 50},   # -1 = unlimited
]

def seed() -> None:
    db = SessionLocal()
    try:
        for row in PROVIDERS:
            stmt = (
                pg_insert(Provider)
                .values(**row)
                .on_conflict_do_update(
                    index_elements=[Provider.key],
                    set_={
                        "display_name": row["display_name"],
                        "auth_type": row["auth_type"],
                        "is_active": row["is_active"],
                    },
                )
            )
            db.execute(stmt)

        for row in PLANS:
            stmt = (
                pg_insert(Plan)
                .values(**row)
                .on_conflict_do_update(
                    index_elements=[Plan.name],          # conflict target = unique column
                    set_={
                        "max_daily_queries": row["max_daily_queries"],
                        "memory_limit_gb": row["memory_limit_gb"],
                    },
                )
            )
            db.execute(stmt)

        db.commit()  # commit the changes to the database
        print(f"Seeded {len(PROVIDERS)} providers and {len(PLANS)} plans")
    finally:
        db.close()


if __name__ == "__main__":
    seed()