# NoteAI

NoteAI is a document intelligence app for PDFs. Upload one or more PDFs and it lets you chat with them, generate summary notes, build an interactive knowledge graph of the key topics, and turn the content into a downloadable slide presentation — all powered by the Gemini API.

## Features

- **Chat with your PDFs** — ask questions and get answers grounded only in the documents you upload, with clickable page citations (`[document.pdf, p.3]`) that jump the viewer straight to that page.
- **Multi-document support** — upload several PDFs, and toggle which ones are "active" for a given question, graph, notes, or presentation.
- **Drag-and-drop upload** — drop PDFs anywhere in the app window, or use the file picker.
- **Summary notes** — generates organized, sectioned notes from the document(s), with copy-to-clipboard and download-as-`.txt` options.
- **Knowledge graph** — extracts key topics and their relationships into an interactive, force-directed graph. Drag nodes around and zoom/pan with the mouse or trackpad.
- **Slide presentations** — turns the document into a slide-by-slide summary you can click through in-app, and export as a real, editable `.pptx` file.
- **Dark mode** toggle.

## Tech stack

- **React** (Vite)
- **Tailwind CSS** for styling
- **Google Gemini API** (`@google/generative-ai`) for chat, notes, graph, and slide generation
- **d3** (`d3-force`, `d3-drag`, `d3-zoom`) for the interactive knowledge graph
- **pptxgenjs** for exporting presentations as `.pptx`

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/DocAI-app.git
cd DocAI-app
npm install
```

### 2. Run locally

```bash
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

### 3. Add your Gemini API key

NoteAI doesn't ship with a built-in API key — each user supplies their own at runtime, entered directly into the app's UI (top of the right-hand chat panel). Nothing is stored on a server; the key lives only in your browser session.

To get a free Gemini API key:

1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Sign in with a Google account.
3. Click **Create API key**.
4. Paste it into NoteAI's API key field and click the checkmark to verify.

> **Note:** keep your API key private. Don't commit it to source control or share screenshots that include it.

## Usage

1. Upload one or more PDFs (drag-and-drop or the upload button).
2. Check the box next to a document to make it active — this both previews it and includes it when you ask questions, generate notes, build a graph, or create a presentation.
3. Use the tabs (**View**, **Notes**, **Graph**, **Presentation**) to switch between the PDF viewer, generated notes, the topic graph, and the slide deck.
4. Ask questions in the chat panel on the right — answers cite the source page, and clicking a citation jumps the viewer to that page.

## Deployment

This project can be deployed as a static site (e.g. GitHub Pages), since the API key is supplied by each user in the browser rather than baked into the build.

```bash
npm install --save-dev gh-pages
npm run deploy
```

Make sure `vite.config.js` has a `base` path matching your repository name, e.g.:

```js
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/DocAI-app/',
})
```

## Known limitations

- Only PDF files are supported (no Word docs, plain text, etc.).
- Page-jump citations rely on the browser's native PDF renderer respecting `#page=N` in the URL — this is reliable in most Chromium-based browsers but can vary slightly elsewhere.
- Very large or scanned/image-only PDFs may produce less accurate answers, since citation accuracy depends on the model reading a real text layer.
- Free-tier Gemini API usage is subject to Google's rate limits and quota policies, which can change — check [Google's documentation](https://ai.google.dev/gemini-api/docs/rate-limits) if you hit errors.

## License

