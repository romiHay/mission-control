import json
import traceback
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import get_db_connection
from models import RuleCreate
from typing import List
import traceback

last_errors = []

app = FastAPI(title="Mission Control Backend")

@app.on_event("startup")
def startup_event():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Add/Migrate geometry_uuid to geometry_uuids UUID[]
                for table in ['missions.qa', 'missions.new_missions']:
                    try:
                        cur.execute(f"ALTER TABLE {table} RENAME COLUMN geometry_uuid TO geometry_uuids")
                        cur.execute(f"ALTER TABLE {table} ALTER COLUMN geometry_uuids TYPE UUID[] USING ARRAY[geometry_uuids]")
                    except Exception:
                        conn.rollback() # column may already exist or renamed, ignore
                    else:
                        conn.commit()
    except Exception as e:
        print("Startup db check failed:", e)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/missions")
def get_missions():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        uuid as id, 
                        mission_name_english as name, 
                        mission_name_hebrew as "nameHebrew",
                        '' as description
                    FROM web_general.missions_data
                """)
                return cur.fetchall()
    except Exception as e:
        print(f"Error fetching missions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch missions")

@app.get("/api/geometries")
def get_geometries():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        g.uuid as id,
                        g.geometry_name as name,
                        g.created_by,
                        ST_AsGeoJSON(g.geometry)::json as geojson,
                        gt.mission_uuid as "missionId",
                        COALESCE(
                            (SELECT uuid FROM missions.qa WHERE g.uuid = ANY(geometry_uuids) LIMIT 1),
                            (SELECT uuid FROM missions.new_missions WHERE g.uuid = ANY(geometry_uuids) LIMIT 1)
                        ) as "ruleId"
                    FROM web_general.geometries g
                    LEFT JOIN web_general.geometry_to_team gt ON g.uuid = gt.geometry_uuid
                """)
                rows = cur.fetchall()
                
                formatted = []
                for row in rows:
                    geo = row['geojson']
                    coords = geo['coordinates']
                    
                    # GeoJSON is [lng, lat], Leaflet (frontend) expects [lat, lng]
                    if geo['type'] == 'Point':
                        coords = [coords[1], coords[0]]
                    elif geo['type'] == 'Polygon':
                        # GeoJSON polygons are nested [[[lng, lat], ...]]
                        # Leaflet wants [[lat, lng], ...]
                        coords = [[c[1], c[0]] for c in coords[0]]
                    
                    formatted.append({
                        "id": row['id'],
                        "name": row['name'],
                        "missionId": row['missionId'],
                        "type": geo['type'],
                        "coordinates": coords,
                        "ruleId": row['ruleId'],
                        "createdBy": row['created_by']
                    })
                return formatted
    except Exception as e:
        last_errors.append(f"get_geometries error: {e}")
        print(f"Error fetching geometries: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch geometries")

@app.get("/api/last-error")
def get_last_error():
    return {"errors": last_errors}

@app.get("/api/rules")
def get_rules():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Fetch QA rules
                cur.execute("""
                    SELECT 
                        uuid as id,
                        code_name as name,
                        'QA Check: ' || frequency as description,
                        'Checks: ' || checks_amount || ', Percent: ' || check_precent || '%' as value,
                        geometry_uuids as "geometryIds",
                        json_build_object(
                            'code_name', code_name,
                            'frequency', frequency,
                            'code_type', code_type,
                            'checks_amount', checks_amount,
                            'check_precent', check_precent
                        ) as parameters,
                        (SELECT uuid FROM web_general.missions_data WHERE mission_name_english = 'qa' LIMIT 1) as "missionId"
                    FROM missions.qa
                """)
                qa_rules = cur.fetchall()

                # Fetch New Mission rules
                cur.execute("""
                    SELECT 
                        uuid as id,
                        nm_values as name,
                        'Status: ' || status || ' | Type: ' || type as description,
                        'MPT: ' || mpt_values as value,
                        geometry_uuids as "geometryIds",
                        json_build_object(
                            'nm_values', nm_values,
                            'status', status,
                            'type', type,
                            'mpt_values', mpt_values,
                            'h_values', h_values,
                            'nm_id', nm_id
                        ) as parameters,
                        (SELECT uuid FROM web_general.missions_data WHERE mission_name_english = 'new_missions' LIMIT 1) as "missionId"
                    FROM missions.new_missions
                """)
                nm_rules = cur.fetchall()

                all_rules = qa_rules + nm_rules
                
                # Make sure geometryIds is a list even if NULL
                for rule in all_rules:
                    rule['geometryIds'] = rule.get('geometryIds') or []
                
                return all_rules
    except Exception as e:
        print(f"Error fetching rules: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch rules")

