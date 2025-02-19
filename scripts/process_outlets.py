import pandas as pd
import numpy as np
import sys
import json
import re
import os
from geopy.distance import geodesic
import google.generativeai as genai
from fuzzywuzzy import fuzz
import time

# Configure Gemini API
genai.configure(api_key="") 
model = genai.GenerativeModel("gemini-pro")

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the Haversine distance between two latitude-longitude points."""
    return geodesic((lat1, lon1), (lat2, lon2)).km

def filter_dark_outlets(df_pjp, df_dark_outlet, max_distance=2):
    """
    For each distinct loginId in df_pjp, find outlet codes, compute distance with all df_darkOutlet entries,
    and return df_darkOutlet rows whose distance is less than 2 km.
    """
    result = []
    
    for login_id in df_pjp['loginId'].unique():
        df_pjp_filtered = df_pjp[df_pjp['loginId'] == login_id]
        
        for _, pjp_row in df_pjp_filtered.iterrows():
            pjp_lat, pjp_lon = pjp_row['latitude'], pjp_row['longitude']
            
            for _, dark_row in df_dark_outlet.iterrows():
                dark_lat, dark_lon = dark_row['latitude'], dark_row['longitude']
                
                distance = haversine_distance(pjp_lat, pjp_lon, dark_lat, dark_lon)
                if distance < max_distance:
                    dark_row_dict = dark_row.to_dict()
                    if 'loginId' not in dark_row_dict:
                        dark_row_dict['loginId'] = [login_id]  
                    else:
                        dark_row_dict['loginId'].append(login_id)
                    result.append(dark_row_dict)
    
    return pd.DataFrame(result)


def use_llm_for_comparison(sub_channel_bright, sub_channel_dark):
    """Computes similarity score using fuzzy matching and LLM when needed."""
    similarity_score = fuzz.ratio(sub_channel_bright.lower(), sub_channel_dark.lower())

    if similarity_score > 85:
        return similarity_score / 100.0  # Return normalized score (0 to 1)

    model = genai.GenerativeModel("gemini-pro")
    prompt = f"""
    Compare the similarity between these two business sub-channels:
    1. {sub_channel_bright}
    2. {sub_channel_dark}
    
    Consider common spelling variations, abbreviations, and naming conventions. 
    Respond with ONLY a number between 0 and 100.
    """

    try:
        response = model.generate_content(prompt)

        if not response.candidates or not response.candidates[0].content.parts:
            return 0.0  

        similarity_score_text = response.candidates[0].content.parts[0].text.strip()

        try:
            similarity_score = float(similarity_score_text) / 100.0
            return similarity_score
        except ValueError:
            return 0.0

    except Exception as e:
        time.sleep(2)  # Delay before retrying
        return 0.0  # Default fallback

similarity_cache = {}

def map_login_subchannel(login_subchannel_mapping, df_filtered_dark_outlets):
    """Maps login IDs to dark outlets based on sub-channel similarity."""
    
    unique_entries_based_on_place_id = set()
    result = []

    for _, row in login_subchannel_mapping.iterrows():
        login_id = row.get('loginId')
        list_of_sub_channels = row.get('sub_channel', [])

        if not login_id or (isinstance(list_of_sub_channels, (list, set, tuple)) and not list_of_sub_channels):
            continue  

        dark_outlets_for_login_id = []

        for _, dark_outlet in df_filtered_dark_outlets.iterrows():
            place_id = dark_outlet.get('placeId')
            dark_login_ids = dark_outlet.get('loginId', [])

            if place_id in unique_entries_based_on_place_id or login_id not in dark_login_ids:
                continue 

            for sub_channel_bright in list_of_sub_channels:
                sub_channel_dark = dark_outlet.get('sub_channel', "")

                if not sub_channel_bright or not sub_channel_dark:
                    continue  

                if (sub_channel_bright, sub_channel_dark) in similarity_cache:
                    similarity_score = similarity_cache[(sub_channel_bright, sub_channel_dark)]
                else:
                    similarity_score = use_llm_for_comparison(sub_channel_bright, sub_channel_dark)
                    similarity_cache[(sub_channel_bright, sub_channel_dark)] = similarity_score 

                if similarity_score > 0.2:

                    dark_outlet_copy = dark_outlet.copy()  
                    dark_outlet_copy['similarity_score'] = similarity_score
                    dark_outlet_copy['loginId'] = login_id
                    dark_outlets_for_login_id.append(dark_outlet_copy)

        dark_outlets_for_login_id.sort(key=lambda x: x['similarity_score'], reverse=True)

        for dark_outlet in dark_outlets_for_login_id:
            unique_entries_based_on_place_id.add(dark_outlet['placeId'])
            result.append(dark_outlet) 

    return pd.DataFrame(result) if result else pd.DataFrame(columns=df_filtered_dark_outlets.columns.tolist() + ['similarity_score', 'loginId'])



def main(file1, file2):
    try:
        df_PJP = pd.read_csv(file1, low_memory=False)
        df_darkOutlet = pd.read_csv(file2, low_memory=False)
        
        df_filtered_dark_outlets = filter_dark_outlets(df_PJP, df_darkOutlet)

        LoginSubChannelMapping = df_PJP.groupby('loginId')['sub_channel'].unique().reset_index()

        filtered_df = map_login_subchannel(LoginSubChannelMapping,df_filtered_dark_outlets)
        
        # Print result as JSON for Node.js to parse
        print(json.dumps(filtered_df.to_dict(orient="records")))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python llmSimilarity.py <file1.csv> <file2.csv>"}), file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])