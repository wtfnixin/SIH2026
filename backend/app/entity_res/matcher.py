"""
Entity Matcher Module
Computes string similarity (Jaro-Winkler) and phonetic similarity (Double Metaphone)
to identify duplicate criminal entities across disparate datasets.
"""
from typing import Dict, Any, List, Tuple
from rapidfuzz import distance, fuzz
import jellyfish


def calculate_name_similarity(name1: str, name2: str) -> float:
    """
    Computes a strict similarity score between two suspect names (0.0 to 1.0).
    Enforces exact/strict surname matching and token-level evaluation.
    """
    if not name1 or not name2:
        return 0.0

    n1 = name1.strip().upper()
    n2 = name2.strip().upper()

    if n1 == n2:
        return 1.0

    tokens1 = n1.split()
    tokens2 = n2.split()

    # Rule 1: If surnames (last tokens) are completely different, reject auto-merge
    if len(tokens1) >= 2 and len(tokens2) >= 2:
        surname1 = tokens1[-1]
        surname2 = tokens2[-1]
        
        # Check surname distance
        surname_sim = distance.JaroWinkler.similarity(surname1, surname2)
        if surname_sim < 0.85:
            # Different surnames (e.g., Rao vs Roy, Gupta vs Sharma) -> Cap score at 0.50
            return round(surname_sim * 0.5, 4)

    # Rule 2: Single-Initial First Name Handling (e.g., "R. Sharma" vs "Rahul Sharma")
    is_initial1 = len(tokens1[0].replace(".", "")) == 1
    is_initial2 = len(tokens2[0].replace(".", "")) == 1

    if is_initial1 or is_initial2:
        init1 = tokens1[0].replace(".", "")[0]
        init2 = tokens2[0].replace(".", "")[0]

        if init1 == init2 and len(tokens1) >= 2 and len(tokens2) >= 2:
            if distance.JaroWinkler.similarity(tokens1[-1], tokens2[-1]) >= 0.90:
                # Single-initial first name match with exact surname (e.g. R. Sharma vs Rahul Sharma) -> Base score 0.82 (PROBABLE_ALIAS)
                return 0.8200

    # Rule 3: Token-by-token Jaro-Winkler evaluation
    jw_full = distance.JaroWinkler.similarity(n1, n2)
    token_sort = fuzz.token_sort_ratio(n1, n2) / 100.0

    # Rule 3: Phonetic similarity applied only to first names
    try:
        fn_meta1 = jellyfish.metaphone(tokens1[0])
        fn_meta2 = jellyfish.metaphone(tokens2[0])
        first_name_match = (fn_meta1 == fn_meta2 and tokens1[0] == tokens2[0])
    except Exception:
        first_name_match = False

    # Weighted Composite Score prioritizing exact character alignments
    composite_score = (0.7 * jw_full) + (0.3 * token_sort)
    if not first_name_match and abs(len(tokens1[0]) - len(tokens2[0])) <= 1:
        # Slight penalty for distinct first names (e.g., Karan vs Kiran)
        composite_score *= 0.90

    return round(composite_score, 4)


def evaluate_candidate_pair(entity1: Dict[str, Any], entity2: Dict[str, Any]) -> Tuple[str, float]:
    """
    Evaluates two entity dictionaries and classifies match status:
    - 'EXACT': 1.0 similarity
    - 'HIGH_CONFIDENCE': >= 0.94 similarity (Auto-Merge SAME_AS)
    - 'PROBABLE_ALIAS': 0.85 <= score < 0.94 (Flag for Review)
    - 'NO_MATCH': < 0.85
    """
    val1 = entity1.get("value", entity1.get("name", ""))
    val2 = entity2.get("value", entity2.get("name", ""))

    score = calculate_name_similarity(val1, val2)

    if score == 1.0:
        return ("EXACT", score)
    elif score >= 0.94:
        return ("HIGH_CONFIDENCE", score)
    elif score >= 0.85:
        return ("PROBABLE_ALIAS", score)
    else:
        return ("NO_MATCH", score)
