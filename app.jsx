import React, { useState } from 'react';
import { BookOpen, Presentation, Network, Upload, Send, Sun, Moon, CheckCircle, Key, Loader2, ExternalLink, FileText, X, RefreshCw, ClipboardList, Copy, Download } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import GraphView from './GraphView';
import SlidesView from './SlidesView';


export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('view');
  const [apiKey, setApiKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [documents, setDocuments] = useState([]); // [{id, name, part, previewUrl, active}]
  const [messages, setMessages] = useState([{ role: 'bot', text: 'Upload one or more PDFs to begin.' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Which document is shown in the "View" tab, and which page to jump to
  const [previewDocId, setPreviewDocId] = useState(null);
  const [previewPage, setPreviewPage] = useState(null);

  // Knowledge graph state
  const [graphData, setGraphData] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState(null);

  // Slides state
  const [slidesData, setSlidesData] = useState(null);
  const [slidesLoading, setSlidesLoading] = useState(false);
  const [slidesError, setSlidesError] = useState(null);

  // Notes state
  const [notesData, setNotesData] = useState(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState(null);
  const [notesCopied, setNotesCopied] = useState(false);

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const processFile = async (file) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Only PDF files are supported');
    }
    const base64 = await fileToBase64(file);
    return {
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      part: { inlineData: { data: base64, mimeType: 'application/pdf' } },
      previewUrl: URL.createObjectURL(file),
      active: true,
    };
  };

  const ingestFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setProcessingFiles(true);
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        results.push(await processFile(file));
      } catch (err) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    if (results.length > 0) {
      setDocuments(prev => [...prev, ...results]);
      setActiveTab('view');
      setGraphData(null);
      setSlidesData(null);
      setNotesData(null);
      setPreviewDocId(prev => prev || results[0].id);
      const names = results.map(r => r.name).join(', ');
      setMessages(prev => [...prev, { role: 'bot', text: `Loaded: ${names}. Ask me anything — I'll cite the page.` }]);
    }
    if (errors.length > 0) {
      setMessages(prev => [...prev, { role: 'bot', text: `Couldn't process: ${errors.join('; ')}` }]);
    }
    setProcessingFiles(false);
  };

  const handleFileUpload = async (e) => {
    await ingestFiles(e.target.files);
    e.target.value = '';
  };

  // --- Drag and drop ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    await ingestFiles(e.dataTransfer.files);
  };

  const removeDocument = (id) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    setGraphData(null);
    setSlidesData(null);
    setNotesData(null);
    setPreviewDocId(prev => {
      if (prev !== id) return prev;
      const remaining = documents.filter(d => d.id !== id);
      return remaining.length > 0 ? remaining[0].id : null;
    });
  };

  const toggleDocumentActive = (id) => {
    const doc = documents.find(d => d.id === id);
    const willBeActive = doc ? !doc.active : true;
  
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, active: !d.active } : d));
  
    if (willBeActive) {
      // Just checked it — preview it immediately
      setPreviewDocId(id);
      setPreviewPage(null);
      setActiveTab('view');
    } else if (previewDocId === id) {
      // Just unchecked the doc currently being previewed — hand off to another active doc, if any
      const nextActive = documents.find(d => d.id !== id && d.active);
      setPreviewDocId(nextActive ? nextActive.id : null);
      setPreviewPage(null);
    }
  };

  const connectApi = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey.startsWith('AIza') && !trimmedKey.startsWith('AQ.')) {
      setIsConnected(false);
      setMessages(prev => [...prev, { role: 'bot', text: "Invalid API key format. Get a Gemini API key from Google AI Studio." }]);
      return;
    }

    setLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(trimmedKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      await model.generateContent("Hi");
      setApiKey(trimmedKey);
      setIsConnected(true);
      setMessages(prev => [...prev, { role: 'bot', text: "API key verified. You can ask questions now." }]);
    } catch (err) {
      setIsConnected(false);
      const msg = err.message.includes('401') || err.message.includes('ACCESS_TOKEN')
        ? "Authentication failed. Use a Gemini API key from https://aistudio.google.com/apikey."
        : "API Error: " + err.message;
      setMessages(prev => [...prev, { role: 'bot', text: msg }]);
    }
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !isConnected) {
      setMessages(prev => [...prev, { role: 'bot', text: "Please enter a valid API Key to continue." }]);
      return;
    }

    const activeDocs = documents.filter(d => d.active);

    const newMessages = [...messages, { role: 'user', text: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const trimmedKey = apiKey.trim();
      const genAI = new GoogleGenerativeAI(trimmedKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      let parts;
      if (activeDocs.length > 0) {
        const instructions = `You are answering questions using ONLY the attached PDF document(s) below.
Rules:
- Always cite the specific page number where you found the information, e.g. [document.pdf, p.3].
- If multiple documents are attached, make clear which document each fact comes from.
- If the answer isn't found in any document, say so explicitly rather than guessing.

Question: ${input}`;

        parts = [...activeDocs.map(d => d.part), instructions];
      } else if (documents.length > 0) {
        // Documents exist but none are toggled active
        setMessages([...newMessages, { role: 'bot', text: "No documents are currently active. Toggle at least one on in the sidebar, or I'll answer generally." }]);
        setLoading(false);
        return;
      } else {
        parts = [input];
      }

      const result = await model.generateContent(parts);
      setMessages([...newMessages, { role: 'bot', text: result.response.text() }]);
    } catch (err) {
      const msg = err.message.includes('401') || err.message.includes('ACCESS_TOKEN')
        ? "Authentication failed. Re-enter your Gemini API key and click the checkmark to verify."
        : "API Error: " + err.message;
      setMessages([...newMessages, { role: 'bot', text: msg }]);
      setIsConnected(false);
    }
    setLoading(false);
  };

  // Graph generation
  const generateGraph = async () => {
    const activeDocs = documents.filter(d => d.active);
    if (!isConnected) {
      setGraphError("Connect your API key first.");
      return;
    }
    if (activeDocs.length === 0) {
      setGraphError("Select at least one active document first.");
      return;
    }

    setGraphLoading(true);
    setGraphError(null);

    try {
      const trimmedKey = apiKey.trim();
      const genAI = new GoogleGenerativeAI(trimmedKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const instructions = `Analyze the attached PDF document(s) and extract the key topics and how they relate to each other, to build a knowledge graph.

Return ONLY valid JSON, with no markdown code fences and no commentary before or after, in exactly this shape:
{"nodes":[{"id":"1","label":"Topic Name"}],"edges":[{"source":"1","target":"2","label":"short relationship"}]}

Rules:
- Include 8 to 15 of the most important topics as nodes.
- Every edge's "source" and "target" must reference an existing node "id".
- Keep node labels short (2-5 words).
- Keep edge labels short (1-4 words), describing how the two topics relate.
- Do not include isolated nodes if you can connect them to something meaningful; a connected graph is preferred.`;

      const parts = [...activeDocs.map(d => d.part), instructions];
      const result = await model.generateContent(parts);
      let text = result.response.text().trim();
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');

      const parsed = JSON.parse(text);
      if (!parsed.nodes || !parsed.edges) {
        throw new Error("Response didn't contain the expected nodes/edges structure.");
      }
      setGraphData(parsed);
    } catch (err) {
      setGraphError("Couldn't generate graph: " + err.message);
    }
    setGraphLoading(false);
  };

  // Slides generation
  const generateSlides = async () => {
    const activeDocs = documents.filter(d => d.active);
    if (!isConnected) {
      setSlidesError("Connect your API key first.");
      return;
    }
    if (activeDocs.length === 0) {
      setSlidesError("Select at least one active document first.");
      return;
    }

    setSlidesLoading(true);
    setSlidesError(null);

    try {
      const trimmedKey = apiKey.trim();
      const genAI = new GoogleGenerativeAI(trimmedKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const instructions = `Analyze the attached PDF document(s) and create a slide presentation summarizing the key content.

Return ONLY valid JSON, with no markdown code fences and no commentary before or after, in exactly this shape:
{"title":"Overall Presentation Title","slides":[{"title":"Slide Title","bullets":["point 1","point 2","point 3"]}]}

Rules:
- Create 6 to 12 slides covering the document's main points in a logical order.
- Each slide should have 3 to 5 concise bullet points, in your own words.
- Keep slide titles short (3-8 words).
- Keep bullets short (under 15 words each).`;

      const parts = [...activeDocs.map(d => d.part), instructions];
      const result = await model.generateContent(parts);
      let text = result.response.text().trim();
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');

      const parsed = JSON.parse(text);
      if (!parsed.slides || parsed.slides.length === 0) {
        throw new Error("Response didn't contain any slides.");
      }
      setSlidesData(parsed);
    } catch (err) {
      setSlidesError("Couldn't generate slides: " + err.message);
    }
    setSlidesLoading(false);
  };

  // Notes generation
  const generateNotes = async () => {
    const activeDocs = documents.filter(d => d.active);
    if (!isConnected) {
      setNotesError("Connect your API key first.");
      return;
    }
    if (activeDocs.length === 0) {
      setNotesError("Select at least one active document first.");
      return;
    }

    setNotesLoading(true);
    setNotesError(null);

    try {
      const trimmedKey = apiKey.trim();
      const genAI = new GoogleGenerativeAI(trimmedKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const instructions = `Analyze the attached PDF document(s) and write clear, well-organized summary notes covering the key content, as a student or researcher would want for quick review.

Return ONLY valid JSON, with no markdown code fences and no commentary before or after, in exactly this shape:
{"title":"Summary Notes Title","sections":[{"heading":"Section Heading","points":["key point 1","key point 2"]}]}

Rules:
- Create 4 to 10 sections covering the document's main themes in a logical order.
- Each section should have 3 to 6 concise points, written in your own words, not copied verbatim.
- Keep section headings short (2-6 words).
- Keep each point to one clear idea, under 25 words.
- If multiple documents are attached, organize sections so it's clear which document they summarize.`;

      const parts = [...activeDocs.map(d => d.part), instructions];
      const result = await model.generateContent(parts);
      let text = result.response.text().trim();
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');

      const parsed = JSON.parse(text);
      if (!parsed.sections || parsed.sections.length === 0) {
        throw new Error("Response didn't contain any notes.");
      }
      setNotesData(parsed);
    } catch (err) {
      setNotesError("Couldn't generate notes: " + err.message);
    }
    setNotesLoading(false);
  };

  const notesToPlainText = () => {
    if (!notesData) return '';
    let text = `${notesData.title}\n${'='.repeat(notesData.title.length)}\n\n`;
    notesData.sections.forEach(s => {
      text += `${s.heading}\n${'-'.repeat(s.heading.length)}\n`;
      s.points.forEach(p => { text += `• ${p}\n`; });
      text += '\n';
    });
    return text;
  };

  const copyNotes = async () => {
    await navigator.clipboard.writeText(notesToPlainText());
    setNotesCopied(true);
    setTimeout(() => setNotesCopied(false), 2000);
  };

  const downloadNotes = () => {
    const blob = new Blob([notesToPlainText()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(notesData.title || 'notes').replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Citation parsing: turns [doc.pdf, p.3] into a clickable jump-to-page link ---
  const jumpToCitation = (docName, page) => {
    const match = documents.find(d => d.name.toLowerCase() === docName.trim().toLowerCase() && d.active);
    if (!match) return; // ignore if the doc isn't found or has been unchecked since the answer was given
    setPreviewDocId(match.id);
    setPreviewPage(Number(page));
    setActiveTab('view');
  };

  const renderBotText = (text) => {
    const citationRegex = /\[([^\[\]]+?\.pdf),\s*p\.?\s*(\d+)\]/gi;
    const parts = [];
    let lastIndex = 0;
    let match;
  
    while ((match = citationRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const docName = match[1];
      const page = match[2];
      parts.push(
        <button
          key={`${match.index}-${docName}-${page}`}
          onClick={() => jumpToCitation(docName, page)}
          className="text-blue-600 dark:text-blue-400 underline decoration-dotted hover:decoration-solid font-medium"
        >
          [{docName}, p.{page}]
        </button>
      );
      lastIndex = citationRegex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  };

  const previewDoc = documents.find(d => d.id === previewDocId && d.active) || documents.find(d => d.active);

  return (
    <div className={`${darkMode ? 'dark' : ''} h-screen flex flex-col`}>
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200 min-h-0">
        <header className="border-b dark:border-gray-700 p-4 flex items-center justify-between">
          <h1 className="font-bold text-xl">NoteAI</h1>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        <div
          className="flex flex-1 overflow-hidden min-h-0 relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 z-50 bg-blue-600/10 border-4 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
              <div className="bg-white dark:bg-gray-800 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
                <Upload size={24} className="text-blue-600" />
                <span className="font-medium">Drop PDF(s) to upload</span>
              </div>
            </div>
          )}

          <aside className="w-64 border-r dark:border-gray-700 p-4 overflow-y-auto">
            <label className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
              {processingFiles ? <Loader2 size={20} className="mb-2 animate-spin" /> : <Upload size={20} className="mb-2" />}
              <span className="text-sm font-medium">Upload PDFs</span>
              <span className="text-xs text-gray-400 mt-1">or drag &amp; drop anywhere</span>
              <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf" multiple />
            </label>

            {documents.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-gray-400 px-1">Active for questions:</p>
                {documents.map(d => (
  <div
    key={d.id}
    className={`flex items-center justify-between text-xs p-2 rounded ${
      d.id === previewDocId ? 'bg-blue-100 dark:bg-blue-900 ring-1 ring-blue-400' : 'bg-gray-100 dark:bg-gray-800'
    }`}
  >
    <input
      type="checkbox"
      checked={d.active}
      onChange={(e) => { e.stopPropagation(); toggleDocumentActive(d.id); }}
      className="shrink-0 mr-2"
    />
    <button
      onClick={() => { setPreviewDocId(d.id); setPreviewPage(null); setActiveTab('view'); }}
      className="flex items-center gap-1.5 truncate flex-1 text-left hover:underline"
      title="Click to preview this document"
    >
      <FileText size={14} className="shrink-0" />
      <span className="truncate">{d.name}</span>
    </button>
    <button onClick={() => removeDocument(d.id)} className="text-gray-400 hover:text-red-500 shrink-0 ml-1">
      <X size={14} />
    </button>
  </div>
))}
              </div>
            )}
          </aside>

          <main className="flex-1 p-4 flex flex-col">
            <nav className="flex gap-4 mb-4">
              {[ {id: 'view', label: 'View', icon: BookOpen}, {id: 'notes', label: 'Notes', icon: ClipboardList}, {id: 'graph', label: 'Graph', icon: Network}, {id: 'slides', label: 'Presentation', icon: Presentation} ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-4 py-2 ${activeTab === t.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800'} rounded-lg transition-colors`}>
                  <t.icon size={18} /> {t.label}
                </button>
              ))}
            </nav>
            <section className="flex-1 border dark:border-gray-700 rounded-lg overflow-hidden bg-white relative">
              {activeTab === 'view' && previewDoc && (
                <div className="h-full flex flex-col">
                  <div className="p-2 border-b flex justify-between items-center gap-2">
                    {documents.length > 1 ? (
                      <select
                        value={previewDoc.id}
                        onChange={(e) => { setPreviewDocId(e.target.value); setPreviewPage(null); }}
                        className="text-sm border rounded px-2 py-1 bg-white"
                      >
                        {documents.filter(d => d.active).map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-500 truncate">{previewDoc.name}</span>
                    )}
                    <a href={previewDoc.previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline shrink-0">
                      <ExternalLink size={16} /> Open in New Tab
                    </a>
                  </div>
                  <iframe
                    key={`${previewDoc.id}-${previewPage || 'top'}`}
                    src={previewPage ? `${previewDoc.previewUrl}#page=${previewPage}` : previewDoc.previewUrl}
                    className="w-full flex-1"
                    title="PDF Viewer"
                  />
                </div>
              )}

{activeTab === 'view' && !previewDoc && (
  <div className="h-full flex flex-col items-center justify-center text-gray-400">
    <BookOpen size={48} className="mb-2 opacity-50" />
    <p>{documents.length > 0 ? 'Check a document in the sidebar to preview it.' : 'Upload a PDF to view content here.'}</p>
  </div>
)}

              {activeTab === 'notes' && (
                <div className="h-full flex flex-col">
                  {!notesData && (
                    <div className="p-2 border-b flex justify-between items-center">
                      <span className="text-sm text-gray-500">No notes generated yet</span>
                      <button
                        onClick={generateNotes}
                        disabled={notesLoading || documents.length === 0}
                        className="flex items-center gap-2 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {notesLoading ? <Loader2 size={14} className="animate-spin" /> : <ClipboardList size={14} />}
                        Generate Notes
                      </button>
                    </div>
                  )}
                  {notesData && (
                    <div className="p-2 border-b flex justify-between items-center">
                      <span className="text-sm text-gray-500 truncate">{notesData.title}</span>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={copyNotes} className="flex items-center gap-1.5 text-sm bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
                          <Copy size={14} /> {notesCopied ? 'Copied!' : 'Copy'}
                        </button>
                        <button onClick={downloadNotes} className="flex items-center gap-1.5 text-sm bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
                          <Download size={14} /> Download
                        </button>
                        <button onClick={generateNotes} disabled={notesLoading} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                          {notesLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Regenerate
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto p-6">
                    {notesLoading && (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                        <Loader2 size={32} className="animate-spin" />
                        <p className="text-sm">Reading document and writing notes...</p>
                      </div>
                    )}
                    {!notesLoading && notesError && (
                      <div className="h-full flex items-center justify-center text-center text-red-500 text-sm max-w-sm mx-auto">{notesError}</div>
                    )}
                    {!notesLoading && !notesError && !notesData && documents.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                        <ClipboardList size={48} className="opacity-50" />
                        <p className="text-sm">Upload a PDF, then click "Generate Notes."</p>
                      </div>
                    )}
                    {!notesLoading && !notesError && !notesData && documents.length > 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                        <ClipboardList size={48} className="opacity-50" />
                        <p className="text-sm">Click "Generate Notes" to summarize this document.</p>
                      </div>
                    )}
                    {!notesLoading && notesData && (
                      <div className="max-w-2xl mx-auto space-y-6">
                        <h2 className="text-2xl font-bold text-gray-800">{notesData.title}</h2>
                        {notesData.sections.map((s, i) => (
                          <div key={i}>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">{s.heading}</h3>
                            <ul className="space-y-1.5">
                              {s.points.map((p, j) => (
                                <li key={j} className="flex gap-2 text-gray-700 text-sm">
                                  <span className="text-blue-600 mt-0.5">•</span><span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'graph' && (
                <div className="h-full flex flex-col">
                  <div className="p-2 border-b flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      {graphData ? `${graphData.nodes.length} topics` : 'No graph generated yet'}
                    </span>
                    <button
                      onClick={generateGraph}
                      disabled={graphLoading || documents.length === 0}
                      className="flex items-center gap-2 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {graphLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      {graphData ? 'Regenerate' : 'Generate Graph'}
                    </button>
                  </div>
                  <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                    {graphLoading && (
                      <div className="flex flex-col items-center text-gray-400 gap-2">
                        <Loader2 size={32} className="animate-spin" />
                        <p className="text-sm">Analyzing document and building graph...</p>
                      </div>
                    )}
                    {!graphLoading && graphError && (
                      <div className="text-center text-red-500 text-sm max-w-sm">{graphError}</div>
                    )}
                    {!graphLoading && !graphError && !graphData && documents.length === 0 && (
                      <div className="flex flex-col items-center text-gray-400 gap-2">
                        <Network size={48} className="opacity-50" />
                        <p className="text-sm">Upload a PDF, then click "Generate Graph."</p>
                      </div>
                    )}
                    {!graphLoading && !graphError && !graphData && documents.length > 0 && (
                      <div className="flex flex-col items-center text-gray-400 gap-2">
                        <Network size={48} className="opacity-50" />
                        <p className="text-sm">Click "Generate Graph" to visualize the topics in this document.</p>
                      </div>
                    )}
                    {!graphLoading && graphData && <GraphView data={graphData} />}
                  </div>
                </div>
              )}

              {activeTab === 'slides' && (
                <div className="h-full flex flex-col">
                  {!slidesData && (
                    <div className="p-2 border-b flex justify-between items-center">
                      <span className="text-sm text-gray-500">No presentation generated yet</span>
                      <button
                        onClick={generateSlides}
                        disabled={slidesLoading || documents.length === 0}
                        className="flex items-center gap-2 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {slidesLoading ? <Loader2 size={14} className="animate-spin" /> : <Presentation size={14} />}
                        Generate Presentation
                      </button>
                    </div>
                  )}
                  <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                    {slidesLoading && (
                      <div className="flex flex-col items-center text-gray-400 gap-2">
                        <Loader2 size={32} className="animate-spin" />
                        <p className="text-sm">Reading document and drafting slides...</p>
                      </div>
                    )}
                    {!slidesLoading && slidesError && (
                      <div className="text-center text-red-500 text-sm max-w-sm">{slidesError}</div>
                    )}
                    {!slidesLoading && !slidesError && !slidesData && documents.length === 0 && (
                      <div className="flex flex-col items-center text-gray-400 gap-2">
                        <Presentation size={48} className="opacity-50" />
                        <p className="text-sm">Upload a PDF, then click "Generate Presentation."</p>
                      </div>
                    )}
                    {!slidesLoading && !slidesError && !slidesData && documents.length > 0 && (
                      <div className="flex flex-col items-center text-gray-400 gap-2">
                        <Presentation size={48} className="opacity-50" />
                        <p className="text-sm">Click "Generate Presentation" to summarize this document as slides.</p>
                      </div>
                    )}
                    {!slidesLoading && slidesData && <SlidesView data={slidesData} />}
                  </div>
                </div>
              )}
            </section>
          </main>

          <aside className="w-80 border-l dark:border-gray-700 p-4 flex flex-col bg-gray-50 dark:bg-gray-900 min-h-0">
            <div className="flex items-center gap-2 mb-4 bg-white dark:bg-gray-800 p-2 rounded-lg border dark:border-gray-700 shadow-sm">
              <Key size={16} className="text-gray-400" />
              <input
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setIsConnected(false); }}
                type="password"
                placeholder="Gemini API Key"
                className="bg-transparent outline-none flex-1 text-sm"
              />
              <button onClick={connectApi} className={isConnected ? 'text-green-500' : 'text-gray-400'}><CheckCircle size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 min-h-0">
              {messages.map((m, i) => (
                <div key={i} className={`p-3 rounded-lg text-sm whitespace-pre-wrap break-words ${m.role === 'user' ? 'bg-blue-100 dark:bg-blue-900 ml-8' : 'bg-white dark:bg-gray-700 border dark:border-gray-600 mr-8'}`}>
                  {m.role === 'bot' ? renderBotText(m.text) : m.text}
                </div>
              ))}
              {loading && <Loader2 className="animate-spin mx-auto text-blue-500" />}
            </div>

            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 p-2 rounded-lg border dark:border-gray-700 dark:bg-gray-800 text-sm" placeholder="Ask a question..." />
              <button onClick={handleSendMessage} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"><Send size={18} /></button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}