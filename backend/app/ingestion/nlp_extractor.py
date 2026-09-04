"""
NLP & Regex Entity Extractor Module
Extracts Person names, Phone numbers, Vehicle plates, Locations, and Relationships from unstructured police FIR narrative text.
"""
import re
import spacy
from pathlib import Path
from typing import Dict, Any, List
from app.ingestion.cleaner import (
    clean_phone_number,
    clean_vehicle_plate,
    clean_timestamp,
    clean_name
)

# Load spaCy Small English NLP model
try:
    nlp = spacy.load("en_core_web_sm")
except Exception:
    nlp = None


def extract_entities_from_text(text: str, fir_id: str = "FIR-UNKNOWN") -> Dict[str, Any]:
    """
    Parses unstructured FIR text string using spaCy NER + Regex rules.
    Returns extracted structured entities:
    - FIR Metadata (FIR No, Station, Date)
    - Persons (suspects, complainants, associates)
    - Phones
    - Vehicles
    - Locations
    """
    if not text:
        return {}

    entities = {
        "fir_no": fir_id,
        "police_station": None,
        "incident_date": None,
        "persons": [],
        "phones": [],
        "vehicles": [],
        "locations": [],
        "raw_text": text
    }

    # 1. Regex Extraction for Structured Header Fields
    fir_no_match = re.search(r"FIR\s*(?:No|Number)?\s*[:\-]?\s*(FIR\-[\w\-]+|\w+[\-\d]+)", text, re.IGNORECASE)
    if fir_no_match:
        entities["fir_no"] = fir_no_match.group(1).strip()

    station_match = re.search(r"Police\s*Station\s*[:\-]?\s*([^\n\r]+)", text, re.IGNORECASE)
    if station_match:
        entities["police_station"] = station_match.group(1).strip()

    date_match = re.search(r"Date\s*[:\-]?\s*([^\n\r]+)", text, re.IGNORECASE)
    if date_match:
        entities["incident_date"] = clean_timestamp(date_match.group(1).strip())

    # 2. Regex Extraction for Phones (Indian 10-digit mobile pattern)
    phone_matches = re.findall(r"(?:\+91[\-\s]?)?[6-9]\d{9}\b", text)
    for p in phone_matches:
        cleaned_p = clean_phone_number(p)
        if cleaned_p and cleaned_p not in entities["phones"]:
            entities["phones"].append(cleaned_p)

    # 3. Regex Extraction for Vehicle Registration Plates
    plate_matches = re.findall(r"\b[A-Z]{2}[\s\-]?\d{1,2}[\s\-]?[A-Z]{1,3}[\s\-]?\d{1,4}\b", text)
    for v in plate_matches:
        cleaned_v = clean_vehicle_plate(v)
        if cleaned_v and cleaned_v not in entities["vehicles"]:
            entities["vehicles"].append(cleaned_v)

    # 4. spaCy Named Entity Recognition (NER) for Persons and Locations
    if nlp:
        doc = nlp(text)
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                c_name = clean_name(ent.text)
                # Ignore header noise words
                if c_name and len(c_name.split()) >= 2 and c_name not in entities["persons"]:
                    if not any(k in c_name.upper() for k in ["POLICE", "REPORT", "INFORMATION", "STATION"]):
                        entities["persons"].append(c_name)

            elif ent.label_ in {"GPE", "LOC"}:
                loc_name = ent.text.strip()
                if loc_name and loc_name not in entities["locations"]:
                    if not any(k in loc_name.upper() for k in ["POLICE", "FIR"]):
                        entities["locations"].append(loc_name)

    return entities


def parse_fir_folder(folder_path: str) -> List[Dict[str, Any]]:
    """
    Scans a directory of FIR .txt files and extracts structured entities from each report.
    """
    path = Path(folder_path)
    if not path.exists():
        raise FileNotFoundError(f"FIR directory not found at: {folder_path}")

    fir_records = []
    for file in path.glob("*.txt"):
        with open(file, "r", encoding="utf-8") as f:
            content = f.read()
            record = extract_entities_from_text(content, fir_id=file.stem.upper())
            record["source_file"] = file.name
            fir_records.append(record)

    return fir_records
