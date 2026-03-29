import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": os.getenv("DB_PORT", "5432"),
    "dbname": os.getenv("DB_NAME", "wolt"),
}

def alter():
    conn_str = f"user={DB_CONFIG['user']} password={DB_CONFIG['password']} host={DB_CONFIG['host']} port={DB_CONFIG['port']} dbname={DB_CONFIG['dbname']}"
    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            # Check if column exists as geometry_uuid, if so rename and alter type
            try:
                cur.execute('ALTER TABLE missions.qa RENAME COLUMN geometry_uuid TO geometry_uuids')
                cur.execute('ALTER TABLE missions.qa ALTER COLUMN geometry_uuids TYPE UUID[] USING ARRAY[geometry_uuids]')
                print("qa table altered.")
            except Exception as e:
                print(f"Error altering qa table: {e}")
                conn.rollback()
            try:
                cur.execute('ALTER TABLE missions.new_missions RENAME COLUMN geometry_uuid TO geometry_uuids')
                cur.execute('ALTER TABLE missions.new_missions ALTER COLUMN geometry_uuids TYPE UUID[] USING ARRAY[geometry_uuids]')
                print("new_missions table altered.")
            except Exception as e:
                print(f"Error altering new_missions table: {e}")
                conn.rollback()
            conn.commit()

if __name__ == "__main__":
    alter()
