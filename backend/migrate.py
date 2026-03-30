import json
import random
from database import get_db_connection

# Mock Data to Seed
MOCK_DATA = {
    "missions_data": [
        {"mission_name_english": "qa", "mission_name_hebrew": "תחקור"},
        {"mission_name_english": "new_missions", "mission_name_hebrew": "משימות חדשות"},
    ],
    "users": [
        {
            "display_name": "Yossi Cohen",
            "full_display_name": "Yossi Cohen",
            "origin_name": "Internal",
            "email": "yossi.c@mission-control.com",
            "hierarchy": "root/commander",
        },
        {
            "display_name": "Noa Levi",
            "full_display_name": "Noa Levi",
            "origin_name": "External",
            "email": "noa.l@field.com",
            "hierarchy": "root/field_op",
        },
    ],
    "teams": [
        {
            "team_name": "Alpha Squad",
            "team": "ALPHA",
            "parent_uuid": "00000000-0000-0000-0000-000000000000",
        },
        {
            "team_name": "Bravo Team",
            "team": "BRAVO",
            "parent_uuid": "00000000-0000-0000-0000-000000000000",
        },
    ],
    "geometries": [
        {
            "geometry_name": "Sector A-1",
            "geometry": "POLYGON((34.8 32.1, 34.9 32.1, 34.9 32.2, 34.8 32.2, 34.8 32.1))",
        },
        {
            "geometry_name": "Point of Interest 1",
            "geometry": "POINT(34.85 32.15)",
        },
    ],
}

def migrate():
    print("Starting migration via Python...")
    
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # 1. Extensions
            cur.execute('CREATE EXTENSION IF NOT EXISTS postgis')
            cur.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

            # 2. Schemas
            cur.execute('CREATE SCHEMA IF NOT EXISTS web_general')
            cur.execute('CREATE SCHEMA IF NOT EXISTS missions')

            # 3. Create Tables
            print("Creating tables...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS web_general.missions_data (
                    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    mission_name_english TEXT UNIQUE NOT NULL,
                    mission_name_hebrew TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS web_general.geometries (
                    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    geometry_name TEXT NOT NULL,
                    geometry geometry NOT NULL,
                    created_by TEXT DEFAULT 'system'
                );

                CREATE TABLE IF NOT EXISTS web_general.users (
                    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    display_name TEXT NOT NULL,
                    full_display_name TEXT NOT NULL,
                    origin_name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    hierarchy TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT now(),
                    updated_at TIMESTAMP DEFAULT now()
                );

                CREATE TABLE IF NOT EXISTS web_general.teams (
                    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    team_name TEXT UNIQUE NOT NULL,
                    team TEXT NOT NULL,
                    parent_uuid TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT now(),
                    updated_at TIMESTAMP DEFAULT now()
                );

                CREATE TABLE IF NOT EXISTS web_general.geometry_to_team (
                    geometry_uuid UUID NOT NULL,
                    mission_uuid UUID NOT NULL,
                    team_uuid UUID NOT NULL,
                    created_at TIMESTAMP DEFAULT now(),
                    updated_at TIMESTAMP DEFAULT now(),
                    PRIMARY KEY (geometry_uuid, mission_uuid, team_uuid)
                );

                CREATE TABLE IF NOT EXISTS web_general.user_to_team (
                    team_uuid UUID NOT NULL,
                    user_uuid UUID NOT NULL,
                    user_role TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT now(),
                    updated_at TIMESTAMP DEFAULT now(),
                    PRIMARY KEY (team_uuid, user_uuid)
                );

                CREATE TABLE IF NOT EXISTS missions.qa (
                    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    checks_amount INT NOT NULL,
                    geometry_uuids UUID[] NOT NULL,
                    frequency TEXT NOT NULL,
                    code_name TEXT NOT NULL,
                    code_type TEXT NOT NULL,
                    check_precent INT NOT NULL,
                    created_at TIMESTAMP DEFAULT now(),
                    updated_at TIMESTAMP DEFAULT now()
                );

                CREATE TABLE IF NOT EXISTS missions.new_missions (
                    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    h_values TEXT NOT NULL,
                    nm_values TEXT NOT NULL,
                    nm_id TEXT NOT NULL,
                    mpt_values TEXT NOT NULL,
                    type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    geometry_uuids UUID[],
                    from_time TIMESTAMP,
                    created_at TIMESTAMP DEFAULT now(),
                    updated_at TIMESTAMP DEFAULT now()
                );
            """)

            # 4. Clean Data for Fresh Seed
            print("Cleaning data...")
            cur.execute("DELETE FROM web_general.geometry_to_team")
            cur.execute("DELETE FROM web_general.user_to_team")
            cur.execute("DELETE FROM missions.qa")
            cur.execute("DELETE FROM missions.new_missions")
            cur.execute("DELETE FROM web_general.geometries")
            cur.execute("DELETE FROM web_general.missions_data")
            cur.execute("DELETE FROM web_general.users")
            cur.execute("DELETE FROM web_general.teams")

            # 5. Seed Missions
            print("Seeding missions...")
            mission_uuids = []
            for m in MOCK_DATA["missions_data"]:
                cur.execute(
                    "INSERT INTO web_general.missions_data (mission_name_english, mission_name_hebrew) VALUES (%s, %s) RETURNING uuid",
                    (m["mission_name_english"], m["mission_name_hebrew"])
                )
                mission_uuids.append(cur.fetchone()["uuid"])

            # 6. Seed Users
            print("Seeding users...")
            user_uuids = []
            for u in MOCK_DATA["users"]:
                cur.execute(
                    "INSERT INTO web_general.users (display_name, full_display_name, origin_name, email, hierarchy) VALUES (%s, %s, %s, %s, %s) RETURNING uuid",
                    (u["display_name"], u["full_display_name"], u["origin_name"], u["email"], u["hierarchy"])
                )
                user_uuids.append(cur.fetchone()["uuid"])

            # 7. Seed Teams
            print("Seeding teams...")
            team_uuids = []
            for t in MOCK_DATA["teams"]:
                cur.execute(
                    "INSERT INTO web_general.teams (team_name, team, parent_uuid) VALUES (%s, %s, %s) RETURNING uuid",
                    (t["team_name"], t["team"], t["parent_uuid"])
                )
                team_uuids.append(cur.fetchone()["uuid"])

            # 8. Seed Geometries
            print("Seeding geometries...")
            geometry_uuids = []
            for g in MOCK_DATA["geometries"]:
                cur.execute(
                    "INSERT INTO web_general.geometries (geometry_name, geometry) VALUES (%s, ST_GeomFromText(%s, 4326)) RETURNING uuid",
                    (g["geometry_name"], g["geometry"])
                )
                geometry_uuids.append(cur.fetchone()["uuid"])

            # 9. Relationships
            print("Setting up relationships...")
            roles = ['Team Lead', 'Operator', 'Analyst', 'Viewer']
            for u_id in user_uuids:
                cur.execute(
                    "INSERT INTO web_general.user_to_team (team_uuid, user_uuid, user_role) VALUES (%s, %s, %s)",
                    (random.choice(team_uuids), u_id, random.choice(roles))
                )

            for i, m_id in enumerate(mission_uuids):
                g_id = geometry_uuids[i % len(geometry_uuids)]
                cur.execute(
                    "INSERT INTO web_general.geometry_to_team (geometry_uuid, mission_uuid, team_uuid) VALUES (%s, %s, %s)",
                    (g_id, m_id, random.choice(team_uuids))
                )

            conn.commit()
            print("Migration complete!")

if __name__ == "__main__":
    migrate()
