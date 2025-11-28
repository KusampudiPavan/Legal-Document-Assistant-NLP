
// frontend/src/App.jsx
import React, { useState } from "react";

const API_BASE = "http://localhost:8000"; // FastAPI backend

const TABS = ["Summary", "Entities", "QA", "Combined"];

// Simple loading spinner component
const Spinner = () => (
  <div className="spinner" aria-label="Loading">
    <div className="spinner-circle" />
  </div>
);


function App() {
  const [activeTab, setActiveTab] = useState("Summary");
  const [text, setText] = useState("");
  const [question, setQuestion] = useState("");

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [entities, setEntities] = useState([]);
  const [qaResult, setQaResult] = useState(null);
  const [error, setError] = useState("");

  // QA mode: "extractive" (local RoBERTa) or "generative" (Groq Llama3 via /qa_gen)
  const [qaMode, setQaMode] = useState("extractive");

  const resetOutputs = () => {
    setSummary("");
    setEntities([]);
    setQaResult(null);
    setError("");
  };

  const handlePdfUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetOutputs();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/extract_text`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error extracting text from PDF.");
      }

      // Put extracted text into the main textarea
      setText(data.text || "");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      // reset input so re-uploading same file works
      event.target.value = "";
    }
  };
  

  const handleSummarize = async () => {
    if (!text.trim()) {
      setError("Please enter some text to summarize.");
      return;
    }
    resetOutputs();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, max_new_tokens: 256 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error from API");
      setSummary(data.summary);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEntities = async () => {
    if (!text.trim()) {
      setError("Please enter some text to analyze entities.");
      return;
    }
    resetOutputs();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error from API");
      setEntities(data.entities || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Extractive QA (local RoBERTa /qa)
  const handleQA = async () => {
    if (!text.trim()) {
      setError("Please enter context text.");
      return;
    }
    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }
    resetOutputs();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: text, question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error from API");
      setQaResult(data); // { answer, score, start, end }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Generative QA (Groq Llama3 /qa_gen)
  const handleQAGen = async () => {
    if (!text.trim()) {
      setError("Please enter context text.");
      return;
    }
    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }
    resetOutputs();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/qa_gen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: text,
          question,
          max_new_tokens: 128,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error from API");

      // Backend returns: { answer: "..." }
      setQaResult({
        answer: data.answer,
        score: null,
        start: -1,
        end: -1,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQARag = async () => {
    if (!text.trim()) {
      setError("Please enter context text.");
      return;
    }
    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }
    resetOutputs();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/qa_rag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: text,
          question,
          top_k: 3,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error from RAG QA API.");

      // data = { answer, retrieved_chunks: [...] }
      setQaResult({
        answer: data.answer,
        score: null,
        start: -1,
        end: -1,
      });
      // If you later want to show retrieved chunks in UI, we can store them separately.
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSummary = () => {
    if (!summary) return;
    const blob = new Blob([summary], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "summary.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadEntities = () => {
    if (!entities || entities.length === 0) return;
    const json = JSON.stringify(entities, null, 2);
    const blob = new Blob([json], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "entities.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError("Please enter text to analyze.");
      return;
    }
    resetOutputs();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          question: question || null,
          max_new_tokens: 256,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error from API");
      setSummary(data.summary);
      setEntities(data.entities || []);
      setQaResult(data.qa || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // const renderOutputs = () => (
  //   <div className="outputs">
  //     {error && <div className="error">⚠ {error}</div>}

  //     {summary && (
  //       <div className="card">
  //         <h3>Summary</h3>
  //         <p>{summary}</p>
  //       </div>
  //     )}

  //     {entities && entities.length > 0 && (
  //       <div className="card">
  //         <h3>Entities</h3>
  //         <div className="entities-list">
  //           {entities.map((ent, idx) => (
  //             <span key={idx} className="entity-chip">
  //               <strong>{ent.text}</strong> <span>[{ent.label}]</span>
  //             </span>
  //           ))}
  //         </div>
  //       </div>
  //     )}

  //     {qaResult && (
  //       <div className="card">
  //         <h3>QA Result</h3>
  //         <p>
  //           <strong>Answer:</strong> {qaResult.answer || "(no answer found)"}
  //         </p>
  //         {qaMode === "extractive" && qaResult.score !== null && (
  //           <p>
  //             <strong>Score:</strong>{" "}
  //             {qaResult.score ? qaResult.score.toFixed(3) : "N/A"}
  //           </p>
  //         )}
  //       </div>
  //     )}
  //   </div>
  // );

  const renderOutputs = () => (
    <div className="outputs">
      {error && <div className="error">⚠ {error}</div>}

      {/* Centered spinner when loading and no results yet */}
      {loading && !summary && entities.length === 0 && !qaResult && !error && (
        <div className="spinner-container">
          <Spinner />
          <p className="spinner-text">Thinking...</p>
        </div>
      )}

      {/* {summary && (
        <div className="card">
          <h3>Summary</h3>
          <p>{summary}</p>
        </div>
      )}

      {entities && entities.length > 0 && (
        <div className="card">
          <h3>Entities</h3>
          <div className="entities-list">
            {entities.map((ent, idx) => (
              <span key={idx} className="entity-chip">
                <strong>{ent.text}</strong> <span>[{ent.label}]</span>
              </span>
            ))}
          </div>
        </div>
      )} */}
      {summary && (
        <div className="card">
          <h3>Summary</h3>
          <p>{summary}</p>
          <div className="card-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={handleDownloadSummary}
            >
              Download Summary (.txt)
            </button>
          </div>
        </div>
      )}

      {entities && entities.length > 0 && (
        <div className="card">
          <h3>Entities</h3>
          <div className="entities-list">
            {entities.map((ent, idx) => (
              <span key={idx} className="entity-chip">
                <strong>{ent.text}</strong> <span>[{ent.label}]</span>
              </span>
            ))}
          </div>
          <div className="card-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={handleDownloadEntities}
            >
              Download Entities (.json)
            </button>
          </div>
        </div>
      )}

      {qaResult && (
        <div className="card">
          <h3>QA Result</h3>
          <p>
            <strong>Answer:</strong> {qaResult.answer || "(no answer found)"}
          </p>
          {qaMode === "extractive" && qaResult.score !== null && (
            <p>
              <strong>Score:</strong>{" "}
              {qaResult.score ? qaResult.score.toFixed(3) : "N/A"}
            </p>
          )}
        </div>
      )}
    </div>
  );


  const renderTabContent = () => {
    switch (activeTab) {
      case "Summary":
        return (
          <>
            <button
              className="primary-btn"
              onClick={handleSummarize}
              disabled={loading}
            >
              {loading ? "Summarizing..." : "Summarize Text"}
            </button>
            {renderOutputs()}
          </>
        );

      case "Entities":
        return (
          <>
            <button
              className="primary-btn"
              onClick={handleEntities}
              disabled={loading}
            >
              {loading ? "Extracting..." : "Extract Entities"}
            </button>
            {renderOutputs()}
          </>
        );

      // case "QA":
      //   return (
      //     <>
      //       <div className="qa-mode-toggle">
      //         <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
      //           QA Mode:
      //         </span>
      //         <div className="qa-mode-buttons">
      //           <button
      //             type="button"
      //             className={`mode-btn ${
      //               qaMode === "extractive" ? "mode-active" : ""
      //             }`}
      //             onClick={() => {
      //               resetOutputs();
      //               setQaMode("extractive");
      //             }}
      //           >
      //             Extractive
      //           </button>
      //           <button
      //             type="button"
      //             className={`mode-btn ${
      //               qaMode === "generative" ? "mode-active" : ""
      //             }`}
      //             onClick={() => {
      //               resetOutputs();
      //               setQaMode("generative");
      //             }}
      //           >
      //             Generative (Groq)
      //           </button>
      //         </div>
      //       </div>

      //       <label className="label">
      //         Question
      //         <input
      //           type="text"
      //           value={question}
      //           onChange={(e) => setQuestion(e.target.value)}
      //           placeholder='e.g., What does the term "nonprofit organization" mean?'
      //         />
      //       </label>

      //       <button
      //         className="primary-btn"
      //         onClick={qaMode === "extractive" ? handleQA : handleQAGen}
      //         disabled={loading}
      //       >
      //         {loading
      //           ? qaMode === "extractive"
      //             ? "Answering (extractive)..."
      //             : "Answering (generative)..."
      //           : qaMode === "extractive"
      //           ? "Ask (Extractive QA)"
      //           : "Ask (Generative QA via Groq)"}
      //       </button>

      //       {renderOutputs()}
      //     </>
      //   );
      case "QA":
        return (
          <>
            <div className="qa-mode-toggle">
              <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                QA Mode:
              </span>
              <div className="qa-mode-buttons">
                <button
                  type="button"
                  className={`mode-btn ${
                    qaMode === "extractive" ? "mode-active" : ""
                  }`}
                  onClick={() => {
                    resetOutputs();
                    setQaMode("extractive");
                  }}
                >
                  Extractive
                </button>
                <button
                  type="button"
                  className={`mode-btn ${
                    qaMode === "generative" ? "mode-active" : ""
                  }`}
                  onClick={() => {
                    resetOutputs();
                    setQaMode("generative");
                  }}
                >
                  Generative (Groq)
                </button>
                <button
                  type="button"
                  className={`mode-btn ${
                    qaMode === "rag" ? "mode-active" : ""
                  }`}
                  onClick={() => {
                    resetOutputs();
                    setQaMode("rag");
                  }}
                >
                  RAG (Embed + Groq)
                </button>
              </div>
            </div>

            <label className="label">
              Question
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder='e.g., What does the term "nonprofit organization" mean?'
              />
            </label>

            <button
              className="primary-btn"
              onClick={
                qaMode === "extractive"
                  ? handleQA
                  : qaMode === "generative"
                  ? handleQAGen
                  : handleQARag
              }
              disabled={loading}
            >
              {loading
                ? qaMode === "extractive"
                  ? "Answering (extractive)..."
                  : qaMode === "generative"
                  ? "Answering (generative)..."
                  : "Answering (RAG+Groq)..."
                : qaMode === "extractive"
                ? "Ask (Extractive QA)"
                : qaMode === "generative"
                ? "Ask (Generative QA via Groq)"
                : "Ask (RAG: Retrieve + Groq)"}
            </button>

            {renderOutputs()}
          </>
        );
        

      case "Combined":
        return (
          <>
            <label className="label">
              Question (optional)
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask something about the text (optional)"
              />
            </label>
            <button
              className="primary-btn"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? "Analyzing..." : "Analyze (Summary + NER + QA)"}
            </button>
            {renderOutputs()}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Legal Document Assistant</h1>
        <p className="subtitle">
          Summarization • Entity Extraction • Question Answering
        </p>
      </header>

      <div className="layout">
        <div className="left-panel">
          <div className="upload-row">
            <label className="label" style={{ flex: 1 }}>
              Input Text
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste a legal/policy document or long text here, or upload a PDF below..."
                rows={16}
              />
            </label>
          </div>

          <div className="upload-row" style={{ marginTop: "0.75rem" }}>
            <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
              Or upload a PDF document:
            </span>
            <input
              type="file"
              accept="application/pdf"
              onChange={handlePdfUpload}
              className="file-input"
            />
          </div>
        </div>
        {/* <div className="left-panel">
          <label className="label">
            Input Text
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste a legal/policy document or long text here..."
              rows={16}
            />
          </label>
        </div> */}
        
      


        <div className="right-panel">
          <div className="tabs">
            {TABS.map((tab) => (
              <button
                key={tab}
                className={`tab-btn ${
                  activeTab === tab ? "tab-active" : ""
                }`}
                onClick={() => {
                  resetOutputs();
                  setActiveTab(tab);
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="tab-content">{renderTabContent()}</div>
        </div>
      </div>
    </div>
  );
}

export default App;
