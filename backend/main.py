import boto3
import pandas as pd
import io
import json
import logging
import html
import re
import time
import uuid
import threading
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

BUCKET   = "fashionsense-team10-reviews"
REGION   = "us-east-1"
MODEL_ID = "amazon.nova-lite-v1:0"

# CONFIGURATION FOR SPEED
CHUNK_SIZE       = 500
COMPREHEND_BATCH = 25
MAX_WORKERS      = 10  # Increased workers for faster translation
DEMO_LIMIT       = 100 # Set to 0 to process everything, or 100 for instant hackathon demos

s3         = boto3.client("s3",              region_name=REGION)
translate  = boto3.client("translate",       region_name=REGION)
comprehend = boto3.client("comprehend",      region_name=REGION)
bedrock    = boto3.client("bedrock-runtime", region_name=REGION)

FIT_WORDS     = ["tight", "loose", "small", "large", "size", "waist", "fit"]
QUALITY_WORDS = ["fabric", "material", "stitching", "cheap", "quality"]
STYLE_WORDS   = ["design", "color", "style", "look", "pattern"]
COMFORT_WORDS = ["comfortable", "soft", "itchy", "scratchy", "rough"]
VALUE_WORDS   = ["price", "expensive", "worth", "value", "cost"]
RETURN_WORDS  = ["return", "refund", "returning", "send back", "waste"]

jobs      = {}
jobs_lock = threading.Lock()

# ════════════════════════════════════════════════════════════════
# OPTIMIZED AWS HELPERS
# ════════════════════════════════════════════════════════════════

def single_translate(t):
    """Worker function for ThreadPool."""
    if not t or len(str(t)) < 5: return str(t)
    try:
        r = translate.translate_text(Text=str(t)[:5000], SourceLanguageCode="auto", TargetLanguageCode="en")
        return r["TranslatedText"]
    except:
        return str(t)

def batch_translate(texts):
    """Uses multi-threading to bypass the 1-by-1 bottleneck."""
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        return list(executor.map(single_translate, texts))

def batch_sentiment(texts):
    """Standard batch call for Comprehend."""
    results = [("NEUTRAL", 0.5)] * len(texts)
    for i in range(0, len(texts), COMPREHEND_BATCH):
        batch = [t[:4500] if t else "no review" for t in texts[i:i+COMPREHEND_BATCH]]
        try:
            r = comprehend.batch_detect_sentiment(TextList=batch, LanguageCode="en")
            for res in r.get("ResultList", []):
                idx = res["Index"]
                results[i + idx] = (res["Sentiment"], res["SentimentScore"]["Negative"])
        except Exception as e:
            logger.error(f"Comprehend batch error: {e}")
    return results

# ════════════════════════════════════════════════════════════════
# LOGIC HELPERS
# ════════════════════════════════════════════════════════════════

def classify_dimensions(text):
    t = str(text).lower()
    return {
        "fit": sum(1 for w in FIT_WORDS if w in t),
        "quality": sum(1 for w in QUALITY_WORDS if w in t),
        "style": sum(1 for w in STYLE_WORDS if w in t),
        "comfort": sum(1 for w in COMFORT_WORDS if w in t),
        "value": sum(1 for w in VALUE_WORDS if w in t),
    }

def compute_return_risk(neg_score, text):
    t = str(text).lower()
    ret = sum(1 for w in RETURN_WORDS if w in t)
    fit = sum(1 for w in FIT_WORDS if w in t)
    risk = (0.5 * neg_score + 0.3 * min(ret / 2, 1) + 0.2 * min(fit / 3, 1))
    return round(risk * 100, 1)

# ════════════════════════════════════════════════════════════════
# CORE ANALYSIS ENGINE
# ════════════════════════════════════════════════════════════════

