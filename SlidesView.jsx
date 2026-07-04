import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import pptxgen from 'pptxgenjs';

export default function SlidesView({ data }) {
  const [current, setCurrent] = useState(0);

  if (!data || !data.slides || data.slides.length === 0) return null;

  const slide = data.slides[current];
  const total = data.slides.length;

  const goPrev = () => setCurrent(c => Math.max(0, c - 1));
  const goNext = () => setCurrent(c => Math.min(total - 1, c + 1));

  const downloadPptx = () => {
    const pptx = new pptxgen();

    // Title slide
    const titleSlide = pptx.addSlide();
    titleSlide.addText(data.title || 'Presentation', {
      x: 0.5, y: 2.2, w: 9, h: 1.5,
      fontSize: 36, bold: true, align: 'center', color: '1E293B',
    });

    data.slides.forEach(s => {
      const pptxSlide = pptx.addSlide();
      pptxSlide.addText(s.title, {
        x: 0.5, y: 0.4, w: 9, h: 0.8,
        fontSize: 26, bold: true, color: '1E293B',
      });
      pptxSlide.addText(
        (s.bullets || []).map(b => ({ text: b, options: { bullet: true, breakLine: true } })),
        { x: 0.5, y: 1.4, w: 9, h: 4.5, fontSize: 18, color: '334155' }
      );
    });

    pptx.writeFile({ fileName: `${(data.title || 'presentation').replace(/\s+/g, '_')}.pptx` });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b flex justify-between items-center">
        <span className="text-sm text-gray-500">{data.title} — Slide {current + 1} of {total}</span>
        <button
          onClick={downloadPptx}
          className="flex items-center gap-2 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          <Download size={14} /> Download .pptx
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center gap-4 p-6">
        <button onClick={goPrev} disabled={current === 0} className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30">
          <ChevronLeft size={24} />
        </button>

        <div className="w-full max-w-2xl aspect-video bg-white border rounded-xl shadow-sm p-8 flex flex-col">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">{slide.title}</h2>
          <ul className="space-y-2 text-gray-700">
            {(slide.bullets || []).map((b, i) => (
              <li key={i} className="flex gap-2">
                <span>•</span><span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <button onClick={goNext} disabled={current === total - 1} className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30">
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="flex justify-center gap-1.5 pb-4">
        {data.slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full ${i === current ? 'bg-blue-600' : 'bg-gray-300'}`}
          />
        ))}
      </div>
    </div>
  );
}