"""
Script to seed realistic CDR call logs for all FIRs in Neo4j,
ensuring every suspect and phone number connected to an FIR has rich call history.
"""
import random
from datetime import datetime, timedelta
from app.db.neo4j_driver import get_neo4j_session

def seed_fir_cdr_calls():
    with get_neo4j_session() as session:
        print("Fetching all FIRs and their associated entities...")
        firs = session.run("MATCH (f:FIR) RETURN f.fir_no AS fir_no").data()
        
        base_date = datetime(2026, 8, 1, 9, 0, 0)
        total_calls_created = 0

        for idx, f in enumerate(firs):
            fir_no = f["fir_no"]
            
            # Find Persons & Phones attached to this FIR
            entities = session.run("""
                MATCH (f:FIR {fir_no: $fir_no})-[:MENTIONED_IN|INVOLVES|OCCURRED_AT|INVOLVES_VEHICLE*1..2]-(m)
                WHERE m:Person OR m:Phone
                RETURN DISTINCT m, labels(m)[0] AS lbl
            """, fir_no=fir_no).data()

            persons = [e["m"] for e in entities if e["lbl"] == "Person"]
            phones = [e["m"] for e in entities if e["lbl"] == "Phone"]

            # Collect or create phone nodes for each person
            phone_nodes = []
            for p in phones:
                phone_nodes.append(p.get("phone_number"))

            for p in persons:
                p_name = p.get("name")
                p_phone = p.get("phone") or f"+9198765{idx:02d}{random.randint(100,999)}"
                phone_nodes.append(p_phone)

                # Ensure Phone node exists and is connected to Person
                session.run("""
                    MERGE (ph:Phone {phone_number: $phone})
                    WITH ph
                    MATCH (p:Person {name: $name})
                    MERGE (p)-[:HAS_PHONE]->(ph)
                """, phone=p_phone, name=p_name)

            phone_nodes = list(set([ph for ph in phone_nodes if ph]))

            # If less than 2 phone nodes, create auxiliary suspect phone nodes for this FIR
            if len(phone_nodes) < 2:
                aux_phone = f"+9198765{idx:02d}{random.randint(100,999)}"
                session.run("""
                    MATCH (f:FIR {fir_no: $fir_no})
                    MERGE (ph:Phone {phone_number: $aux_phone})
                    MERGE (f)-[:MENTIONED_IN]->(ph)
                """, fir_no=fir_no, aux_phone=aux_phone)
                phone_nodes.append(aux_phone)

            # Create 3-8 CALLED relationships between combinations of phone nodes
            num_calls = random.randint(3, 8)
            for _ in range(num_calls):
                if len(phone_nodes) >= 2:
                    caller, receiver = random.sample(phone_nodes, 2)
                    duration = random.choice([30, 45, 90, 120, 180, 240, 310, 450, 600])
                    call_time = base_date + timedelta(days=random.randint(0, 25), hours=random.randint(0, 23), minutes=random.randint(0, 59))
                    ts_str = call_time.strftime("%Y-%m-%dT%H:%M:%SZ")

                    session.run("""
                        MATCH (p1:Phone {phone_number: $caller})
                        MATCH (p2:Phone {phone_number: $receiver})
                        CREATE (p1)-[r:CALLED {
                            timestamp: $ts,
                            duration_seconds: $dur,
                            duration: $dur,
                            call_type: 'OUTGOING',
                            source_file: 'cdr_case_logs.csv'
                        }]->(p2)
                    """, caller=caller, receiver=receiver, ts=ts_str, dur=duration)
                    total_calls_created += 1

        print(f"Successfully created {total_calls_created} call log edges across {len(firs)} FIR cases!")

if __name__ == "__main__":
    seed_fir_cdr_calls()
