import json
import os
from pathlib import Path
from datetime import datetime
from app.db.neo4j_driver import get_neo4j_session
from app.db.postgres_driver import SessionLocal, init_db
from app.models.evidence import FirRecord

RAW_DATA = [
  {
    "fir_no": "FIR-2026-001",
    "police_station": "Koramangala Police Station",
    "incident_date": "2026-01-10",
    "report_id": "REP-88392",
    "source_file": "fir_scanned_001.pdf",
    "is_structured": True,
    "evidence": "CCTV footage and transaction logs",
    "money_values": 45000,
    "statement": "The complainant stated that an unauthorized digital transfer of funds occurred from their corporate account to an external wallet.",
    "reason": "Compromised API keys leading to illicit financial extraction.",
    "FIR": {
      "fir_no": "FIR-2026-001",
      "police_station": "Koramangala Police Station",
      "incident_date": "2026-01-10"
    },
    "Person": {
      "name": "Rajesh Kumar",
      "phone_number": "+91-9876543210"
    },
    "Location": {
      "name": "8th Block, Koramangala, Bengaluru"
    },
    "Organization": {
      "name": "Apex FinCorp"
    },
    "Vehicle": {
      "registration_number": "KA-01-HH-1234"
    },
    "Event": {
      "action": "Fraudulent Transfer",
      "timestamp": "2026-01-10T14:30:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-002",
    "police_station": "Indiranagar Police Station",
    "incident_date": "2026-01-12",
    "report_id": "REP-88393",
    "source_file": "fir_scanned_002.pdf",
    "is_structured": False,
    "evidence": "Witness testimony",
    "money_values": 12000,
    "statement": "The victim reported that a backpack containing a laptop and personal items was stolen from a seating area while unattended.",
    "reason": "Unattended valuables in a public cafe setting.",
    "FIR": {
      "fir_no": "FIR-2026-002",
      "police_station": "Indiranagar Police Station",
      "incident_date": "2026-01-12"
    },
    "Person": {
      "name": "Priya Sharma",
      "phone_number": "+91-9123456780"
    },
    "Location": {
      "name": "100ft Road, Indiranagar"
    },
    "Organization": {
      "name": "Cafe Coffee Day"
    },
    "Vehicle": {
      "registration_number": "KA-03-MK-5678"
    },
    "Event": {
      "action": "Theft",
      "timestamp": "2026-01-12T18:15:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-003",
    "police_station": "Whitefield Police Station",
    "incident_date": "2026-01-15",
    "report_id": "REP-88394",
    "source_file": "fir_scanned_003.pdf",
    "is_structured": True,
    "evidence": "Vehicle damage report and dashcam",
    "money_values": 85000,
    "statement": "A commercial vehicle collided with the victim's parked car and fled the scene without providing contact information.",
    "reason": "Reckless driving and avoidance of liability following a collision.",
    "FIR": {
      "fir_no": "FIR-2026-003",
      "police_station": "Whitefield Police Station",
      "incident_date": "2026-01-15"
    },
    "Person": {
      "name": "Amit Patel",
      "phone_number": "+91-9988776655"
    },
    "Location": {
      "name": "ITPL Main Road, Whitefield"
    },
    "Organization": {
      "name": "Tech Mahindra"
    },
    "Vehicle": {
      "registration_number": "KA-04-P-9988"
    },
    "Event": {
      "action": "Hit and Run",
      "timestamp": "2026-01-15T09:00:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-004",
    "police_station": "Jayanagar Police Station",
    "incident_date": "2026-01-18",
    "report_id": "REP-88395",
    "source_file": "fir_scanned_004.pdf",
    "is_structured": True,
    "evidence": "Digital wallet transfer record",
    "money_values": 150000,
    "statement": "The complainant received threatening messages demanding money under the threat of leaking private data online.",
    "reason": "Cyber blackmail targeting personal information.",
    "FIR": {
      "fir_no": "FIR-2026-004",
      "police_station": "Jayanagar Police Station",
      "incident_date": "2026-01-18"
    },
    "Person": {
      "name": "Sneha Rao",
      "phone_number": "+91-9741234567"
    },
    "Location": {
      "name": "4th Block, Jayanagar"
    },
    "Organization": {
      "name": "Paytm Payments"
    },
    "Vehicle": {
      "registration_number": "KA-05-AB-1111"
    },
    "Event": {
      "action": "Cyber Extortion",
      "timestamp": "2026-01-18T11:20:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-005",
    "police_station": "MG Road Police Station",
    "incident_date": "2026-01-20",
    "report_id": "REP-88396",
    "source_file": "fir_scanned_005.pdf",
    "is_structured": False,
    "evidence": "Hotel security logs",
    "money_values": 30000,
    "statement": "Hotel management filed a complaint regarding intentional destruction of room property and fixtures during an argument.",
    "reason": "Dispute escalation resulting in physical vandalism.",
    "FIR": {
      "fir_no": "FIR-2026-005",
      "police_station": "MG Road Police Station",
      "incident_date": "2026-01-20"
    },
    "Person": {
      "name": "Vikram Singh",
      "phone_number": "+91-9845012345"
    },
    "Location": {
      "name": "MG Road Boulevard"
    },
    "Organization": {
      "name": "Taj Residency"
    },
    "Vehicle": {
      "registration_number": "KA-02-XY-4321"
    },
    "Event": {
      "action": "Property Damage",
      "timestamp": "2026-01-20T22:45:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-006",
    "police_station": "Malleshwaram Police Station",
    "incident_date": "2026-01-22",
    "report_id": "REP-88397",
    "source_file": "fir_scanned_006.pdf",
    "is_structured": True,
    "evidence": "Stolen jewelry receipt",
    "money_values": 200000,
    "statement": "An unknown intruder broke into the residential premise through a back window and stole stored gold ornaments.",
    "reason": "Targeted residential burglary leveraging weak perimeter security.",
    "FIR": {
      "fir_no": "FIR-2026-006",
      "police_station": "Malleshwaram Police Station",
      "incident_date": "2026-01-22"
    },
    "Person": {
      "name": "Meenakshi Iyer",
      "phone_number": "+91-9880112233"
    },
    "Location": {
      "name": "Sampige Road, Malleshwaram"
    },
    "Organization": {
      "name": "C. Krishniah Chetty Jewellers"
    },
    "Vehicle": {
      "registration_number": "KA-03-CD-7890"
    },
    "Event": {
      "action": "Burglary",
      "timestamp": "2026-01-22T15:10:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-007",
    "police_station": "Electronic City Police Station",
    "incident_date": "2026-01-25",
    "report_id": "REP-88398",
    "source_file": "fir_scanned_007.pdf",
    "is_structured": True,
    "evidence": "Server access logs",
    "money_values": 500000,
    "statement": "Internal servers were accessed without authorization, leading to the exfiltration of proprietary client databases.",
    "reason": "Malicious network intrusion via compromised employee credentials.",
    "FIR": {
      "fir_no": "FIR-2026-007",
      "police_station": "Electronic City Police Station",
      "incident_date": "2026-01-25"
    },
    "Person": {
      "name": "Karthik Menon",
      "phone_number": "+91-9900223344"
    },
    "Location": {
      "name": "Phase 1, Electronic City"
    },
    "Organization": {
      "name": "Infosys Technologies"
    },
    "Vehicle": {
      "registration_number": "KA-01-EF-5555"
    },
    "Event": {
      "action": "Data Breach",
      "timestamp": "2026-01-25T03:00:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-008",
    "police_station": "BTM Layout Police Station",
    "incident_date": "2026-01-28",
    "report_id": "REP-88399",
    "source_file": "fir_scanned_008.pdf",
    "is_structured": False,
    "evidence": "Mobile phone call recordings",
    "money_values": 10000,
    "statement": "The complainant stated they were continuously stalked and received abusive calls from an unidentified number.",
    "reason": "Personal grievance and intentional psychological harassment.",
    "FIR": {
      "fir_no": "FIR-2026-008",
      "police_station": "BTM Layout Police Station",
      "incident_date": "2026-01-28"
    },
    "Person": {
      "name": "Ananya Das",
      "phone_number": "+91-9733445566"
    },
    "Location": {
      "name": "2nd Stage, BTM Layout"
    },
    "Organization": {
      "name": "Swiggy Delivery Hub"
    },
    "Vehicle": {
      "registration_number": "KA-05-GH-2468"
    },
    "Event": {
      "action": "Harassment",
      "timestamp": "2026-01-28T20:00:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-009",
    "police_station": "Banashankari Police Station",
    "incident_date": "2026-02-01",
    "report_id": "REP-88400",
    "source_file": "fir_scanned_009.pdf",
    "is_structured": True,
    "evidence": "Bank statement and cheque leaf",
    "money_values": 75000,
    "statement": "A business cheque issued for a trade transaction was intentionally bounced due to a stop-payment order placed in bad faith.",
    "reason": "Commercial dispute and financial deception.",
    "FIR": {
      "fir_no": "FIR-2026-009",
      "police_station": "Banashankari Police Station",
      "incident_date": "2026-02-01"
    },
    "Person": {
      "name": "Ramesh Gowda",
      "phone_number": "+91-9448112233"
    },
    "Location": {
      "name": "Banashankari 3rd Stage"
    },
    "Organization": {
      "name": "Canara Bank"
    },
    "Vehicle": {
      "registration_number": "KA-02-JK-1357"
    },
    "Event": {
      "action": "Cheque Bounce Fraud",
      "timestamp": "2026-02-01T12:00:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-010",
    "police_station": "Hebbal Police Station",
    "incident_date": "2026-02-03",
    "report_id": "REP-88401",
    "source_file": "fir_scanned_010.pdf",
    "is_structured": False,
    "evidence": "Traffic camera snapshot",
    "money_values": 5000,
    "statement": "The driver engaged in dangerous lane cutting and verbally threatened another motorist following a minor traffic dispute.",
    "reason": "Road rage incident sparked by aggressive driving behavior.",
    "FIR": {
      "fir_no": "FIR-2026-010",
      "police_station": "Hebbal Police Station",
      "incident_date": "2026-02-03"
    },
    "Person": {
      "name": "Deepak Kumar",
      "phone_number": "+91-9871122334"
    },
    "Location": {
      "name": "Hebbal Flyover"
    },
    "Organization": {
      "name": "BMTC"
    },
    "Vehicle": {
      "registration_number": "KA-04-F-3344"
    },
    "Event": {
      "action": "Traffic Violation & Threat",
      "timestamp": "2026-02-03T08:30:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-011",
    "police_station": "Yelahanka Police Station",
    "incident_date": "2026-02-05",
    "report_id": "REP-88402",
    "source_file": "fir_scanned_011.pdf",
    "is_structured": True,
    "evidence": "Property deed and forged signature report",
    "money_values": 1200000,
    "statement": "The accused generated fake ownership documents and attempted to sell a plot of land belonging to the victim using forged signatures.",
    "reason": "Premeditated real estate fraud for illegal monetary gain.",
    "FIR": {
      "fir_no": "FIR-2026-011",
      "police_station": "Yelahanka Police Station",
      "incident_date": "2026-02-05"
    },
    "Person": {
      "name": "Siddharth Rao",
      "phone_number": "+91-9900998877"
    },
    "Location": {
      "name": "New Town, Yelahanka"
    },
    "Organization": {
      "name": "BDA Office"
    },
    "Vehicle": {
      "registration_number": "KA-50-Z-9900"
    },
    "Event": {
      "action": "Land Fraud",
      "timestamp": "2026-02-05T11:00:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-012",
    "police_station": "Rajajinagar Police Station",
    "incident_date": "2026-02-08",
    "report_id": "REP-88403",
    "source_file": "fir_scanned_012.pdf",
    "is_structured": True,
    "evidence": "Shop CCTV footage",
    "money_values": 25000,
    "statement": "Store personnel caught an individual concealing high-value electronics merchandise and attempting to exit without paying.",
    "reason": "Retail theft captured by indoor security cameras.",
    "FIR": {
      "fir_no": "FIR-2026-012",
      "police_station": "Rajajinagar Police Station",
      "incident_date": "2026-02-08"
    },
    "Person": {
      "name": "Manjunath Swamy",
      "phone_number": "+91-9844112233"
    },
    "Location": {
      "name": "1st Block, Rajajinagar"
    },
    "Organization": {
      "name": "Orion Mall Retail"
    },
    "Vehicle": {
      "registration_number": "KA-02-BC-4455"
    },
    "Event": {
      "action": "Shoplifting",
      "timestamp": "2026-02-08T17:40:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-013",
    "police_station": "Shivajinagar Police Station",
    "incident_date": "2026-02-10",
    "report_id": "REP-88404",
    "source_file": "fir_scanned_013.pdf",
    "is_structured": False,
    "evidence": "Eyewitness accounts",
    "money_values": 18000,
    "statement": "The victim realized their wallet was missing from their pocket while navigating through a heavily crowded market street.",
    "reason": "Opportunistic theft in a high-density public area.",
    "FIR": {
      "fir_no": "FIR-2026-013",
      "police_station": "Shivajinagar Police Station",
      "incident_date": "2026-02-10"
    },
    "Person": {
      "name": "Mohammed Ali",
      "phone_number": "+91-9343112233"
    },
    "Location": {
      "name": "Commercial Street"
    },
    "Organization": {
      "name": "Ali Garments"
    },
    "Vehicle": {
      "registration_number": "KA-03-N-6677"
    },
    "Event": {
      "action": "Pickpocketing",
      "timestamp": "2026-02-10T14:15:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-014",
    "police_station": "Kengeri Police Station",
    "incident_date": "2026-02-13",
    "report_id": "REP-88405",
    "source_file": "fir_scanned_014.pdf",
    "is_structured": True,
    "evidence": "ATM Skimmer device and logs",
    "money_values": 60000,
    "statement": "Unauthorized withdrawals were made from multiple customer accounts after a skimming device was discovered installed on an ATM terminal.",
    "reason": "Cyber-physical banking fraud via hardware tampering.",
    "FIR": {
      "fir_no": "FIR-2026-014",
      "police_station": "Kengeri Police Station",
      "incident_date": "2026-02-13"
    },
    "Person": {
      "name": "Divya Nambiar",
      "phone_number": "+91-9895112233"
    },
    "Location": {
      "name": "Satellite Town, Kengeri"
    },
    "Organization": {
      "name": "State Bank of India ATM"
    },
    "Vehicle": {
      "registration_number": "KA-01-HG-8899"
    },
    "Event": {
      "action": "ATM Card Skimming",
      "timestamp": "2026-02-13T23:00:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-015",
    "police_station": "Basavanagudi Police Station",
    "incident_date": "2026-02-15",
    "report_id": "REP-88406",
    "source_file": "fir_scanned_015.pdf",
    "is_structured": False,
    "evidence": "Audio recording of threats",
    "money_values": 0,
    "statement": "The complainant received direct verbal threats to life and property from an acquaintance over a personal dispute.",
    "reason": "Interpersonal conflict leading to criminal intimidation.",
    "FIR": {
      "fir_no": "FIR-2026-015",
      "police_station": "Basavanagudi Police Station",
      "incident_date": "2026-02-15"
    },
    "Person": {
      "name": "Venkatesh Rao",
      "phone_number": "+91-9449112233"
    },
    "Location": {
      "name": "Bull Temple Road"
    },
    "Organization": {
      "name": "Vidyarthi Bhavan"
    },
    "Vehicle": {
      "registration_number": "KA-05-M-1234"
    },
    "Event": {
      "action": "Criminal Intimidation",
      "timestamp": "2026-02-15T10:45:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-016",
    "police_station": "Jayanagar Police Station",
    "incident_date": "2026-02-18",
    "report_id": "REP-88407",
    "source_file": "fir_scanned_016.pdf",
    "is_structured": True,
    "evidence": "Hospital medical report",
    "money_values": 40000,
    "statement": "The victim was physically attacked by unknown assailants resulting in injuries requiring emergency medical treatment.",
    "reason": "Sudden physical altercation and violent assault.",
    "FIR": {
      "fir_no": "FIR-2026-016",
      "police_station": "Jayanagar Police Station",
      "incident_date": "2026-02-18"
    },
    "Person": {
      "name": "Sunita Kulkarni",
      "phone_number": "+91-9886112233"
    },
    "Location": {
      "name": "9th Block, Jayanagar"
    },
    "Organization": {
      "name": "Apollo Hospitals"
    },
    "Vehicle": {
      "registration_number": "KA-01-AB-9876"
    },
    "Event": {
      "action": "Assault",
      "timestamp": "2026-02-18T19:30:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-017",
    "police_station": "Marathahalli Police Station",
    "incident_date": "2026-02-20",
    "report_id": "REP-88408",
    "source_file": "fir_scanned_017.pdf",
    "is_structured": True,
    "evidence": "Apartment gate entry register",
    "money_values": 350000,
    "statement": "Locks of a locked apartment were forced open while residents were out of town, and valuables were ransacked.",
    "reason": "Professional housebreaking during peak daytime hours.",
    "FIR": {
      "fir_no": "FIR-2026-017",
      "police_station": "Marathahalli Police Station",
      "incident_date": "2026-02-20"
    },
    "Person": {
      "name": "Nikhil Verma",
      "phone_number": "+91-9901112233"
    },
    "Location": {
      "name": "Outer Ring Road, Marathahalli"
    },
    "Organization": {
      "name": "Prestige Constructions"
    },
    "Vehicle": {
      "registration_number": "KA-03-EF-4321"
    },
    "Event": {
      "action": "Flat Burglary",
      "timestamp": "2026-02-20T13:00:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-018",
    "police_station": "Koramangala Police Station",
    "incident_date": "2026-02-22",
    "report_id": "REP-88409",
    "source_file": "fir_scanned_018.pdf",
    "is_structured": False,
    "evidence": "Pub management incident register",
    "money_values": 15000,
    "statement": "A physical fight broke out between two groups of patrons inside a lounge, leading to property destruction and injuries.",
    "reason": "Alcohol-fueled altercation and disorderly conduct.",
    "FIR": {
      "fir_no": "FIR-2026-018",
      "police_station": "Koramangala Police Station",
      "incident_date": "2026-02-22"
    },
    "Person": {
      "name": "Rohit Shetty",
      "phone_number": "+91-9845112233"
    },
    "Location": {
      "name": "5th Block, Koramangala"
    },
    "Organization": {
      "name": "Ttoffees Pub"
    },
    "Vehicle": {
      "registration_number": "KA-01-P-5566"
    },
    "Event": {
      "action": "Pub Brawl",
      "timestamp": "2026-02-22T23:50:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-019",
    "police_station": "Ulsoor Police Station",
    "incident_date": "2026-02-25",
    "report_id": "REP-88410",
    "source_file": "fir_scanned_019.pdf",
    "is_structured": True,
    "evidence": "Lake surveillance camera footage",
    "money_values": 0,
    "statement": "A motorcycle-borne duo snatched a gold chain from a morning walker and sped away before bystanders could react.",
    "reason": "Targeted snatching utilizing a fast getaway vehicle.",
    "FIR": {
      "fir_no": "FIR-2026-019",
      "police_station": "Ulsoor Police Station",
      "incident_date": "2026-02-25"
    },
    "Person": {
      "name": "Kavitha Menon",
      "phone_number": "+91-9742112233"
    },
    "Location": {
      "name": "Ulsoor Lake Promenade"
    },
    "Organization": {
      "name": "BBMP Parks Dept"
    },
    "Vehicle": {
      "registration_number": "KA-02-GA-1122"
    },
    "Event": {
      "action": "Chain Snatching",
      "timestamp": "2026-02-25T07:15:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-020",
    "police_station": "Indiranagar Police Station",
    "incident_date": "2026-02-28",
    "report_id": "REP-88411",
    "source_file": "fir_scanned_020.pdf",
    "is_structured": True,
    "evidence": "Cryptocurrency transaction hash log",
    "money_values": 750000,
    "statement": "The victim was lured into a fraudulent cryptocurrency investment scheme promising unrealistic daily high returns.",
    "reason": "Online financial scam utilizing fake investment portals.",
    "FIR": {
      "fir_no": "FIR-2026-020",
      "police_station": "Indiranagar Police Station",
      "incident_date": "2026-02-28"
    },
    "Person": {
      "name": "Arun Prasad",
      "phone_number": "+91-9980112233"
    },
    "Location": {
      "name": "12th Main, Indiranagar"
    },
    "Organization": {
      "name": "CoinDCX Exchange"
    },
    "Vehicle": {
      "registration_number": "KA-03-HE-7788"
    },
    "Event": {
      "action": "Crypto Scam",
      "timestamp": "2026-02-28T16:00:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-021",
    "police_station": "Sadashivanagar Police Station",
    "incident_date": "2026-03-02",
    "report_id": "REP-88412",
    "source_file": "fir_scanned_021.pdf",
    "is_structured": True,
    "evidence": "Security gate register and stolen items list",
    "money_values": 2500000,
    "statement": "A high-end bungalow was targeted by a professional gang who bypassed electronic security systems to steal cash and heirlooms.",
    "reason": "Organized crime targeting affluent residential zones.",
    "FIR": {
      "fir_no": "FIR-2026-021",
      "police_station": "Sadashivanagar Police Station",
      "incident_date": "2026-03-02"
    },
    "Person": {
      "name": "Raghavendra Rao",
      "phone_number": "+91-9840112233"
    },
    "Location": {
      "name": "Palace Grounds Road"
    },
    "Organization": {
      "name": "Rao Enterprises"
    },
    "Vehicle": {
      "registration_number": "KA-01-MC-9999"
    },
    "Event": {
      "action": "High-profile Burglary",
      "timestamp": "2026-03-02T02:30:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-022",
    "police_station": "Whitefield Police Station",
    "incident_date": "2026-03-05",
    "report_id": "REP-88413",
    "source_file": "fir_scanned_022.pdf",
    "is_structured": False,
    "evidence": "Email screenshots",
    "money_values": 90000,
    "statement": "Job seekers were duped into paying advance training and processing fees for fraudulent corporate placement offers.",
    "reason": "Employment scam leveraging fake HR communication.",
    "FIR": {
      "fir_no": "FIR-2026-022",
      "police_station": "Whitefield Police Station",
      "incident_date": "2026-03-05"
    },
    "Person": {
      "name": "Neha Gupta",
      "phone_number": "+91-9711112233"
    },
    "Location": {
      "name": "EPIP Zone, Whitefield"
    },
    "Organization": {
      "name": "Wipro Technologies"
    },
    "Vehicle": {
      "registration_number": "KA-04-ED-3322"
    },
    "Event": {
      "action": "Phishing & Job Fraud",
      "timestamp": "2026-03-05T14:00:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-023",
    "police_station": "Jayanagar Police Station",
    "incident_date": "2026-03-07",
    "report_id": "REP-88414",
    "source_file": "fir_scanned_023.pdf",
    "is_structured": True,
    "evidence": "Pharmacy stock audit report",
    "money_values": 45000,
    "statement": "An audit revealed the distribution and commercial sale of fake, sub-standard pharmaceutical drugs disguised as branded stock.",
    "reason": "Illegal medical manufacturing and distribution network.",
    "FIR": {
      "fir_no": "FIR-2026-023",
      "police_station": "Jayanagar Police Station",
      "incident_date": "2026-03-07"
    },
    "Person": {
      "name": "Suresh Kumar",
      "phone_number": "+91-9846112233"
    },
    "Location": {
      "name": "3rd Block, Jayanagar"
    },
    "Organization": {
      "name": "Apollo Pharmacy"
    },
    "Vehicle": {
      "registration_number": "KA-05-AB-7766"
    },
    "Event": {
      "action": "Counterfeit Medicine Sale",
      "timestamp": "2026-03-07T16:20:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-024",
    "police_station": "Koramangala Police Station",
    "incident_date": "2026-03-09",
    "report_id": "REP-88415",
    "source_file": "fir_scanned_024.pdf",
    "is_structured": True,
    "evidence": "Valet parking ticket and damage assessment",
    "money_values": 110000,
    "statement": "A luxury vehicle handed over to commercial valet parking was stolen from the parking compound overnight.",
    "reason": "Security lapse and unauthorized vehicle removal from custody.",
    "FIR": {
      "fir_no": "FIR-2026-024",
      "police_station": "Koramangala Police Station",
      "incident_date": "2026-03-09"
    },
    "Person": {
      "name": "Kiranmayi Reddy",
      "phone_number": "+91-9885112233"
    },
    "Location": {
      "name": "Forum Mall, Koramangala"
    },
    "Organization": {
      "name": "PVR Cinemas"
    },
    "Vehicle": {
      "registration_number": "KA-01-JJ-4433"
    },
    "Event": {
      "action": "Vehicle Theft from Valet",
      "timestamp": "2026-03-09T21:00:00Z"
    }
  },
  {
    "fir_no": "FIR-2026-025",
    "police_station": "Electronic City Police Station",
    "incident_date": "2026-03-10",
    "report_id": "REP-88416",
    "source_file": "fir_scanned_025.pdf",
    "is_structured": False,
    "evidence": "Witness video clip",
    "money_values": 20000,
    "statement": "An argument over overtaking on the tech park arterial road escalated into physical violence and damage to personal mirrors.",
    "reason": "Aggressive driver behavior and instantaneous physical confrontation.",
    "FIR": {
      "fir_no": "FIR-2026-025",
      "police_station": "Electronic City Police Station",
      "incident_date": "2026-03-10"
    },
    "Person": {
      "name": "Manoj Tiwari",
      "phone_number": "+91-9902112233"
    },
    "Location": {
      "name": "Phase 2, Electronic City"
    },
    "Organization": {
      "name": "TCS Campus"
    },
    "Vehicle": {
      "registration_number": "KA-51-EF-2211"
    },
    "Event": {
      "action": "Road Rage & Physical Assault",
      "timestamp": "2026-03-10T18:45:00Z"
    }
  }
]

SECTION_MAPPING = {
    "Fraudulent Transfer": ["IT ACT 66D", "IPC 420", "IPC 120B"],
    "Theft": ["IPC 379", "IPC 34"],
    "Hit and Run": ["IPC 279", "IPC 338", "MV ACT 134"],
    "Cyber Extortion": ["IPC 384", "IPC 506", "IT ACT 66E"],
    "Property Damage": ["IPC 427", "IPC 504"],
    "Burglary": ["IPC 457", "IPC 380"],
    "Data Breach": ["IT ACT 43", "IT ACT 66", "IPC 420"],
    "Harassment": ["IPC 354D", "IPC 509", "IT ACT 67"],
    "Cheque Bounce Fraud": ["NI ACT 138", "IPC 420"],
    "Traffic Violation & Threat": ["IPC 279", "IPC 506"],
    "Land Fraud": ["IPC 467", "IPC 468", "IPC 471", "IPC 420"],
    "Shoplifting": ["IPC 379", "IPC 411"],
    "Pickpocketing": ["IPC 379"],
    "ATM Card Skimming": ["IT ACT 66", "IPC 420", "IPC 468"],
    "Criminal Intimidation": ["IPC 503", "IPC 506"],
    "Assault": ["IPC 323", "IPC 324", "IPC 34"],
    "Flat Burglary": ["IPC 454", "IPC 380"],
    "Pub Brawl": ["IPC 160", "IPC 323", "IPC 504"],
    "Chain Snatching": ["IPC 392", "IPC 34"],
    "Crypto Scam": ["IT ACT 66D", "IPC 420", "IPC 120B"],
    "High-profile Burglary": ["IPC 457", "IPC 380", "IPC 120B"],
    "Phishing & Job Fraud": ["IT ACT 66D", "IPC 420", "IPC 468"],
    "Counterfeit Medicine Sale": ["DRUGS ACT SEC 27", "IPC 274", "IPC 420"],
    "Vehicle Theft from Valet": ["IPC 379", "IPC 406"],
    "Road Rage & Physical Assault": ["IPC 279", "IPC 323", "IPC 506"]
}

def main():
    print(f"Ingesting {len(RAW_DATA)} FIR records...")

    # 1. Prepare structured cleaned dataset
    cleaned_records = []
    for item in RAW_DATA:
        action = item.get("Event", {}).get("action", "General Crime")
        sections = SECTION_MAPPING.get(action, ["IPC 120B", "IPC 34"])
        person_name = item.get("Person", {}).get("name")
        person_phone = item.get("Person", {}).get("phone_number")
        location_name = item.get("Location", {}).get("name")
        org_name = item.get("Organization", {}).get("name")
        vehicle_reg = item.get("Vehicle", {}).get("registration_number")
        event_time = item.get("Event", {}).get("timestamp")

        narrative = f"{item['statement']}\n\nCause/Motive: {item['reason']}\nEvidence: {item['evidence']}"
        if item.get("money_values"):
            narrative += f"\nEstimated Value/Loss: ₹{item['money_values']:,}"

        cleaned_fir = {
            "fir_no": item["fir_no"],
            "police_station": item["police_station"],
            "incident_date": item["incident_date"],
            "report_id": item.get("report_id"),
            "source_file": item.get("source_file"),
            "is_structured": item.get("is_structured", True),
            "evidence": item.get("evidence"),
            "money_values": item.get("money_values", 0),
            "statement": item.get("statement"),
            "reason": item.get("reason"),
            "crime_category": action.upper(),
            "sections": sections,
            "status": "ACTIVE INVESTIGATION",
            "narrative": narrative,
            "suspects": [person_name] if person_name else [],
            "persons": [person_name] if person_name else [],
            "vehicles": [vehicle_reg] if vehicle_reg else [],
            "locations": [location_name] if location_name else [],
            "organization": org_name,
            "phone_number": person_phone,
            "event_action": action,
            "event_timestamp": event_time
        }
        cleaned_records.append(cleaned_fir)

    # Save to JSON file on disk
    for path_str in [
        "/app/data/cleaned_datasets/firs_cleaned.json",
        "/app/data/synthetic_data/firs_cleaned.json",
        "data/cleaned_datasets/firs_cleaned.json"
    ]:
        p = Path(path_str)
        if p.parent.exists():
            try:
                with open(p, "w", encoding="utf-8") as f:
                    json.dump(cleaned_records, f, indent=2)
                print(f"Saved cleaned JSON to {p}")
            except Exception as e:
                print(f"Could not save to {p}: {e}")

    # 2. Ingest into PostgreSQL
    init_db()
    pg_session = SessionLocal()
    pg_inserted = 0
    try:
        for rec in cleaned_records:
            existing = pg_session.query(FirRecord).filter_by(fir_no=rec["fir_no"]).first()
            inc_dt = None
            try:
                inc_dt = datetime.strptime(rec["incident_date"], "%Y-%m-%d")
            except Exception:
                inc_dt = datetime.utcnow()

            if not existing:
                fir_row = FirRecord(
                    fir_no=rec["fir_no"],
                    police_station=rec["police_station"],
                    incident_date=inc_dt,
                    crime_category=rec["crime_category"],
                    status=rec["status"],
                    sections=rec["sections"],
                    suspects=rec["suspects"],
                    vehicles=rec["vehicles"],
                    locations=rec["locations"],
                    narrative=rec["narrative"],
                    source_file=rec["source_file"]
                )
                pg_session.add(fir_row)
                pg_inserted += 1
            else:
                existing.police_station = rec["police_station"]
                existing.incident_date = inc_dt
                existing.crime_category = rec["crime_category"]
                existing.status = rec["status"]
                existing.sections = rec["sections"]
                existing.suspects = rec["suspects"]
                existing.vehicles = rec["vehicles"]
                existing.locations = rec["locations"]
                existing.narrative = rec["narrative"]
                existing.source_file = rec["source_file"]
        pg_session.commit()
        print(f"PostgreSQL: Inserted/Updated {len(cleaned_records)} records (new: {pg_inserted}).")
    except Exception as e:
        pg_session.rollback()
        print(f"PostgreSQL insertion error: {e}")
    finally:
        pg_session.close()

    # 3. Ingest into Neo4j Graph
    neo_inserted = 0
    with get_neo4j_session() as session:
        for rec in cleaned_records:
            cypher = """
            MERGE (f:FIR {fir_no: $fir_no})
            SET f.police_station = $police_station,
                f.incident_date = $incident_date,
                f.report_id = $report_id,
                f.source_file = $source_file,
                f.is_structured = $is_structured,
                f.evidence = $evidence,
                f.money_values = $money_values,
                f.statement = $statement,
                f.reason = $reason,
                f.crime_category = $crime_category,
                f.sections = $sections,
                f.status = $status,
                f.narrative = $narrative

            // Person node & relationships
            FOREACH (p_name IN $suspects |
                MERGE (p:Person {name: p_name})
                ON CREATE SET p.phone = $phone_number
                ON MATCH SET p.phone = coalesce(p.phone, $phone_number)
                MERGE (f)-[:INVOLVES]->(p)
                MERGE (p)-[:MENTIONED_IN]->(f)
            )

            // Phone node
            FOREACH (ph_num IN (CASE WHEN $phone_number IS NOT NULL AND $phone_number <> '' THEN [$phone_number] ELSE [] END) |
                MERGE (ph:Phone {phone_number: ph_num})
                FOREACH (p_name IN $suspects |
                    MERGE (p:Person {name: p_name})
                    MERGE (p)-[:HAS_PHONE]->(ph)
                )
            )

            // Location node & relationship
            FOREACH (loc_name IN $locations |
                MERGE (l:Location {name: loc_name})
                MERGE (f)-[:OCCURRED_AT]->(l)
                FOREACH (p_name IN $suspects |
                    MERGE (p:Person {name: p_name})
                    MERGE (p)-[:OPERATES_IN]->(l)
                )
            )

            // Vehicle node & relationships
            FOREACH (veh_reg IN $vehicles |
                MERGE (v:Vehicle {registration_number: veh_reg})
                MERGE (f)-[:INVOLVES_VEHICLE]->(v)
                FOREACH (p_name IN $suspects |
                    MERGE (p:Person {name: p_name})
                    MERGE (p)-[:OWNS_VEHICLE]->(v)
                )
                FOREACH (loc_name IN $locations |
                    MERGE (l:Location {name: loc_name})
                    MERGE (v)-[:SIGHTED_AT]->(l)
                )
            )

            // Organization node & relationships
            FOREACH (org_name IN (CASE WHEN $organization IS NOT NULL AND $organization <> '' THEN [$organization] ELSE [] END) |
                MERGE (o:Organization {name: org_name})
                MERGE (f)-[:ASSOCIATED_WITH]->(o)
                FOREACH (p_name IN $suspects |
                    MERGE (p:Person {name: p_name})
                    MERGE (p)-[:AFFILIATED_WITH]->(o)
                )
            )

            // Event node & relationships
            FOREACH (ev_act IN (CASE WHEN $event_action IS NOT NULL AND $event_action <> '' THEN [$event_action] ELSE [] END) |
                MERGE (e:Event {action: ev_act, name: ev_act})
                ON CREATE SET e.timestamp = $event_timestamp
                MERGE (f)-[:RECORDED_EVENT]->(e)
            )
            """
            session.run(cypher, {
                "fir_no": rec["fir_no"],
                "police_station": rec["police_station"],
                "incident_date": rec["incident_date"],
                "report_id": rec["report_id"],
                "source_file": rec["source_file"],
                "is_structured": rec["is_structured"],
                "evidence": rec["evidence"],
                "money_values": rec["money_values"],
                "statement": rec["statement"],
                "reason": rec["reason"],
                "crime_category": rec["crime_category"],
                "sections": rec["sections"],
                "status": rec["status"],
                "narrative": rec["narrative"],
                "suspects": rec["suspects"],
                "locations": rec["locations"],
                "vehicles": rec["vehicles"],
                "organization": rec["organization"],
                "phone_number": rec["phone_number"],
                "event_action": rec["event_action"],
                "event_timestamp": rec["event_timestamp"]
            })
            neo_inserted += 1

    print(f"Neo4j: Ingested {neo_inserted} FIR graphs with full Person, Phone, Vehicle, Location, Org, and Event connections!")

if __name__ == "__main__":
    main()
