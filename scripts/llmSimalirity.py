import pandas as pd
import numpy as np
import google.generativeai as genai
import sys
import json

# Configure Google Gemini API (Make sure to replace with a valid API key)
genai.configure(api_key="AIzaSyBjTxnUxrUUfq2yVTkyLt9Q9QPswGaJpvQ")

# Haversine Distance Function
def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371e3  # Earth's radius in meters
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return R * c

# Function to get similarity score using Google Gemini AI
def get_match_score(row):
    prompt = f"""
    Compare the following two outlet details and return a similarity percentage (0-100%):

    Outlet 1: Name: {row['outlet_name']}
    Outlet 2: Name: {row['outlet_name_company']}

    Consider spelling variations, abbreviations, and common business naming patterns.

    Respond with ONLY a number between 0 and 100.
    """
    
    try:
        model = genai.GenerativeModel("gemini-pro")
        response = model.generate_content(prompt)
        score = int(response.text.strip())
        return max(0, min(100, score))
    except Exception as e:
        print(f"Error in AI scoring: {str(e)}", file=sys.stderr)
        return 0

# Function to find dark outlets
def find_dark_outlets(df_opportunitie, df_companyOutlet, threshold=20, match_threshold=90):
    matched_opportunities = set()
    matched_data = []

    for index, opp_row in df_opportunitie.iterrows():
        lat1, lon1 = opp_row["latitude"], opp_row["longitude"]
        
        try:
            df_companyOutlet["distance"] = haversine_distance(lat1, lon1, df_companyOutlet["latitude"], df_companyOutlet["longitude"])
        except Exception as e:
            print(f"Error in distance calculation: {str(e)}", file=sys.stderr)
            continue

        closest_outlet = df_companyOutlet.loc[df_companyOutlet["distance"].idxmin()]

        if closest_outlet["distance"] <= threshold:
            matched_entry = opp_row.to_dict()
            matched_entry.update({f"{key}_company": value for key, value in closest_outlet.to_dict().items()})
            matched_data.append(matched_entry)
            matched_opportunities.add(index)

    df_matched_outlets = pd.DataFrame(matched_data)
    df_potential_outlets = df_opportunitie.drop(index=matched_opportunities).reset_index(drop=True)

    if not df_matched_outlets.empty:
        df_matched_outlets['match_score'] = df_matched_outlets.apply(get_match_score, axis=1)
        df_matched_outlets["match_score"] = pd.to_numeric(df_matched_outlets["match_score"], errors='coerce')

        high_match_df = df_matched_outlets[df_matched_outlets["match_score"] < match_threshold]
        high_match_place_ids = high_match_df["placeId"].unique()

        df_dark_outlets = pd.concat([df_potential_outlets, df_opportunitie[df_opportunitie["placeId"].isin(high_match_place_ids)]], ignore_index=True)
    else:
        df_dark_outlets = df_potential_outlets

    return df_dark_outlets

# Main execution function
def main(file1, file2):
    try:
        df_opportunitie = pd.read_csv(file1, low_memory=False)
        df_companyOutlet = pd.read_csv(file2, low_memory=False)
        
        df_dark_outlets = find_dark_outlets(df_opportunitie, df_companyOutlet)
        
        # Print result as JSON for Node.js to parse
        print(json.dumps(df_dark_outlets.to_dict(orient="records")))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python llmSimilarity.py <file1.csv> <file2.csv>"}), file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
