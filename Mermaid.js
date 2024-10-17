import React, { useEffect } from 'react';
import mermaid from 'mermaid';

const MermaidDiagram = () => {
  useEffect(() => {
    mermaid.initialize({ startOnLoad: true });
  }, []);

  const mermaidCode = `
    graph TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[fa:fa-car Car]
  `;

  return (
    <div>
      <h2>Flowchart Diagram</h2>
      <div className="mermaid">
        {mermaidCode}
      </div>
    </div>
  );
};

export default MermaidDiagram;
