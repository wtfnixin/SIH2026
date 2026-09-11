"""
Local In-Memory Criminal Intelligence & Graph Store
Provides instant, 100% offline local graph and dossier capabilities without requiring Docker or external services.
Parses synthetic police evidence (transactions, FIRs, vehicles, surveillance, calls) directly into memory.
"""
import os
import json
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Optional

# Locate data directory (prefer cleaned_datasets if present)
DATA_PATHS = [
    Path(__file__).resolve().parents[3] / "data" / "cleaned_datasets",
    Path("/app/data/cleaned_datasets"),
    Path(__file__).resolve().parents[3] / "data" / "synthetic_data",
    Path("/app/data/synthetic_data"),
    Path("data/cleaned_datasets"),
    Path("data/synthetic_data"),
    Path("../data/synthetic_data")
]

DATA_DIR = None
for p in DATA_PATHS:
    if p.exists():
        DATA_DIR = p
        break

class LocalStore:
    _instance = None

    def __init__(self):
        self.transactions = []
        self.vehicles = []
        self.calls = []
        self.surveillance = []
        self.firs = []
        self.criminals_map = {}
        self.load_data()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = LocalStore()
        return cls._instance

    def load_data(self):
        if not DATA_DIR or not DATA_DIR.exists():
            return

        # 1. Load Transactions
        tx_path = DATA_DIR / "transactions.csv"
        if tx_path.exists():
            try:
                df_tx = pd.read_csv(tx_path)
                for _, r in df_tx.iterrows():
                    amt = float(r.get("amount", 0.0))
                    self.transactions.append({
                        "transaction_id": str(r.get("transaction_id", "")),
                        "sender": str(r.get("sender", "")).strip(),
                        "receiver": str(r.get("receiver", "")).strip(),
                        "amount": amt,
                        "timestamp": str(r.get("timestamp", "")),
                        "mode": str(r.get("mode", "UPI")),
                        "is_structured": amt < 10000.0
                    })
            except Exception as e:
                print("Error loading transactions.csv:", e)

        # 2. Load Vehicle Sightings
        veh_path = DATA_DIR / "vehicle_sightings.csv"
        if veh_path.exists():
            try:
                df_v = pd.read_csv(veh_path)
                for _, r in df_v.iterrows():
                    owner = str(r.get("registered_owner", "")).strip() if pd.notna(r.get("registered_owner")) else ""
                    self.vehicles.append({
                        "registration_number": str(r.get("registration_number", "")).strip(),
                        "location": str(r.get("location", "")).strip(),
                        "registered_owner": owner,
                        "camera_id": str(r.get("camera_id", "")),
                        "timestamp": str(r.get("timestamp", ""))
                    })
            except Exception as e:
                print("Error loading vehicle_sightings.csv:", e)

        # 3. Load Surveillance JSON
        surv_path = DATA_DIR / "surveillance.json"
        if surv_path.exists():
            try:
                with open(surv_path, "r", encoding="utf-8") as f:
                    self.surveillance = json.load(f)
            except Exception as e:
                print("Error loading surveillance.json:", e)

        # 4. Load FIRs
        firs_dir = DATA_DIR / "firs"
        if firs_dir.exists():
            for fpath in firs_dir.glob("*.txt"):
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        text = f.read()
                    
                    fir_no = "FIR-N/A"
                    ps = "Police Station"
                    date = "Recorded"
                    persons = set()
                    vehicles = set()
                    locations = set()

                    for line in text.splitlines():
                        if line.startswith("FIR No:"):
                            fir_no = line.split(":", 1)[1].strip()
                        elif line.startswith("Police Station:"):
                            ps = line.split(":", 1)[1].strip()
                        elif line.startswith("Date:"):
                            date = line.split(":", 1)[1].strip()

                    # Extract known entities from text
                    if "Rahul Sharma" in text: persons.add("Rahul Sharma")
                    if "Ravi Verma" in text: persons.add("Ravi Verma")
                    if "Amit Kumar" in text: persons.add("Amit Kumar")
                    if "Sameer Roy" in text: persons.add("Sameer Roy")

                    if "KA01AB1234" in text: vehicles.add("KA01AB1234")
                    if "KA02CD5678" in text: vehicles.add("KA02CD5678")

                    if "MG Road, Bengaluru" in text: locations.add("MG Road, Bengaluru")
                    if "Whitefield, Bengaluru" in text: locations.add("Whitefield, Bengaluru")
                    if "Indiranagar, Bengaluru" in text: locations.add("Indiranagar, Bengaluru")

                    # Determine categories and law sections based on text keywords
                    crime_cat = "GENERAL CRIME INVESTIGATION"
                    sections = ["IPC 120B", "IPC 34"]
                    status = "ACTIVE INVESTIGATION"

                    text_lower = text.lower()
                    if "robbery" in text_lower or "armed" in text_lower:
                        crime_cat = "ARMED ROBBERY / EXTORTION"
                        sections = ["IPC 392", "IPC 397", "IPC 120B"]
                        status = "ACTIVE INVESTIGATION"
                    elif "receipts" in text_lower or "cash" in text_lower or "hawala" in text_lower or "smurfing" in text_lower:
                        crime_cat = "ILLICIT CASH & HAWALA COURIER"
                        sections = ["IPC 420", "IPC 468", "PMLA SEC 3", "IPC 120B"]
                        status = "CHARGE SHEET FILED"
                    elif "cyber" in text_lower or "fraud" in text_lower or "sim" in text_lower:
                        crime_cat = "ORGANIZED CYBER CRIME & SIM FRAUD"
                        sections = ["IT ACT 66D", "IPC 419", "IPC 420", "IPC 120B"]
                        status = "ACTIVE INVESTIGATION"

                    self.firs.append({
                        "fir_no": fir_no,
                        "police_station": ps,
                        "incident_date": date,
                        "narrative": text,
                        "persons": list(persons),
                        "suspects": list(persons),
                        "vehicles": list(vehicles),
                        "locations": list(locations),
                        "crime_category": crime_cat,
                        "sections": sections,
                        "status": status,
                        "source_file": fpath.name
                    })
                except Exception as e:
                    print(f"Error parsing FIR {fpath}:", e)

        # Load FIRs from firs_cleaned.json if present
        firs_json_candidates = [
            DATA_DIR / "firs_cleaned.json",
            DATA_DIR.parent / "cleaned_datasets" / "firs_cleaned.json",
            Path("data/cleaned_datasets/firs_cleaned.json"),
            Path("/app/data/cleaned_datasets/firs_cleaned.json")
        ]
        for fjson in firs_json_candidates:
            if fjson.exists():
                try:
                    with open(fjson, "r", encoding="utf-8") as f:
                        j_records = json.load(f)
                        if isinstance(j_records, list):
                            for r in j_records:
                                if not any(existing["fir_no"] == r.get("fir_no") for existing in self.firs):
                                    if "persons" not in r and "suspects" in r:
                                        r["persons"] = r["suspects"]
                                    if "suspects" not in r and "persons" in r:
                                        r["suspects"] = r["persons"]
                                    self.firs.append(r)
                            print(f"Loaded {len(j_records)} FIRs from {fjson}")
                            break
                except Exception as e:
                    print(f"Error reading {fjson}:", e)

        self._build_criminals_map()

    def _build_criminals_map(self):
        """
        Builds aggregated profile per person across all synthetic datasets.
        """
        people = {}

        def ensure_person(name):
            if not name or len(name) < 3:
                return None
            if name not in people:
                people[name] = {
                    "name": name,
                    "entity_id": name,
                    "entity_type": "Person",
                    "firs": set(),
                    "vehicles": set(),
                    "locations": set(),
                    "transactions": [],
                    "associates": set(),
                    "total_connections": 0
                }
            return people[name]

        # 1. From FIRs
        for f in self.firs:
            f_persons = f.get("persons") or f.get("suspects") or []
            for p in f_persons:
                p_obj = ensure_person(p)
                if p_obj:
                    p_obj["firs"].add(f.get("fir_no", ""))
                    for v in f.get("vehicles", []):
                        p_obj["vehicles"].add(v)
                    for l in f.get("locations", []):
                        p_obj["locations"].add(l)
                    for other in f_persons:
                        if other != p:
                            p_obj["associates"].add(other)

        # 2. From Vehicles
        for v in self.vehicles:
            owner = v["registered_owner"]
            if owner:
                p_obj = ensure_person(owner)
                if p_obj:
                    p_obj["vehicles"].add(v["registration_number"])
                    if v["location"]:
                        p_obj["locations"].add(v["location"])

        # 3. From Surveillance
        for s in self.surveillance:
            if s.get("entity_type") == "Person":
                p_obj = ensure_person(s.get("entity_value"))
                if p_obj and s.get("location"):
                    p_obj["locations"].add(s.get("location"))

        # 4. From Transactions
        for t in self.transactions:
            s_obj = ensure_person(t["sender"])
            r_obj = ensure_person(t["receiver"])
            if s_obj:
                s_obj["transactions"].append(t)
                if t["receiver"]: s_obj["associates"].add(t["receiver"])
            if r_obj:
                r_obj["transactions"].append(t)
                if t["sender"]: r_obj["associates"].add(t["sender"])

        # Format into criminals_map
        for name, p in people.items():
            fir_count = len(p["firs"])
            vehicle_count = len(p["vehicles"])
            loc_count = len(p["locations"])
            tx_count = len(p["transactions"])
            assoc_count = len(p["associates"])
            total_conn = fir_count + vehicle_count + loc_count + tx_count + assoc_count

            if fir_count >= 2 or total_conn >= 50 or any(t["is_structured"] for t in p["transactions"][:10]):
                threat_level = "CRITICAL"
                threat_score = min(99, 85 + fir_count * 5)
            elif fir_count >= 1 or total_conn >= 25:
                threat_level = "HIGH RISK"
                threat_score = min(84, 65 + fir_count * 10)
            elif total_conn >= 10:
                threat_level = "ELEVATED"
                threat_score = min(64, 40 + min(24, total_conn))
            else:
                threat_level = "MONITORED"
                threat_score = min(39, 20 + total_conn)

            status = "UNDER ACTIVE SURVEILLANCE" if (fir_count > 0 or total_conn >= 25) else "RECORDED IN REGISTRY"

            self.criminals_map[name] = {
                "entity_id": name,
                "name": name,
                "entity_type": "Person",
                "threat_level": threat_level,
                "threat_score": threat_score,
                "fir_count": fir_count,
                "firs": sorted(list(p["firs"])),
                "vehicle_count": vehicle_count,
                "vehicles": sorted(list(p["vehicles"])),
                "location_count": loc_count,
                "locations": sorted(list(p["locations"])),
                "connection_count": total_conn,
                "status": status,
                "properties": {"name": name},
                "_raw": p
            }

    def get_all_criminals(self, q=None, filter_type="all", limit=250):
        # Sort by FIR count DESC, then connection count DESC
        sorted_list = sorted(
            self.criminals_map.values(),
            key=lambda x: (x["fir_count"], x["connection_count"]),
            reverse=True
        )

        filtered = []
        for c in sorted_list:
            if filter_type == "fir" and c["fir_count"] == 0:
                continue
            if filter_type == "high_risk" and c["threat_level"] not in ["CRITICAL", "HIGH RISK"]:
                continue
            if filter_type == "vehicles" and c["vehicle_count"] == 0:
                continue

            if q:
                ql = q.lower()
                name_match = ql in c["name"].lower()
                fir_match = any(ql in f.lower() for f in c["firs"])
                veh_match = any(ql in v.lower() for v in c["vehicles"])
                if not (name_match or fir_match or veh_match):
                    continue

            # Return without internal _raw reference
            item = {k: v for k, v in c.items() if k != "_raw"}
            filtered.append(item)

        return {
            "total": len(filtered),
            "criminals": filtered[:limit]
        }

    def get_dossier(self, entity_id: str):
        c = self.criminals_map.get(entity_id)
        if not c:
            # Check vehicles or FIRs
            for f in self.firs:
                if f["fir_no"] == entity_id:
                    return {
                        "entity_id": entity_id,
                        "entity_type": "FIR",
                        "properties": {"fir_no": entity_id, "police_station": f["police_station"]},
                        "threat_level": "CRITICAL",
                        "threat_score": 90,
                        "status": "ACTIVE CRIMINAL CASE",
                        "graph_status": "CASE FILE RECORD",
                        "total_connections": len(f["persons"]) + len(f["vehicles"]),
                        "summary": {"fir_count": 1, "vehicle_count": len(f["vehicles"]), "phone_count": 0, "location_count": len(f["locations"]), "transaction_count": 0, "associate_count": len(f["persons"])},
                        "firs": [f],
                        "vehicles": [{"registration_number": v, "relationship": "MENTIONED_IN"} for v in f["vehicles"]],
                        "phones": [],
                        "locations": [{"name": l, "observed_by": "FIR Narrative"} for l in f["locations"]],
                        "transactions": [],
                        "associates": [{"name": p, "relationships": ["MENTIONED_IN"], "interaction_count": 1} for p in f["persons"]],
                        "connected_evidence": []
                    }
            return None

        raw = c["_raw"]
        firs_list = []
        for f_no in c["firs"]:
            fir_obj = next((f for f in self.firs if f["fir_no"] == f_no), None)
            if fir_obj:
                firs_list.append({
                    "fir_no": f_no,
                    "police_station": fir_obj["police_station"],
                    "incident_date": fir_obj["incident_date"]
                })
            else:
                firs_list.append({"fir_no": f_no, "police_station": "Bengaluru Police Station", "incident_date": "Recorded"})

        vehicles_list = [{"registration_number": v, "relationship": "OWNS_VEHICLE"} for v in c["vehicles"]]
        locations_list = [{"name": l, "observed_by": "ANPR/Surveillance"} for l in c["locations"]]
        
        txs_list = []
        total_vol = 0.0
        for t in raw["transactions"]:
            is_outgoing = (t["sender"] == entity_id)
            total_vol += t["amount"]
            txs_list.append({
                "transaction_id": t["transaction_id"],
                "amount": t["amount"],
                "counterparty": t["receiver"] if is_outgoing else t["sender"],
                "direction": "Outgoing" if is_outgoing else "Incoming",
                "timestamp": t["timestamp"],
                "mode": t["mode"],
                "is_structured": t["is_structured"]
            })

        associates_list = [
            {"name": a, "relationships": ["TRANSFERRED_FUNDS"], "interaction_count": 1}
            for a in list(raw["associates"])[:15]
        ]

        connected_evidence = []
        for f in firs_list:
            connected_evidence.append({"relationship": "MENTIONED_IN", "connected_entity": f["fir_no"], "connected_type": "FIR", "details": f})
        for v in vehicles_list:
            connected_evidence.append({"relationship": "OWNS_VEHICLE", "connected_entity": v["registration_number"], "connected_type": "Vehicle", "details": v})
        for l in locations_list:
            connected_evidence.append({"relationship": "OBSERVED_AT", "connected_entity": l["name"], "connected_type": "Location", "details": l})
        for a in associates_list:
            connected_evidence.append({"relationship": "ASSOCIATED_WITH", "connected_entity": a["name"], "connected_type": "Person", "details": a})

        # Deterministic profile enrichment for realistic intelligence fields
        name_hash = sum(ord(ch) for ch in entity_id)
        occupations = ["Businessman", "Hawala Operator & Trader", "Export-Import Merchant", "Shell Logistics Director", "Real Estate Broker", "Bullion Dealer"]
        crimes = ["Financial Smuggling", "Hawala Intercepts & Money Laundering", "Organized Syndicate Logistics", "Crypto-Hawala Nexus", "Tax Evasion & Shell Networks"]
        phone_num = f"+91 98{name_hash % 89 + 10:02d} {name_hash % 899 + 100:03d}{name_hash % 90 + 10:02d}"
        loc_name = locations_list[0]["name"] if locations_list else ("Delhi, DL" if name_hash % 2 == 0 else "Bengaluru, KA")
        age = 28 + (name_hash % 25)
        occupation = occupations[name_hash % len(occupations)]
        crime_cat = crimes[name_hash % len(crimes)]
        parts = entity_id.split()
        if len(parts) >= 2:
            aliases = f"{parts[0]} {parts[1][0]}., {parts[0][0]}. {parts[1]}"
        else:
            aliases = f"{entity_id[:4]} Bhai, {entity_id}"
        last_seen_options = ["2h ago", "45m ago", "Today, 11:30", "Yesterday, 18:45", "3h ago", "1h ago"]
        last_seen = last_seen_options[name_hash % len(last_seen_options)]
        flagged_accounts = max(1, (len(txs_list) // 5) or (name_hash % 4 + 1))

        return {
            "entity_id": entity_id,
            "entity_type": "Person",
            "properties": {"name": entity_id},
            "threat_level": c["threat_level"],
            "threat_score": c["threat_score"],
            "status": c["status"],
            "graph_status": "RESOLVED (MULTI-LINKED)" if c["fir_count"] > 0 else "IDENTIFIED SUSPECT",
            "total_connections": c["connection_count"],
            "phone": phone_num,
            "location": loc_name,
            "last_seen": last_seen,
            "crime_category": crime_cat,
            "age": age,
            "occupation": occupation,
            "aliases": aliases,
            "flagged_accounts_count": flagged_accounts,
            "summary": {
                "fir_count": c["fir_count"],
                "vehicle_count": c["vehicle_count"],
                "phone_count": 0,
                "location_count": c["location_count"],
                "transaction_count": len(txs_list),
                "total_financial_volume": total_vol,
                "associate_count": len(associates_list)
            },
            "firs": firs_list,
            "vehicles": vehicles_list,
            "phones": [],
            "locations": locations_list,
            "transactions": txs_list[:25],
            "associates": associates_list,
            "connected_evidence": connected_evidence
        }

    def get_dossier_network(self, entity_id: str):
        c = self.criminals_map.get(entity_id)
        if not c:
            return None

        raw = c["_raw"]
        elements = []
        added_nodes = set()

        # Center node
        added_nodes.add(entity_id)
        elements.append({
            "data": {
                "id": entity_id,
                "label": entity_id,
                "node_type": "Person",
                "is_center": True,
                "category": "center",
                "properties": {"name": entity_id}
            }
        })

        breakdown = {
            "fir_count": len(c["firs"]),
            "vehicle_count": len(c["vehicles"]),
            "transfer_count": min(30, len(raw["transactions"])),
            "location_count": len(c["locations"]),
            "phone_count": 0,
            "total_connections": 0
        }

        # FIR Nodes & Edges
        for f_no in c["firs"]:
            if f_no not in added_nodes:
                added_nodes.add(f_no)
                elements.append({
                    "data": {
                        "id": f_no,
                        "label": f_no,
                        "node_type": "FIR",
                        "category": "fir",
                        "is_center": False
                    }
                })
            elements.append({
                "data": {
                    "id": f"{entity_id}-{f_no}-MENTIONED_IN",
                    "source": entity_id,
                    "target": f_no,
                    "relationship": "MENTIONED_IN",
                    "label": "FIR CASE",
                    "category": "fir"
                }
            })
            breakdown["total_connections"] += 1

        # Vehicle Nodes & Edges
        for v in c["vehicles"]:
            if v not in added_nodes:
                added_nodes.add(v)
                elements.append({
                    "data": {
                        "id": v,
                        "label": v,
                        "node_type": "Vehicle",
                        "category": "vehicle",
                        "is_center": False
                    }
                })
            elements.append({
                "data": {
                    "id": f"{entity_id}-{v}-OWNS_VEHICLE",
                    "source": entity_id,
                    "target": v,
                    "relationship": "OWNS_VEHICLE",
                    "label": "OWNS",
                    "category": "vehicle"
                }
            })
            breakdown["total_connections"] += 1

        # Location Nodes & Edges
        for loc in c["locations"]:
            if loc not in added_nodes:
                added_nodes.add(loc)
                elements.append({
                    "data": {
                        "id": loc,
                        "label": loc,
                        "node_type": "Location",
                        "category": "location",
                        "is_center": False
                    }
                })
            elements.append({
                "data": {
                    "id": f"{entity_id}-{loc}-OBSERVED_AT",
                    "source": entity_id,
                    "target": loc,
                    "relationship": "OBSERVED_AT",
                    "label": "SIGHTED",
                    "category": "location"
                }
            })
            breakdown["total_connections"] += 1

        # Financial Transactions (sample up to 25 distinct counterparties)
        seen_cp = set()
        for t in raw["transactions"]:
            cp = t["receiver"] if t["sender"] == entity_id else t["sender"]
            if not cp or cp in seen_cp or len(seen_cp) >= 20:
                continue
            seen_cp.add(cp)

            if cp not in added_nodes:
                added_nodes.add(cp)
                elements.append({
                    "data": {
                        "id": cp,
                        "label": cp,
                        "node_type": "Person",
                        "category": "finance",
                        "is_center": False
                    }
                })

            amt = t["amount"]
            amt_label = f"₹{amt:,.0f}" if amt < 100000 else f"₹{amt/100000:.1f}L"
            if t["is_structured"]:
                amt_label += " (STR)"

            is_out = (t["sender"] == entity_id)
            elements.append({
                "data": {
                    "id": f"{t['transaction_id']}-{entity_id}-{cp}",
                    "source": entity_id if is_out else cp,
                    "target": cp if is_out else entity_id,
                    "relationship": "TRANSFERRED_FUNDS",
                    "label": amt_label,
                    "category": "finance",
                    "amount": amt,
                    "is_structured": t["is_structured"]
                }
            })
            breakdown["total_connections"] += 1

        return {
            "center_id": entity_id,
            "elements": elements,
            "breakdown": breakdown
        }

    def get_full_network(self, limit=150):
        elements = []
        added_nodes = set()

        # Add top suspects
        top_suspects = sorted(self.criminals_map.values(), key=lambda x: x["connection_count"], reverse=True)[:30]
        for s in top_suspects:
            s_id = s["name"]
            if s_id not in added_nodes:
                added_nodes.add(s_id)
                elements.append({
                    "data": {
                        "id": s_id,
                        "label": s_id,
                        "node_type": "Person"
                    }
                })

            # Add vehicles
            for v in s["vehicles"][:2]:
                if v not in added_nodes:
                    added_nodes.add(v)
                    elements.append({"data": {"id": v, "label": v, "node_type": "Vehicle"}})
                elements.append({"data": {"source": s_id, "target": v, "relationship": "OWNS_VEHICLE"}})

            # Add FIRs
            for f in s["firs"]:
                if f not in added_nodes:
                    added_nodes.add(f)
                    elements.append({"data": {"id": f, "label": f, "node_type": "FIR"}})
                elements.append({"data": {"source": s_id, "target": f, "relationship": "MENTIONED_IN"}})

        # Add transactions between top suspects
        for t in self.transactions:
            if len(elements) >= limit:
                break
            s, r = t["sender"], t["receiver"]
            if s in added_nodes and r in added_nodes:
                elements.append({
                    "data": {
                        "source": s,
                        "target": r,
                        "relationship": "TRANSFERRED_FUNDS"
                    }
                })

        return {"total_elements": len(elements), "elements": elements}

    def get_all_firs(self, q=None, police_station=None, status=None, limit=100):
        results = []
        for f in self.firs:
            # Filter by police station
            if police_station and police_station.lower() != "all":
                if police_station.lower() not in f.get("police_station", "").lower():
                    continue

            # Filter by status
            if status and status.lower() != "all":
                if status.lower() not in f.get("status", "").lower():
                    continue

            # Search query
            if q:
                ql = q.lower()
                matches = (
                    ql in f.get("fir_no", "").lower() or
                    ql in f.get("police_station", "").lower() or
                    ql in f.get("narrative", "").lower() or
                    ql in f.get("crime_category", "").lower() or
                    any(ql in p.lower() for p in f.get("persons", [])) or
                    any(ql in v.lower() for v in f.get("vehicles", [])) or
                    any(ql in s.lower() for s in f.get("sections", []))
                )
                if not matches:
                    continue

            results.append(f)

        all_stations = sorted(list(set(x.get("police_station") for x in self.firs if x.get("police_station"))))
        all_suspects = set(p for x in self.firs for p in x.get("persons", []))

        return {
            "total": len(results),
            "firs": results[:limit],
            "stations": all_stations,
            "stats": {
                "total_firs": len(self.firs),
                "active_investigations": sum(1 for x in self.firs if "ACTIVE" in x.get("status", "")),
                "charge_sheets": sum(1 for x in self.firs if "CHARGE SHEET" in x.get("status", "")),
                "total_suspects_linked": len(all_suspects),
                "stations_count": len(all_stations)
            }
        }
