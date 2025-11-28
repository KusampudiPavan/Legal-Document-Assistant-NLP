# src/groq_qa.py

import os
import requests
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()  # load .env file

GROQ_API_KEY = os.getenv("GROQ_API_KEY")


GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL_NAME = "llama-3.1-8b-instant"  # or "llama-3.3-70b-versatile"



def _build_prompt(question: str, context: str) -> str:
    """
    Build a legal-focused prompt for Groq.
    """
    return f"""You are a precise legal assistant.

Use ONLY the information in the CONTEXT below to answer the QUESTION.
If the answer is not clearly stated in the context, say: "The answer is not clearly specified in the provided text."

CONTEXT:
{context}

QUESTION:
{question}

Answer in 2–4 sentences in clear, formal English.
"""


def answer_question_groq(question: str, context: str) -> str:
    """
    Call Groq LLM (Llama3) to answer a question based on context.
    Returns a natural language answer as a string.
    """
    if not GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not set in environment. Please export it before running."
        )

    prompt = _build_prompt(question, context)

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": GROQ_MODEL_NAME,
        "messages": [
            {
                "role": "user",
                "content": prompt,
            }
        ],
        "temperature": 0.2,
        "max_tokens": 256,
    }

    response = requests.post(
        GROQ_API_URL,
        headers=headers,
        json=payload,
        timeout=30,
    )

    if response.status_code != 200:
        raise RuntimeError(
            f"Groq API error {response.status_code}: {response.text}"
        )

    data = response.json()
    try:
        answer = data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Unexpected Groq API response format: {e}, data={data}")

    return answer
