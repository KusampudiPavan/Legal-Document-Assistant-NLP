// // frontend/src/App.jsx
// import React, { useState } from "react";

// const API_BASE = "http://localhost:8000"; // FastAPI backend

// const TABS = ["Summary", "Entities", "QA", "Combined"];

// function App() {
//   const [activeTab, setActiveTab] = useState("Summary");
//   const [text, setText] = useState("");
//   const [question, setQuestion] = useState("");

//   const [loading, setLoading] = useState(false);
//   const [summary, setSummary] = useState("");
//   const [entities, setEntities] = useState([]);
//   const [qaResult, setQaResult] = useState(null);
//   const [error, setError] = useState("");

//   // NEW: QA mode: "extractive" or "generative"
//   const [qaMode, setQaMode] = useState("extractive");

//   const resetOutputs = () => {
//     setSummary("");
//     setEntities([]);
//     setQaResult(null);
//     setError("");
//   };

//   const handleSummarize = async () => {
//     if (!text.trim()) {
//       setError("Please enter some text to summarize.");
//       return;
//     }
//     resetOutputs();
//     setLoading(true);
//     try {
//       const res = await fetch(`${API_BASE}/summarize`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ text, max_new_tokens: 256 }),
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.detail || "Error from API");
//       setSummary(data.summary);
//     } catch (e) {
//       setError(e.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleEntities = async () => {
//     if (!text.trim()) {
//       setError("Please enter some text to analyze entities.");
//       return;
//     }
//     resetOutputs();
//     setLoading(true);
//     try {
//       const res = await fetch(`${API_BASE}/ner`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ text }),
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.detail || "Error from API");
//       setEntities(data.entities || []);
//     } catch (e) {
//       setError(e.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleQA = async () => {
//     if (!text.trim()) {
//       setError("Please enter context text.");
//       return;
//     }
//     if (!question.trim()) {
//       setError("Please enter a question.");
//       return;
//     }
//     resetOutputs();
//     setLoading(true);
//     try {
//       const res = await fetch(`${API_BASE}/qa`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ context: text, question }),
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.detail || "Error from API");
//       setQaResult(data);
//     } catch (e) {
//       setError(e.message);
//     } finally {
//       setLoading(false);
//     }
//   };


//   const handleAnalyze = async () => {
//     if (!text.trim()) {
//       setError("Please enter text to analyze.");
//       return;
//     }
//     resetOutputs();
//     setLoading(true);
//     try {
//       const res = await fetch(`${API_BASE}/analyze`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           text,
//           question: question || null,
//           max_new_tokens: 256,
//         }),
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.detail || "Error from API");
//       setSummary(data.summary);
//       setEntities(data.entities || []);
//       setQaResult(data.qa || null);
//     } catch (e) {
//       setError(e.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const renderOutputs = () => {
//     return (
//       <div className="outputs">
//         {error && <div className="error">⚠ {error}</div>}

//         {summary && (
//           <div className="card">
//             <h3>Summary</h3>
//             <p>{summary}</p>
//           </div>
//         )}

//         {entities && entities.length > 0 && (
//           <div className="card">
//             <h3>Entities</h3>
//             <div className="entities-list">
//               {entities.map((ent, idx) => (
//                 <span key={idx} className="entity-chip">
//                   <strong>{ent.text}</strong> <span>[{ent.label}]</span>
//                 </span>
//               ))}
//             </div>
//           </div>
//         )}

//         {qaResult && (
//           <div className="card">
//             <h3>QA Result</h3>
//             <p>
//               <strong>Answer:</strong> {qaResult.answer || "(no answer found)"}
//             </p>
//             <p>
//               <strong>Score:</strong>{" "}
//               {qaResult.score ? qaResult.score.toFixed(3) : "N/A"}
//             </p>
//           </div>
//         )}
//       </div>
//     );
//   };

//   const renderTabContent = () => {
//     switch (activeTab) {
//       case "Summary":
//         return (
//           <>
//             <button
//               className="primary-btn"
//               onClick={handleSummarize}
//               disabled={loading}
//             >
//               {loading ? "Summarizing..." : "Summarize Text"}
//             </button>
//             {renderOutputs()}
//           </>
//         );
//       case "Entities":
//         return (
//           <>
//             <button
//               className="primary-btn"
//               onClick={handleEntities}
//               disabled={loading}
//             >
//               {loading ? "Extracting..." : "Extract Entities"}
//             </button>
//             {renderOutputs()}
//           </>
//         );  

        
//       case "QA":
//         return (
//           <>
//             <label className="label">
//               Question
//               <input
//                 type="text"
//                 value={question}
//                 onChange={(e) => setQuestion(e.target.value)}
//                 placeholder="e.g., Who signed the act?"
//               />
//             </label>
//             <button
//               className="primary-btn"
//               onClick={handleQA}
//               disabled={loading}
//             >
//               {loading ? "Answering..." : "Ask Question"}
//             </button>
//             {renderOutputs()}
//           </>
//         );
//       case "Combined":
//         return (
//           <>
//             <label className="label">
//               Question (optional)
//               <input
//                 type="text"
//                 value={question}
//                 onChange={(e) => setQuestion(e.target.value)}
//                 placeholder="Ask something about the text (optional)"
//               />
//             </label>
//             <button
//               className="primary-btn"
//               onClick={handleAnalyze}
//               disabled={loading}
//             >
//               {loading ? "Analyzing..." : "Analyze (Summary + NER + QA)"}
//             </button>
//             {renderOutputs()}
//           </>
//         );
//       default:
//         return null;
//     }
//   };

//   return (
//     <div className="app">
//       <header>
//         <h1>Legal Document Assistant</h1>
//         <p className="subtitle">
//           Summarization • Entity Extraction • Question Answering
//         </p>
//       </header>

//       <div className="layout">
//         <div className="left-panel">
//           <label className="label">
//             Input Text
//             <textarea
//               value={text}
//               onChange={(e) => setText(e.target.value)}
//               placeholder="Paste a legal/policy document or long text here..."
//               rows={16}
//             />
//           </label>
//         </div>

//         <div className="right-panel">
//           <div className="tabs">
//             {TABS.map((tab) => (
//               <button
//                 key={tab}
//                 className={`tab-btn ${
//                   activeTab === tab ? "tab-active" : ""
//                 }`}
//                 onClick={() => {
//                   resetOutputs();
//                   setActiveTab(tab);
//                 }}
//               >
//                 {tab}
//               </button>
//             ))}
//           </div>

//           <div className="tab-content">{renderTabContent()}</div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default App;


// frontend/src/App.jsx
import React, { useState } from "react";

const API_BASE = "http://localhost:8000"; // FastAPI backend

const TABS = ["Summary", "Entities", "QA", "Combined"];

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

  const renderOutputs = () => (
    <div className="outputs">
      {error && <div className="error">⚠ {error}</div>}

      {summary && (
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
              onClick={qaMode === "extractive" ? handleQA : handleQAGen}
              disabled={loading}
            >
              {loading
                ? qaMode === "extractive"
                  ? "Answering (extractive)..."
                  : "Answering (generative)..."
                : qaMode === "extractive"
                ? "Ask (Extractive QA)"
                : "Ask (Generative QA via Groq)"}
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
          <label className="label">
            Input Text
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste a legal/policy document or long text here..."
              rows={16}
            />
          </label>
        </div>

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
