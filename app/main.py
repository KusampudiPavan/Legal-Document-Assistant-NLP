# app/main.py

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.summarizer import summarize_text

from src.ner import extract_entities

from src.qa import answer_question

from src.groq_qa import answer_question_groq
import io
from PyPDF2 import PdfReader

from src.rag import answer_question_rag



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

@app.post("/extract_text")
async def extract_text(file: UploadFile = File(...)):
    """
    Extract text from an uploaded PDF and return it as plain text.
    For now we only support .pdf files.
    """
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported for text extraction.",
        )

    try:
        # Read file content into memory
        content = await file.read()
        pdf_bytes = io.BytesIO(content)

        reader = PdfReader(pdf_bytes)
        extracted_text_parts = []

        for page in reader.pages:
            page_text = page.extract_text() or ""
            extracted_text_parts.append(page_text)

        full_text = "\n\n".join(extracted_text_parts).strip()

        if not full_text:
            raise HTTPException(
                status_code=422,
                detail="No extractable text found in the PDF (might be scanned or image-based).",
            )

        return {"text": full_text}

    except HTTPException:
        # re-raise our own HTTPException
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract text from PDF: {e}",
        )

class QARagRequest(BaseModel):
  question: str
  context: str
  top_k: int | None = 3


class QARagResponse(BaseModel):
  answer: str
  retrieved_chunks: list[str]

@app.post("/qa_rag", response_model=QARagResponse)
def qa_rag_endpoint(payload: QARagRequest):
    """
    RAG-based QA:
    - Splits the full context into chunks
    - Retrieves top-k relevant chunks using embeddings
    - Asks Groq with only those chunks
    """
    result = answer_question_rag(
        question=payload.question,
        full_context=payload.context,
        top_k=payload.top_k or 3,
    )
    return QARagResponse(
        answer=result["answer"],
        retrieved_chunks=result["retrieved_chunks"],
    )
