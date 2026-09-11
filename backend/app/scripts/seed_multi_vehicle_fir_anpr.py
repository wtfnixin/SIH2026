"""
Script to ensure every single FIR case (FIR-2026-001 through FIR-2026-025 and test FIRs)
has 2 to 4 distinct vehicles with rich ANPR camera movement trajectories in Neo4j.
"""
import random
from datetime import datetime, timedelta
from app.db.neo4j_driver import get_neo4j_session

ANPR_SURVEILLANCE_CORRIDORS = [
    ("MG Road, Bengaluru", "ANPR_CAM_BLR_01"),
    ("Whitefield, Bengaluru", "ANPR_CAM_BLR_02"),
    ("Koramangala, Bengaluru", "ANPR_CAM_BLR_03"),
    ("Indiranagar, Bengaluru", "ANPR_CAM_BLR_04"),
    ("Jayanagar, Bengaluru", "ANPR_CAM_BLR_05"),
    ("Hebbal, Bengaluru", "ANPR_CAM_BLR_06"),
    ("Marathahalli, Bengaluru", "ANPR_CAM_BLR_07"),
    ("HSR Layout, Bengaluru", "ANPR_CAM_BLR_08"),
    ("Electronic City, Bengaluru", "ANPR_CAM_BLR_09"),
    ("Yelahanka, Bengaluru", "ANPR_CAM_BLR_10"),
    ("Delhi Gate Toll", "ANPR_CAM_DEL_01"),
    ("Sector 62 Noida Gantry", "ANPR_CAM_NOIDA_02"),
    ("NH-48 Gurgaon Plaza", "ANPR_CAM_GGN_03"),
    ("Connaught Place North", "ANPR_CAM_DEL_04"),
    ("Cyber City Flyover", "ANPR_CAM_GGN_05"),
    ("Ashram Chowk ANPR", "ANPR_CAM_DEL_06"),
    ("Greater Noida Expressway", "ANPR_CAM_GNOIDA_07"),
    ("Faridabad Toll Plaza", "ANPR_CAM_FBD_08"),
]

def seed_multi_vehicle_firs():
    with get_neo4j_session() as session:
        print("Fetching all FIR cases from Neo4j...")
        firs = session.run("MATCH (f:FIR) RETURN f.fir_no AS fir_no").data()
        
        base_time = datetime(2026, 8, 1, 6, 0, 0)
        total_vehicles_linked = 0
        total_sightings_added = 0

        for idx, f in enumerate(firs):
            fir_no = f["fir_no"]
            
            # Extract number from FIR ID or default to idx
            fir_num = f"{idx+1:03d}"
            
            # Define 2 to 3 distinct vehicles for this FIR case
            v_list = [
                (f"KA-{fir_num[:2]}-HH-{1000+idx*12}", f"Primary Suspect A ({fir_no})", "SUV"),
                (f"KA-{(idx+2)%99:02d}-AB-{2000+idx*17}", f"Accomplice B ({fir_no})", "Sedan"),
                (f"DL-{(idx+3)%99:02d}-XY-{3000+idx*23}", f"Getaway Vehicle ({fir_no})", "Hatchback"),
            ]

            for v_idx, (plate, owner_name, model) in enumerate(v_list):
                clean_plate = plate.replace("-", "").upper()
                
                # Merge vehicle, suspect owner, FIR link
                session.run("""
                    MERGE (v:Vehicle {registration_number: $plate})
                    SET v.clean_plate = $clean_plate,
                        v.registered_owner = coalesce(v.registered_owner, $owner_name),
                        v.model = $model
                    WITH v
                    MERGE (p:Person {name: $owner_name})
                    MERGE (p)-[:OWNS_VEHICLE]->(v)
                    WITH v
                    MATCH (f:FIR {fir_no: $fir_no})
                    MERGE (f)-[:INVOLVES_VEHICLE]->(v)
                """, plate=plate, clean_plate=clean_plate, owner_name=owner_name, model=model, fir_no=fir_no)
                total_vehicles_linked += 1

                # Generate 6 to 12 ANPR sightings
                num_sightings = random.randint(6, 12)
                chosen_corridors = random.sample(ANPR_SURVEILLANCE_CORRIDORS, min(num_sightings, len(ANPR_SURVEILLANCE_CORRIDORS)))
                
                curr_time = base_time + timedelta(days=idx % 15 + v_idx, hours=random.randint(0, 5))

                for seq, (loc_name, cam_id) in enumerate(chosen_corridors):
                    curr_time += timedelta(hours=random.randint(1, 8), minutes=random.randint(5, 50))
                    ts_str = curr_time.strftime("%Y-%m-%dT%H:%M:%SZ")
                    speed = random.randint(50, 105)

                    session.run("""
                        MATCH (v:Vehicle {registration_number: $plate})
                        MERGE (l:Location {name: $loc_name})
                        CREATE (v)-[:SIGHTED_AT {
                            timestamp: $ts,
                            camera_id: $cam_id,
                            speed_kmh: $speed,
                            sequence: $seq,
                            source_file: 'anpr_fir_movements.csv'
                        }]->(l)
                    """, plate=plate, loc_name=loc_name, ts=ts_str, cam_id=cam_id, speed=speed, seq=seq+1)
                    total_sightings_added += 1

        print(f"Successfully linked {total_vehicles_linked} vehicles with {total_sightings_added} ANPR movement sightings across {len(firs)} FIR cases!")

if __name__ == "__main__":
    seed_multi_vehicle_firs()