def run_analysis(content, job_id=None):
    t0 = time.time()
    df = pd.read_csv(io.BytesIO(content))

    # Hackathon Demo Optimization: Cap at 100 for instant results
    original_full_count = len(df)
    if DEMO_LIMIT > 0 and len(df) > DEMO_LIMIT:
        df = df.head(DEMO_LIMIT)
        logger.info(f"DEMO MODE: Capped reviews at {DEMO_LIMIT} for speed.")

    # Detect Columns
    tc = next((c for c in df.columns if any(k in c.lower() for k in ["review","text","comment"])), df.columns[0])
    pc = next((c for c in df.columns if "product" in c.lower()), None)

    total_chunks = (len(df) + CHUNK_SIZE - 1) // CHUNK_SIZE
    results = []
    product_data = {}

    for chunk_idx in range(total_chunks):
        chunk = df.iloc[chunk_idx * CHUNK_SIZE : (chunk_idx + 1) * CHUNK_SIZE]
        
        # Batch AWS Processing
        texts = chunk[tc].astype(str).tolist()
        translated_texts = batch_translate(texts)
        sentiments = batch_sentiment(translated_texts)

        for i, (translated, (sentiment, neg_score)) in enumerate(zip(translated_texts, sentiments)):
            row = chunk.iloc[i]
            pid = str(row[pc]) if pc and pd.notna(row.get(pc)) else "UNKNOWN"
            dims = classify_dimensions(translated)
            risk = compute_return_risk(neg_score, translated)

            results.append({
                "product_id": pid, "original": str(row[tc]), "translated": translated,
                "sentiment": sentiment, "risk": risk, "dimensions": dims
            })

            if pid not in product_data:
                product_data[pid] = {"reviews": [], "dims": {"fit":0,"quality":0,"style":0,"comfort":0,"value":0}, "risks": []}
            
            product_data[pid]["reviews"].append(translated)
            product_data[pid]["risks"].append(risk)
            for d in dims: product_data[pid]["dims"][d] += dims[d]

    # Generate Final Summaries & Bedrock Insights
    product_summaries = {}
    ai_insights = {}

    for pid, data in product_data.items():
        total = len(data["reviews"])
        avg_risk = sum(data["risks"]) / max(total, 1)
        scores = {d: round(max(0, 5 - (data["dims"][d] / max(total,1)) * 5), 1) for d in data["dims"]}
        
        complaints = []
        if data["dims"]["fit"] > 0: complaints.append("Fit / sizing issues")
        if data["dims"]["quality"] > 0: complaints.append("Fabric / quality concerns")
        if data["dims"]["comfort"] > 0: complaints.append("Comfort problems")

        product_summaries[pid] = {"scores": scores, "avg_return_risk": round(avg_risk,1), "top_complaints": complaints}

        # Bedrock Call
        prompt = f"Product {pid}. Scores: {scores}. Risk: {round(avg_risk,1)}%. Complaints: {complaints}. Give 3 short bullet points: 1 Issue, 1 Strength, 1 Fix."
        try:
            body = json.dumps({"messages":[{"role":"user","content":[{"text":prompt}]}], "inferenceConfig":{"maxTokens":200,"temperature":0.5}})
            response = bedrock.invoke_model(modelId=MODEL_ID, body=body, contentType="application/json")
            resp_body = json.loads(response["body"].read().decode("utf-8"))
            ai_insights[pid] = resp_body["output"]["message"]["content"][0]["text"]
        except:
            ai_insights[pid] = "AI insight generation failed."

    elapsed = round(time.time() - t0, 2)
    return {
        "reviews": results, 
        "products": product_summaries, 
        "ai_insights": ai_insights,
        "metrics": {"time_sec": elapsed, "count": len(results), "full_file_count": original_full_count}
    }

# ════════════════════════════════════════════════════════════════
# ENDPOINTS
# ════════════════════════════════════════════════════════════════

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    content = await file.read()
    # Direct execution for faster response
    return run_analysis(content)

@app.get("/health")
def health():
    return {"status": "ok", "optimized": True, "demo_limit": DEMO_LIMIT}