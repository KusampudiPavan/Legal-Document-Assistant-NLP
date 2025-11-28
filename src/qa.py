# src/qa.py

from functools import lru_cache

import torch
from transformers import AutoTokenizer, AutoModelForQuestionAnswering

from .config import QA_MODEL_NAME, QA_MAX_CONTEXT_LENGTH


def _get_device() -> torch.device:
    if torch.backends.mps.is_available():
        print("QA: Using Apple MPS device")
        return torch.device("mps")
    if torch.cuda.is_available():
        print("QA: Using CUDA GPU")
        return torch.device("cuda")
    print("QA: Using CPU")
    return torch.device("cpu")


@lru_cache(maxsize=1)
def load_qa_model_and_tokenizer():
    """
    Load QA model + tokenizer once and cache them.
    """
    print(f"Loading QA model: {QA_MODEL_NAME}")
    tokenizer = AutoTokenizer.from_pretrained(QA_MODEL_NAME)
    model = AutoModelForQuestionAnswering.from_pretrained(QA_MODEL_NAME)

    device = _get_device()
    model.to(device)
    model.eval()
    return tokenizer, model, device


def answer_question(question: str, context: str) -> dict:
    """
    Given a question and a context (legal/policy text), return the best answer span.

    Returns:
        {
            "answer": str,
            "score": float,
            "start": int,
            "end": int
        }
    """
    tokenizer, model, device = load_qa_model_and_tokenizer()

    # Truncate context if it's too long for the QA model
    # (we can later upgrade to sliding window over long docs)
    encoded = tokenizer(
        question,
        context,
        truncation=True,
        max_length=QA_MAX_CONTEXT_LENGTH,
        return_tensors="pt",
    ).to(device)

    with torch.no_grad():
        outputs = model(**encoded)
        start_logits = outputs.start_logits
        end_logits = outputs.end_logits

    # Get the most likely beginning and end of the answer span
    start_idx = int(torch.argmax(start_logits, dim=-1)[0])
    end_idx = int(torch.argmax(end_logits, dim=-1)[0])

    # Ensure end_idx >= start_idx
    if end_idx < start_idx:
        end_idx = start_idx

    # Convert token indices back to string
    all_tokens = tokenizer.convert_ids_to_tokens(encoded["input_ids"][0])
    answer_tokens = all_tokens[start_idx : end_idx + 1]
    answer = tokenizer.convert_tokens_to_string(answer_tokens).strip()

    # Compute a simple confidence score (not perfect, but okay for now)
    start_score = torch.max(torch.softmax(start_logits, dim=-1)).item()
    end_score = torch.max(torch.softmax(end_logits, dim=-1)).item()
    score = float((start_score + end_score) / 2.0)

    return {
        "answer": answer,
        "score": score,
        "start": start_idx,
        "end": end_idx,
    }
