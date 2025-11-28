# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.summarizer import summarize_text

from src.ner import extract_entities

from src.qa import answer_question

from src.groq_qa import answer_question_groq




app = FastAPI(
    title="Legal Document Assistant API",
    description="Summarization (later: NER + QA) for legal/policy documents.",
    version="0.1.0",
)

# Allow frontend (React or any origin for now)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # later you can restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SummarizeRequest(BaseModel):
    text: str
    max_new_tokens: int | None = 256


class SummarizeResponse(BaseModel):
    summary: str


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/summarize", response_model=SummarizeResponse)
def summarize_endpoint(payload: SummarizeRequest):
    """
    Takes a long legal / policy text and returns a summary.
    """
    summary = summarize_text(
        text=payload.text,
        max_new_tokens=payload.max_new_tokens or 256,
    )
    return SummarizeResponse(summary=summary)


class NerRequest(BaseModel):
    text: str

class NerResponse(BaseModel):
    entities: list

@app.post("/ner", response_model=NerResponse)
def ner_endpoint(payload: NerRequest):
    """
    Extract entities (ORG, PERSON, DATE, MONEY, LAW REFERENCES, etc.)
    from legal/policy text.
    """
    result = extract_entities(payload.text)
    return NerResponse(entities=result["entities"])

class QARequest(BaseModel):
    question: str
    context: str


class QAResponse(BaseModel):
    answer: str
    score: float
    start: int
    end: int

@app.post("/qa", response_model=QAResponse)
def qa_endpoint(payload: QARequest):
    """
    Answer a question given a legal/policy context.
    Uses extractive QA (span prediction).
    """
    result = answer_question(
        question=payload.question,
        context=payload.context,
    )

    return QAResponse(
        answer=result["answer"],
        score=result["score"],
        start=result["start"],
        end=result["end"],
    )

class QAResult(BaseModel):
    answer: str
    score: float
    start: int
    end: int


class AnalyzeRequest(BaseModel):
    text: str
    question: str | None = None       # optional question
    max_new_tokens: int | None = 256  # for summary length


class AnalyzeResponse(BaseModel):
    summary: str
    entities: list
    qa: QAResult | None = None        # only filled if question is provided

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_endpoint(payload: AnalyzeRequest):
    """
    Combined endpoint:
    - Summarizes the input text
    - Extracts entities
    - Optionally answers a question about the text
    """
    # 1. Summary
    summary = summarize_text(
        text=payload.text,
        max_new_tokens=payload.max_new_tokens or 256,
    )

    # 2. NER
    ner_result = extract_entities(payload.text)
    entities = ner_result["entities"]

    # 3. Optional QA
    qa_result = None
    if payload.question:
        qa_raw = answer_question(
            question=payload.question,
            context=payload.text,
        )
        qa_result = QAResult(
            answer=qa_raw["answer"],
            score=qa_raw["score"],
            start=qa_raw["start"],
            end=qa_raw["end"],
        )

    return AnalyzeResponse(
        summary=summary,
        entities=entities,
        qa=qa_result,
    )

class QAGenRequest(BaseModel):
    question: str
    context: str
    max_new_tokens: int | None = None


class QAGenResponse(BaseModel):
    answer: str

@app.post("/qa_gen", response_model=QAGenResponse)
def qa_gen_endpoint(payload: QAGenRequest):
    """
    Generative QA endpoint (Groq Llama3):
    Returns a natural-language answer, not just a span.
    """
    answer = answer_question_groq(
        question=payload.question,
        context=payload.context,
    )
    return QAGenResponse(answer=answer)