@app.post("/api/rules")
def create_rule(data: RuleCreate):
    rule = data.rule
    new_geo = data.newGeo
    
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT mission_name_english FROM web_general.missions_data WHERE uuid = %s",
                    (rule.missionId,)
                )
                mission_res = cur.fetchone()
                if not mission_res:
                    raise HTTPException(status_code=404, detail="Mission not found")
                
                mission_name = mission_res['mission_name_english']
                
                # Combine existing IDs with potentially new ones
                final_geo_ids = [gid for gid in (rule.geometryIds or []) if not gid.startswith('g-')]
                if rule.geometryId and not rule.geometryId.startswith('g-') and rule.geometryId not in final_geo_ids:
                    final_geo_ids.append(rule.geometryId)

                geos_to_insert = data.newGeos if data.newGeos else ([data.newGeo] if data.newGeo else [])
                
                for geo in geos_to_insert:
                    if geo.type == 'Point':
                        geo_json = {"type": "Point", "coordinates": [geo.coordinates[1], geo.coordinates[0]]}
                    else:
                        poly_ring = [[c[1], c[0]] for c in geo.coordinates]
                        if poly_ring and poly_ring[0] != poly_ring[-1]:
                            poly_ring.append(poly_ring[0])
                        geo_json = {"type": "Polygon", "coordinates": [poly_ring]}
                    
                    cur.execute("""
                        INSERT INTO web_general.geometries (geometry_name, geometry, created_by)
                        VALUES (%s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326), 'user')
                        RETURNING uuid
                    """, (geo.name, json.dumps(geo_json)))
                    gid = cur.fetchone()['uuid']
                    final_geo_ids.append(str(gid))

                    cur.execute("""
                        INSERT INTO web_general.geometry_to_team (geometry_uuid, mission_uuid, team_uuid)
                        VALUES (%s, %s, (SELECT uuid FROM web_general.teams LIMIT 1))
                        ON CONFLICT DO NOTHING
                    """, (gid, rule.missionId))

                params = rule.parameters or {}
                if mission_name == 'qa':
                    cur.execute("""
                        INSERT INTO missions.qa (code_name, frequency, code_type, geometry_uuids, checks_amount, check_precent)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (
                        params.get('code_name', rule.name),
                        params.get('frequency', rule.description),
                        params.get('code_type', rule.value),
                        final_geo_ids,
                        params.get('checks_amount') if params.get('checks_amount') not in (None, "") else 1,
                        params.get('check_precent') if params.get('check_precent') not in (None, "") else 100
                    ))
                elif mission_name == 'new_missions':
                    cur.execute("""
                        INSERT INTO missions.new_missions (nm_values, status, type, geometry_uuids, h_values, nm_id, mpt_values)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        params.get('nm_values', rule.name),
                        params.get('status', rule.description),
                        params.get('type', rule.value),
                        final_geo_ids,
                        params.get('h_values', 'default'),
                        params.get('nm_id', 'default'),
                        params.get('mpt_values', 'default')
                    ))
                else:
                    raise HTTPException(status_code=400, detail=f"Unknown mission type: {mission_name}")
                
                conn.commit()
                return {"message": "Rule saved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        last_errors.append(f"create_rule error: {e}\n{traceback.format_exc()}")
        print(f"Error saving rule: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/rules/{rule_id}")
def update_rule(rule_id: str, data: RuleCreate):
    rule = data.rule
    new_geo = data.newGeo
    
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT mission_name_english FROM web_general.missions_data WHERE uuid = %s",
                    (rule.missionId,)
                )
                mission_res = cur.fetchone()
                if not mission_res:
                    raise HTTPException(status_code=404, detail="Mission not found")
                
                mission_name = mission_res['mission_name_english']

                final_geo_ids = [gid for gid in (rule.geometryIds or []) if not gid.startswith('g-')]
                if rule.geometryId and not rule.geometryId.startswith('g-') and rule.geometryId not in final_geo_ids:
                    final_geo_ids.append(rule.geometryId)

                geos_to_insert = data.newGeos if data.newGeos else ([data.newGeo] if data.newGeo else [])

                for geo in geos_to_insert:
                    if geo.type == 'Point':
                        geo_json = {"type": "Point", "coordinates": [geo.coordinates[1], geo.coordinates[0]]}
                    else:
                        poly_ring = [[c[1], c[0]] for c in geo.coordinates]
                        if poly_ring and poly_ring[0] != poly_ring[-1]:
                            poly_ring.append(poly_ring[0])
                        geo_json = {"type": "Polygon", "coordinates": [poly_ring]}
                    
                    cur.execute("""
                        INSERT INTO web_general.geometries (geometry_name, geometry, created_by)
                        VALUES (%s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326), 'user')
                        RETURNING uuid
                    """, (geo.name, json.dumps(geo_json)))
                    gid = cur.fetchone()['uuid']
                    final_geo_ids.append(str(gid))

                    cur.execute("""
                        INSERT INTO web_general.geometry_to_team (geometry_uuid, mission_uuid, team_uuid)
                        VALUES (%s, %s, (SELECT uuid FROM web_general.teams LIMIT 1))
                        ON CONFLICT DO NOTHING
                    """, (gid, rule.missionId))

                params = rule.parameters or {}
                if mission_name == 'qa':
                    cur.execute("""
                        UPDATE missions.qa 
                        SET code_name = %s, frequency = %s, code_type = %s, geometry_uuids = %s, checks_amount = %s, check_precent = %s
                        WHERE uuid = %s
                    """, (
                        params.get('code_name', rule.name),
                        params.get('frequency', rule.description),
                        params.get('code_type', rule.value),
                        final_geo_ids,
                        params.get('checks_amount') if params.get('checks_amount') not in (None, "") else 1,
                        params.get('check_precent') if params.get('check_precent') not in (None, "") else 100,
                        rule_id
                    ))
                elif mission_name == 'new_missions':
                    cur.execute("""
                        UPDATE missions.new_missions 
                        SET nm_values = %s, status = %s, type = %s, geometry_uuids = %s, h_values = %s, nm_id = %s, mpt_values = %s
                        WHERE uuid = %s
                    """, (
                        params.get('nm_values', rule.name),
                        params.get('status', rule.description),
                        params.get('type', rule.value),
                        final_geo_ids,
                        params.get('h_values', 'default'),
                        params.get('nm_id', 'default'),
                        params.get('mpt_values', 'default'),
                        rule_id
                    ))
                
                conn.commit()
                return {"message": "Rule updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        last_errors.append(f"update_rule error: {e}\n{traceback.format_exc()}")
        print(f"Error updating rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/rules/{rule_id}")
def delete_rule(rule_id: str):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Try deleting from both tables
                cur.execute("DELETE FROM missions.qa WHERE uuid = %s", (rule_id,))
                deleted_qa = cur.rowcount
                
                cur.execute("DELETE FROM missions.new_missions WHERE uuid = %s", (rule_id,))
                deleted_nm = cur.rowcount
                
                if deleted_qa == 0 and deleted_nm == 0:
                    raise HTTPException(status_code=404, detail="Rule not found")
                
                conn.commit()
                return {"message": "Rule deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting rule: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete rule")

@app.delete("/api/geometries/{geo_id}")
def delete_geometry(geo_id: str):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Cleanup geometry_to_team mapping first
                cur.execute("DELETE FROM web_general.geometry_to_team WHERE geometry_uuid = %s", (geo_id,))
                
                # Basic protection: only delete if created_by='user'
                cur.execute("DELETE FROM web_general.geometries WHERE uuid = %s AND created_by = 'user'", (geo_id,))
                if cur.rowcount == 0:
                    conn.rollback() # Rollback the previous delete if geometry wasn't deleted
                    raise HTTPException(status_code=404, detail="Geometry not found or cannot be deleted")
                
                conn.commit()
                return {"message": "Geometry deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting geometry: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete geometry")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
