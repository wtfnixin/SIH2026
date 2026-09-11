"""
AI Intelligence Copilot Service
Integrates Groq API with Neo4j Intent Resolution to provide a full conversational
Cyber Crime AI Assistant that can converse naturally AND navigate UI graph topology.
"""
import os
import json
import re
from typing import Dict, Any, List
from dotenv import load_dotenv
from app.services.intent_parser import parse_intent_and_extract_entities
from app.db.neo4j_driver import get_neo4j_session

# Load dotenv with override=True
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
    Processes user chat prompt:
    1. Direct selection click on candidate card -> targets entity.
    2. Intent & entity search.
    3. General conversation (greetings, how-to, investigative guidance) -> Groq chat response.
    4. Target entity search -> Groq conversational AI analysis + ui_action signal.
    """
    groq_key = get_groq_api_key()

    # Case 1: Direct target specified by user click on disambiguation card
    if selected_target_id:
        return generate_single_entity_response(selected_target_id, user_message, groq_key)

    # Case 1: Check for Map / Trajectory / Timeline Intent
    msg_lower = user_message.lower()
    if any(k in msg_lower for k in ["timeline", "chronology", "sequence of events", "event history", "time line"]):
        return {
            "response": "Opening the Interactive Investigation Reconstruction Timeline. You can reconstruct chronological events, analyze multi-entity temporal convergence, detect activity bursts, and generate evidence-backed briefs.",
            "multiple_matches": [],
            "ui_action": {
                "type": "NAVIGATE_TIMELINE",
                "open_timeline": True
            }
        }

    if any(k in msg_lower for k in ["map", "location map", "anpr map", "trajectory", "route", "gantry"]):
        return {
            "response": "Opening the Interactive ANPR Spatial Surveillance Map canvas. You can trace vehicle movement trajectories, analyze toll gantry camera hits, and monitor convoy co-location alerts.",
            "multiple_matches": [],
            "ui_action": {
                "type": "NAVIGATE_MAP",
                "open_map": True
            }
        }


    # Case 2: Check if prompt is a general conversational query (e.g. greeting, system question)
    if is_general_conversation(user_message):
        conv_response = call_groq_general_chat(user_message, groq_key)
        return {
            "response": conv_response,
            "multiple_matches": [],
            "ui_action": None
        }

    # Case 3: Intent & Entity extraction
    intent_result = parse_intent_and_extract_entities(user_message)
    candidates = intent_result["candidates"]

    # Case 3A: No entities found -> Conversational assistance with general advice
    if not candidates:
        conv_response = ""
        if groq_key:
            conv_response = call_groq_general_chat(user_message, groq_key)
        if not conv_response:
            conv_response = f"I am your AI Cyber Crime Intelligence Co-Pilot. I couldn't locate specific target entities matching '{intent_result.get('search_term', user_message)}' in the database. You can ask me general investigative questions (e.g. Hawala smurfing, ANPR convoy tracking) or search by suspect name, phone (+91...), or vehicle plate."
        return {
            "response": conv_response,
            "multiple_matches": [],
            "ui_action": None
        }

    # Case 3B: Multiple matches found (Disambiguation candidate cards)
    if len(candidates) > 1 and not is_exact_match(intent_result['search_term'], candidates):
        intro_text = f"I retrieved **{len(candidates)} records** matching '{intent_result['search_term']}'. Select a target suspect card below to investigate their full network graph:"
        return {
            "response": intro_text,
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

    # Case 3C: Single targeted entity
    target_entity = candidates[0]["entity_id"]
    return generate_single_entity_response(target_entity, user_message, groq_key)


def is_general_conversation(text: str) -> bool:
    """Detects if prompt is a greeting, general question, or analytical guidance query."""
    text_lower = text.lower().strip()
    
    # Greetings & Introductions
    greetings = {"hi", "hello", "hey", "who are you", "help", "what can you do", "thanks", "thank you"}
    if text_lower in greetings or any(text_lower.startswith(g) for g in ["hi ", "hello ", "hey ", "who are"]):
        return True

    # General concept questions (no specific name/phone/plate specified)
    general_keywords = ["how does", "what is", "explain hawala", "explain burner", "how to use", "what should i", "give me tips"]
    if any(k in text_lower for k in general_keywords):
        return True

    return False


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


def generate_single_entity_response(entity_id: str, user_message: str, groq_key: str) -> Dict[str, Any]:
    """
    Fetches 360-degree graph details for entity_id and generates conversational AI intelligence response + UI navigation action.
    """
    entity_data = fetch_entity_360_context(entity_id)
    
    ai_summary = ""
    if groq_key:
        ai_summary = call_groq_entity_analysis(entity_id, entity_data, user_message, groq_key)
    
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
    """Generates structured fallback intelligence response."""
    etype = data.get("type", "Entity")
    degree = data.get("degree", 0)
    conns = data.get("connections", [])

    phones = [c["target"] for c in conns if c["type"] == "Phone"]
    vehicles = [c["target"] for c in conns if c["type"] == "Vehicle"]
    people = [c["target"] for c in conns if c["type"] == "Person"]
    locations = [c["target"] for c in conns if c["type"] == "Location"]
    firs = [c["target"] for c in conns if c["type"] == "FIR"]

    summary_lines = [
        f"🎯 **Target Intelligence Briefing**: **{entity_id}** (`{etype}`)",
        f"I located **{entity_id}** in the graph topology with **{degree} connected links**.",
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

    summary_lines.append("\n🚀 **Navigating your canvas to focus on this target and opening dossier...**")
    return "\n\n".join(summary_lines)


def call_groq_general_chat(user_message: str, api_key: str) -> str:
    """Calls Groq API for general conversational queries (greetings, how-to, investigative guidance)."""
    try:
        import httpx
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        system_prompt = """
        You are an expert AI Cyber Crime Intelligence Co-Pilot assisting law enforcement officers at the National Cyber Crime Command Center.
        Speak conversationally, professionally, and authoritatively like an experienced senior intelligence analyst and active AI co-pilot assistant.
        Do NOT reply with rigid templates or sterile summaries. Have an active, fluid, natural conversation.
        Help officers understand Hawala smurfing, burner SIM anomalies, ANPR convoy tracking, or how to search and investigate suspects in the system.
        """
        payload = {
            "model": "qwen/qwen3.6-27b",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "max_completion_tokens": 450,
            "reasoning_effort": "none",
            "temperature": 0.3
        }
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                result = resp.json()
                raw_text = result["choices"][0]["message"]["content"]
                return clean_think_tags(raw_text)
            else:
                print(f"Groq API error {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"Groq General Chat error: {e}")

    return "Hello Officer! I am your AI Cyber Crime Intelligence Co-Pilot. How can I assist you with your investigation today? You can ask me about Hawala smurfing, burner SIM detection, or search any suspect by name, phone (+91...), or vehicle plate."


def call_groq_entity_analysis(entity_id: str, data: Dict[str, Any], user_message: str, api_key: str) -> str:
    """Calls Groq API to generate conversational AI analysis of a specific targeted entity."""
    try:
        import httpx
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        system_prompt = """
        You are an AI Cyber Crime Intelligence Co-Pilot assisting a law enforcement investigator.
        You are analyzing a specific target entity extracted from the Neo4j graph database.
        Speak conversationally as a proactive AI co-pilot assistant. Discuss key connections, highlight potential criminal risks or anomalies, and explain what actions you are taking.
        """
        prompt = f"""
        User Prompt: "{user_message}"
        Target Entity: {entity_id} (Type: {data.get('type')})
        Degree of Connections: {data.get('degree')}
        Graph Context JSON: {json.dumps(data.get('connections', [])[:15], indent=2)}

        Provide an active, conversational AI intelligence response explaining key findings for '{entity_id}', associates, vehicles/phones, and confirm that you are navigating to their network graph.
        """
        payload = {
            "model": "qwen/qwen3.6-27b",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "max_completion_tokens": 450,
            "reasoning_effort": "none",
            "temperature": 0.3
        }
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                result = resp.json()
                raw_text = result["choices"][0]["message"]["content"]
                return clean_think_tags(raw_text)
            else:
                print(f"Groq API entity error {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"Groq Entity Analysis error: {e}")
    return ""


def clean_think_tags(raw_text: str) -> str:
    """Strips internal <think> reasoning blocks from LLM responses."""
    if not raw_text:
        return ""
    # Strip complete <think>...</think> blocks
    cleaned = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL)
    # Strip unclosed <think> blocks if any remain
    cleaned = re.sub(r'<think>.*', '', cleaned, flags=re.DOTALL)
    return cleaned.strip()

