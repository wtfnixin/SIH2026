"""
Script to seed rich ANPR camera gantry sightings and trajectories for all vehicles
in all 25 FIR cases (and all 34 FIRs) in Neo4j.
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

def seed_all_fir_vehicles():
    with get_neo4j_session() as session:
        print("Fetching all FIRs and their associated vehicles...")
        
        # Mapping of all FIRs and their primary vehicles & owners
        fir_vehicles_data = [
            ("FIR-2026-001", "Rajesh Kumar", "KA-01-HH-1234"),
            ("FIR-2026-002", "Priya Sharma", "KA-03-MK-5678"),
            ("FIR-2026-003", "Amit Patel", "KA-04-P-9988"),
            ("FIR-2026-004", "Sneha Rao", "KA-05-AB-1111"),
            ("FIR-2026-005", "Vikram Singh", "KA-02-XY-4321"),
            ("FIR-2026-006", "Meenakshi Iyer", "KA-03-CD-7890"),
            ("FIR-2026-007", "Karthik Menon", "KA-01-EF-5555"),
            ("FIR-2026-008", "Ananya Das", "KA-05-GH-2468"),
            ("FIR-2026-009", "Ramesh Gowda", "KA-02-JK-1357"),
            ("FIR-2026-010", "Deepak Kumar", "KA-04-F-3344"),
            ("FIR-2026-011", "Siddharth Rao", "KA-50-Z-9900"),
            ("FIR-2026-012", "Manjunath Swamy", "KA-02-BC-4455"),
            ("FIR-2026-013", "Mohammed Ali", "KA-03-N-6677"),
            ("FIR-2026-014", "Divya Nambiar", "KA-01-HG-8899"),
            ("FIR-2026-015", "Venkatesh Rao", "KA-05-M-1234"),
            ("FIR-2026-016", "Sunita Kulkarni", "KA-01-AB-9876"),
            ("FIR-2026-017", "Nikhil Verma", "KA-03-EF-4321"),
            ("FIR-2026-018", "Rohit Shetty", "KA-01-P-5566"),
            ("FIR-2026-019", "Kavitha Menon", "KA-02-GA-1122"),
            ("FIR-2026-020", "Arun Prasad", "KA-03-HE-7788"),
            ("FIR-2026-021", "Raghavendra Rao", "KA-01-MC-9999"),
            ("FIR-2026-022", "Neha Gupta", "KA-04-ED-3322"),
            ("FIR-2026-023", "Suresh Kumar", "KA-05-AB-7766"),
            ("FIR-2026-024", "Kiranmayi Reddy", "KA-01-JJ-4433"),
            ("FIR-2026-025", "Manoj Tiwari", "KA-51-EF-2211"),
            ("FIR-2026-1023", "Rahul Sharma", "KA01AB1234"),
            ("FIR-2026-1024", "Ravi Verma", "KA02CD5678"),
            ("FIR-2026-1025", "Ravi Verma", "KA01AZ5555"),
            ("FIR-2026-9002", "Harsh Bhasin", "DL11VM3899"),
            ("FIR-2026-9003", "Tushar Kapoor", "DL03GB8224"),
            ("FIR-2026-TEST-001", "Rajesh Khurana", "TS09EX1001"),
            ("FIR-2026-TEST-001", "Vikram Malhotra", "TS10CD3003"),
            ("FIR-2026-TEST-001", "Devendra Varma", "TS07AB2002"),
            ("FIR-2026-TEST-002", "Siddharth Rao", "TS07AB2002"),
            ("FIR-2026-TEST-002", "Rajesh Khurana", "KA01AZ5555"),
            ("FIR-2026-TEST-003", "Vikram Malhotra", "TS10CD3003"),
            ("FIR-2026-TEST-003", "Manish Singhania", "DL01XY9999"),
        ]

        total_sightings_added = 0
        base_time = datetime(2026, 8, 1, 6, 30, 0)

        for idx, (fir_no, owner_name, plate) in enumerate(fir_vehicles_data):
            clean_plate = plate.replace("-", "").upper()
            
            # MERGE Vehicle, Person, FIR, and OWNS_VEHICLE / INVOLVES_VEHICLE links
            session.run("""
                MERGE (v:Vehicle {registration_number: $plate})
                SET v.clean_plate = $clean_plate,
                    v.registered_owner = coalesce(v.registered_owner, $owner_name),
                    v.model = coalesce(v.model, 'Sedan / SUV')
                WITH v
                MERGE (p:Person {name: $owner_name})
                MERGE (p)-[:OWNS_VEHICLE]->(v)
                WITH v
                OPTIONAL MATCH (f:FIR {fir_no: $fir_no})
                FOREACH (_ IN CASE WHEN f IS NOT NULL THEN [1] ELSE [] END |
                    MERGE (f)-[:INVOLVES_VEHICLE]->(v)
                )
            """, plate=plate, clean_plate=clean_plate, owner_name=owner_name, fir_no=fir_no)

            # Generate 8 to 14 ANPR camera sightings across locations over time
            num_sightings = random.randint(8, 14)
            chosen_locations = random.sample(ANPR_SURVEILLANCE_CORRIDORS, min(num_sightings, len(ANPR_SURVEILLANCE_CORRIDORS)))
            
            curr_time = base_time + timedelta(days=idx % 10, hours=random.randint(0, 3))
            
            for seq, (loc_name, cam_id) in enumerate(chosen_locations):
                curr_time += timedelta(hours=random.randint(1, 12), minutes=random.randint(5, 45))
                ts_str = curr_time.strftime("%Y-%m-%dT%H:%M:%SZ")
                speed = random.randint(45, 95)

                session.run("""
                    MATCH (v:Vehicle {registration_number: $plate})
                    MERGE (l:Location {name: $loc_name})
                    CREATE (v)-[:SIGHTED_AT {
                        timestamp: $ts,
                        camera_id: $cam_id,
                        speed_kmh: $speed,
                        sequence: $seq,
                        source_file: 'anpr_gantry_logs.csv'
                    }]->(l)
                """, plate=plate, loc_name=loc_name, ts=ts_str, cam_id=cam_id, speed=speed, seq=seq+1)
                total_sightings_added += 1

        print(f"Successfully processed {len(fir_vehicles_data)} vehicles and created {total_sightings_added} ANPR camera sightings!")

if __name__ == "__main__":
    seed_all_fir_vehicles()
