"""
AI Intelligence Copilot Service
Integrates Groq API with Neo4j Intent Resolution to produce intelligence summaries
and automated UI navigation action payloads.
"""
import os
import json
from typing import Dict, Any, List
from dotenv import load_dotenv
from app.services.intent_parser import parse_intent_and_extract_entities
from app.db.neo4j_driver import get_neo4j_session

# Load dotenv from current working directory or parent directories with override=True
load_dotenv(override=True)
for p in [".env", "/app/.env", "../.env"]:
    if os.path.exists(p):
        load_dotenv(p, override=True)

def get_groq_api_key() -> str:
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        for env_path in [".env", "/app/.env", "../.env"]:
            if os.path.exists(env_path):
                load_dotenv(env_path, override=True)
                key = os.getenv("GROQ_API_KEY", "").strip()
                if key:
                    break
    return key


def process_copilot_chat(user_message: str, selected_target_id: str = None) -> Dict[str, Any]:
    """
    Processes user chat message:
    1. If selected_target_id is provided, directly targets that entity.
    2. Otherwise, parses intent to find candidates.
    3. Handles multi-match disambiguation.
    4. Generates AI summary & ui_action payload.
    """
    # Case 1: Direct target specified by user click on disambiguation card
    if selected_target_id:
        return generate_single_entity_response(selected_target_id, user_message)

    # Case 2: Intent extraction
    intent_result = parse_intent_and_extract_entities(user_message)
    candidates = intent_result["candidates"]

    # Case 2A: No matches found
    if not candidates:
        return {
            "response": f"No entities found matching '{intent_result['search_term']}' in the intelligence graph. Please try searching by suspect name, phone number (+91...), vehicle plate, or FIR number.",
            "multiple_matches": [],
            "ui_action": None
        }

    # Case 2B: Multiple matches found (Disambiguation required!)
    if len(candidates) > 1 and not is_exact_match(intent_result['search_term'], candidates):
        return {
            "response": f"I found **{len(candidates)} entities** matching '{intent_result['search_term']}'. Please select which suspect or entity you want to investigate:",
            "multiple_matches": [
                {
                    "entity_id": c["entity_id"],
                    "entity_type": c["entity_type"],
                    "degree": c["degree"],
                    "details": format_candidate_details(c)
                } for c in candidates
            ],
            "ui_action": None
        }

    # Case 2C: Single best match found
    target_entity = candidates[0]["entity_id"]
    return generate_single_entity_response(target_entity, user_message)


def is_exact_match(search_term: str, candidates: List[Dict[str, Any]]) -> bool:
    """Checks if the top candidate is an exact match for the query."""
    if not candidates:
        return False
    top_id = str(candidates[0]["entity_id"]).lower().strip()
    term = search_term.lower().strip()
    return top_id == term or top_id == f"+91-{term}" or top_id == f"+91{term}"


def format_candidate_details(candidate: Dict[str, Any]) -> str:
    """Formats candidate properties for UI card display."""
    props = candidate.get("properties", {})
    t = candidate.get("entity_type")
    if t == "Person":
        return f"Person • {candidate['degree']} links"
    elif t == "Phone":
        return f"Phone Number • {candidate['degree']} call logs"
    elif t == "Vehicle":
        owner = props.get("registered_owner", "Unknown Owner")
        return f"Vehicle (Owner: {owner}) • {candidate['degree']} sightings"
    elif t == "Location":
        return f"Location • {candidate['degree']} sightings"
    return f"{t} • {candidate['degree']} connections"


def generate_single_entity_response(entity_id: str, user_message: str) -> Dict[str, Any]:
    """
    Fetches 360-degree graph details for entity_id and generates AI summary + UI navigation action.
    """
    entity_data = fetch_entity_360_context(entity_id)
    
    # Try calling Groq API if key is set
    groq_key = get_groq_api_key()
    ai_summary = ""
    if groq_key:
        ai_summary = call_groq_summary(entity_id, entity_data, user_message, groq_key)
    
    # Fallback / Local Rule Summary Generator
    if not ai_summary:
        ai_summary = generate_local_intelligence_summary(entity_id, entity_data)

    return {
        "response": ai_summary,
        "multiple_matches": [],
        "ui_action": {
            "type": "NAVIGATE_GRAPH",
            "target_id": entity_id,
            "open_dossier": True
        }
    }


