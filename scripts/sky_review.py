import pandas as pd
import google.generativeai as genai
import time
import sys
import json
from dotenv import load_dotenv
import os

# Configure Gemini API
load_dotenv()
api_key = os.getenv("Google_API3")
genai.configure(api_key=api_key)

def generate_response(question, prompt, user_answer, max_retries=3, delay=5):
    """
    Generates a response using the Gemini API with retry logic in case of quota exhaustion.
    """
    model = genai.GenerativeModel("gemini-1.5-pro-latest")
    llm_input = f"Question: {question}\nPrompt: {prompt}\nUser Answer: {user_answer}\n\nProvide a well-structured response."

    for attempt in range(max_retries):
        try:
            response = model.generate_content(llm_input)  
            return response.text if response else "No response generated"
        except Exception as e:
            time.sleep(delay)  
    return "Error occurred. Try again later."

def process_payload_with_llm(payload_df, questions_df):
    results = []

    for _, row in payload_df.iterrows():
        loginid = row["loginid"]
        outletcode = row["outletcode"]
        
        try:
            payload = json.loads(row["payload"]) 
        except json.JSONDecodeError:
            continue

        for entry in payload:
            qid = entry["qId"]
            answer = entry.get("answer", "")

            question_row = questions_df[questions_df["qId"] == qid]
            if not question_row.empty:
                question = question_row["Question"].values[0]
                prompt = question_row["Prompt"].values[0]

                llm_response = generate_response(question, prompt, answer)
                formatted_question = json.dumps(question)[1:-1]  # Removes the first and last quote
                formatted_answer = json.dumps(answer)[1:-1]
                formatted_llm_response = json.dumps(llm_response)[1:-1]

                results.append({
                    "loginid": loginid,
                    "outletcode": outletcode,
                    "qId": qid,
                    "question": formatted_question,
                    "user_answer": formatted_answer,
                    "llm_response": llm_response
                })

                time.sleep(1) 

    return pd.DataFrame(results)


def main(file1, file2):
    try:
        FAQ = pd.read_csv(file1, low_memory=False)
        QA = pd.read_csv(file2, low_memory=False)
        
        final_results = process_payload_with_llm(QA, FAQ)

        # Ensure only JSON output
        print(json.dumps(final_results.to_dict(orient="records")))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python skuReview.py <file1.csv> <file2.csv>"}), file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])