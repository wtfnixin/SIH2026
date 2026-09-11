"""
Script to normalize all Phone nodes in Neo4j to standard format +91XXXXXXXXXX
and merge duplicate Phone nodes into canonical nodes.
"""
import re
from app.db.neo4j_driver import get_neo4j_session
from app.ingestion.cleaner import clean_phone_number

def normalize_all_phones():
    with get_neo4j_session() as session:
        print("Fetching all Phone nodes...")
        result = session.run("MATCH (p:Phone) RETURN id(p) AS node_id, p.phone_number AS phone").data()
        print(f"Total Phone nodes: {len(result)}")

        # Group node IDs by normalized phone number
        phone_groups = {}
        for row in result:
            raw_phone = str(row["phone"])
            cleaned = clean_phone_number(raw_phone)
            if not cleaned:
                # Fallback digit extraction
                digits = re.sub(r"\D", "", raw_phone)
                if len(digits) == 10:
                    cleaned = f"+91{digits}"
                elif len(digits) == 12 and digits.startswith("91"):
                    cleaned = f"+91{digits[2:]}"
                else:
                    cleaned = raw_phone

            phone_groups.setdefault(cleaned, []).append(row["node_id"])

        print(f"Unique canonical phone numbers: {len(phone_groups)}")

        merged_count = 0
        updated_count = 0

        for canonical_phone, node_ids in phone_groups.items():
            primary_id = node_ids[0]
            # Update primary node's phone_number property
            session.run(
                "MATCH (p:Phone) WHERE id(p) = $pid SET p.phone_number = $phone",
                pid=primary_id, phone=canonical_phone
            )
            updated_count += 1

            # Merge any duplicate nodes into primary_id
            for dup_id in node_ids[1:]:
                # Move outbound CALLED relationships
                session.run("""
                    MATCH (dup:Phone)-[r:CALLED]->(target)
                    WHERE id(dup) = $dupid AND id(target) <> $pid
                    MATCH (prim:Phone) WHERE id(prim) = $pid
                    CREATE (prim)-[r2:CALLED]->(target)
                    SET r2 += properties(r)
                    DELETE r
                """, dupid=dup_id, pid=primary_id)

                # Move inbound MENTIONED_IN relationships
                session.run("""
                    MATCH (source)-[r:MENTIONED_IN]->(dup:Phone)
                    WHERE id(dup) = $dupid AND id(source) <> $pid
                    MATCH (prim:Phone) WHERE id(prim) = $pid
                    CREATE (source)-[r2:MENTIONED_IN]->(prim)
                    SET r2 += properties(r)
                    DELETE r
                """, dupid=dup_id, pid=primary_id)

                # Move inbound HAS_PHONE relationships
                session.run("""
                    MATCH (source)-[r:HAS_PHONE]->(dup:Phone)
                    WHERE id(dup) = $dupid AND id(source) <> $pid
                    MATCH (prim:Phone) WHERE id(prim) = $pid
                    CREATE (source)-[r2:HAS_PHONE]->(prim)
                    SET r2 += properties(r)
                    DELETE r
                """, dupid=dup_id, pid=primary_id)

                # Move inbound CALLED relationships
                session.run("""
                    MATCH (source)-[r:CALLED]->(dup:Phone)
                    WHERE id(dup) = $dupid AND id(source) <> $pid
                    MATCH (prim:Phone) WHERE id(prim) = $pid
                    CREATE (source)-[r2:CALLED]->(prim)
                    SET r2 += properties(r)
                    DELETE r
                """, dupid=dup_id, pid=primary_id)

                # Move inbound OBSERVED_AT relationships
                session.run("""
                    MATCH (source)-[r:OBSERVED_AT]->(dup:Phone)
                    WHERE id(dup) = $dupid AND id(source) <> $pid
                    MATCH (prim:Phone) WHERE id(prim) = $pid
                    CREATE (source)-[r2:OBSERVED_AT]->(prim)
                    SET r2 += properties(r)
                    DELETE r
                """, dupid=dup_id, pid=primary_id)

                # Delete duplicate node
                session.run("MATCH (dup:Phone) WHERE id(dup) = $dupid DETACH DELETE dup", dupid=dup_id)
                merged_count += 1

        print(f"Successfully updated {updated_count} canonical Phone nodes.")
        print(f"Successfully merged {merged_count} duplicate Phone nodes.")

if __name__ == "__main__":
    normalize_all_phones()