def fetch_entity_360_context(entity_id: str) -> Dict[str, Any]:
    """Queries Neo4j for 1-hop and 2-hop connected network of entity_id."""
    context = {
        "entity_id": entity_id,
        "type": "Unknown",
        "connections": [],
        "degree": 0
    }
    
    cypher = """
    MATCH (n)
    WHERE (n:Person AND n.name = $id)
       OR (n:Phone AND n.phone_number = $id)
       OR (n:Vehicle AND n.registration_number = $id)
       OR (n:FIR AND n.fir_no = $id)
       OR (n:Location AND n.name = $id)
    OPTIONAL MATCH (n)-[r]-(other)
    RETURN labels(n)[0] AS main_label,
           labels(other)[0] AS other_label,
           type(r) AS rel_type,
           COALESCE(other.name, other.phone_number, other.registration_number, other.fir_no) AS connected_id,
           properties(r) AS rel_props
    LIMIT 50
    """
    try:
        with get_neo4j_session() as session:
            records = session.run(cypher, id=entity_id).data()
            if records:
                context["type"] = records[0]["main_label"]
                for rec in records:
                    if rec["connected_id"]:
                        context["connections"].append({
                            "type": rec["other_label"],
                            "relationship": rec["rel_type"],
                            "target": rec["connected_id"],
                            "props": rec["rel_props"]
                        })
                context["degree"] = len(context["connections"])
    except Exception as e:
        print(f"Error fetching 360 context for {entity_id}: {e}")

    return context


def generate_local_intelligence_summary(entity_id: str, data: Dict[str, Any]) -> str:
    """Generates clean structured intelligence summary without external API dependency."""
    etype = data.get("type", "Entity")
    degree = data.get("degree", 0)
    conns = data.get("connections", [])

    phones = [c["target"] for c in conns if c["type"] == "Phone"]
    vehicles = [c["target"] for c in conns if c["type"] == "Vehicle"]
    people = [c["target"] for c in conns if c["type"] == "Person"]
    locations = [c["target"] for c in conns if c["type"] == "Location"]
    firs = [c["target"] for c in conns if c["type"] == "FIR"]

    summary_lines = [
        f"🎯 **Target Located**: **{entity_id}** (`{etype}`)",
        f"📊 **Graph Connections**: {degree} total links detected in intelligence network.",
    ]

    if phones:
        summary_lines.append(f"📱 **Linked Phones**: {', '.join(phones[:3])}")
    if vehicles:
        summary_lines.append(f"🚘 **Associated Vehicles**: {', '.join(vehicles[:3])}")
    if people:
        summary_lines.append(f"👤 **Known Associates**: {', '.join(people[:3])}")
    if locations:
        summary_lines.append(f"📍 **Key Locations**: {', '.join(locations[:3])}")
    if firs:
        summary_lines.append(f"📄 **Case FIRs**: {', '.join(firs[:3])}")

    summary_lines.append("\n🚀 **Navigating to Graph Canvas and opening Dossier...**")
    return "\n\n".join(summary_lines)


def call_groq_summary(entity_id: str, data: Dict[str, Any], user_message: str, api_key: str) -> str:
    """Calls Groq API to generate intelligence summary."""
    try:
        import httpx
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        prompt = f"""
        You are an AI Cyber Crime Intelligence Officer.
        Analyze this criminal intelligence data for target entity '{entity_id}' (Type: {data.get('type')}).
        Context Data: {json.dumps(data, indent=2)}

        Provide a concise 3-bullet point intelligence briefing highlighting key risk indicators, associates, and vehicles.
        End with a confirmation that you are opening the target's network graph.
        """
        payload = {
            "model": "qwen/qwen3.6-27b",
            "messages": [
                {"role": "system", "content": "You are a Law Enforcement Cyber Crime Intelligence Officer. Do NOT output any <think> tags or reasoning. Output ONLY the final 3-bullet point intelligence briefing directly."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 600,
            "temperature": 0.1
        }
        with httpx.Client(timeout=8.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                result = resp.json()
                raw_text = result["choices"][0]["message"]["content"]
                if "<think>" in raw_text:
                    if "</think>" in raw_text:
                        raw_text = raw_text.split("</think>")[-1].strip()
                    else:
                        # Extract bullet points if think block was truncated
                        lines = raw_text.split("\n")
                        bullet_lines = [l for l in lines if l.strip().startswith("*") or l.strip().startswith("-") or l.strip().startswith("•") or "Opening" in l]
                        if bullet_lines:
                            raw_text = "\n".join(bullet_lines)
                        else:
                            raw_text = re.sub(r'<think>.*', '', raw_text, flags=re.DOTALL).strip()
                return raw_text if raw_text else generate_local_intelligence_summary(entity_id, data)
            else:
                print(f"Groq API error HTTP {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"Groq API call error: {e}")
    return ""
