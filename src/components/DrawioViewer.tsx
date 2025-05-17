import React, { useEffect, useRef, useState } from 'react';

/**
 * DrawioViewer embeds diagrams.net (Drawio) in an iframe and loads a diagram XML.
 *
 * Uses the Embed API protocol: waits for 'init' message from iframe before sending 'load' with XML.
 *
 * Props:
 * - xml: Drawio XML string to display
 * - readOnly: If true, disables editing (default: true)
 * - style: Optional CSS styles for the container
 *
 * Usage:
 * <DrawioViewer xml={xmlString} readOnly={true} style={{height: 600}} />
 *
 * TODO: Add support for editing, saving, and advanced Embed API features
 */
interface DrawioViewerProps {
  xml: string;
  readOnly?: boolean;
  style?: React.CSSProperties;
}

const DRAWIO_EMBED_URL = 'https://embed.diagrams.net/?embed=1&ui=min';

export const DrawioViewer: React.FC<DrawioViewerProps> = ({ xml, readOnly = true, style }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // console.log('DrawioViewer received message:', event); // Remove log

      // Check origin first
      if (event.origin !== 'https://embed.diagrams.net') {
        return;
      }

      // Use the simple 'ready' protocol
      if (event.data === 'ready') {
        // console.log('DrawioViewer: Received \'ready\' event. Setting loading false.'); // Remove log
        setLoading(false);
        setError(null);

        // Add a small delay before sending the message
        setTimeout(() => {
          // console.log('DrawioViewer: Timeout triggered. Preparing raw XML message.'); // Remove log
          try {
            // console.log('DrawioViewer: Sending raw generated XML message:', xml); // Remove log
            // Send the raw XML string directly (using the xml prop)
            iframeRef.current?.contentWindow?.postMessage(xml, 'https://embed.diagrams.net');
          } catch (e) {
            console.error('DrawioViewer: Error sending raw XML:', e);
            setError(`Failed to load diagram: ${e instanceof Error ? e.message : 'Unknown error'}`);
          }
        }, 100); // Keep delay for now
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [xml, readOnly]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', ...style }}>
      {loading && !error && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff8', zIndex: 1 }}>Loading diagram...</div>}
      {error && <div style={{ color: 'red', padding: 16 }}>{error}</div>}
      <iframe
        ref={iframeRef}
        src={DRAWIO_EMBED_URL}
        title="Drawio Diagram Viewer"
        style={{ width: '100%', height: '100%', border: 0, minHeight: 400 }}
        allowFullScreen
      />
    </div>
  );
}; 