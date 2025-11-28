# src/summarizer.py

from functools import lru_cache

import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

from .config import (
    SUMMARIZATION_MODEL_NAME,
    MODELS_DIR,
    MAX_INPUT_LENGTH,
    MAX_TARGET_LENGTH,
)

# Folder where we saved fine-tuned model in train_summarization.py
FINETUNED_DIR = MODELS_DIR / "summarizer-t5-small"


def _get_device() -> torch.device:
    if torch.backends.mps.is_available():
        print("Using Apple MPS device")
        return torch.device("mps")
    if torch.cuda.is_available():
        print("Using CUDA GPU")
        return torch.device("cuda")
    print("Using CPU")
    return torch.device("cpu")


@lru_cache(maxsize=1)
def load_model_and_tokenizer():
    """
    Load tokenizer + model once and cache them.
    Prefer fine-tuned model if it exists, else base model.
    """
    if FINETUNED_DIR.exists():
        print(f"Loading fine-tuned model from {FINETUNED_DIR}")
        tokenizer = AutoTokenizer.from_pretrained(FINETUNED_DIR)
        model = AutoModelForSeq2SeqLM.from_pretrained(FINETUNED_DIR)
    else:
        print(f"Fine-tuned model not found. Loading base model {SUMMARIZATION_MODEL_NAME}")
        tokenizer = AutoTokenizer.from_pretrained(SUMMARIZATION_MODEL_NAME)
        model = AutoModelForSeq2SeqLM.from_pretrained(SUMMARIZATION_MODEL_NAME)

    device = _get_device()
    model.to(device)
    model.eval()

    return tokenizer, model, device


def summarize_text(text: str, max_new_tokens: int = 256) -> str:
    """
    Generate a summary for the given legal/policy text.
    """
    tokenizer, model, device = load_model_and_tokenizer()

    # For T5 we use a "summarize:" prefix
    prefixed_text = f"summarize: {text}"

    inputs = tokenizer(
        prefixed_text,
        return_tensors="pt",
        truncation=True,
        max_length=MAX_INPUT_LENGTH,
    ).to(device)

    with torch.no_grad():
        generated_ids = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            num_beams=4,
            length_penalty=1.0,
            early_stopping=True,
        )

    summary = tokenizer.decode(generated_ids[0], skip_special_tokens=True)
    return summary
