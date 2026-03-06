import { useEffect, useRef } from 'react';
import './CodeViewer.css';

interface CodeViewerProps {
    code: string;
    activeLine: number;
}

export function CodeViewer({ code, activeLine }: CodeViewerProps) {
    const lines = code.split('\n');
    const containerRef = useRef<HTMLDivElement>(null);
    const activeLineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeLineRef.current && containerRef.current) {
            const container = containerRef.current;
            const activeEl = activeLineRef.current;
            const containerHalfHeight = container.clientHeight / 2;
            container.scrollTo({
                top: activeEl.offsetTop - containerHalfHeight,
                behavior: 'smooth'
            });
        }
    }, [activeLine]);

    if (!code) {
        return <div className="code-viewer-empty">Waiting for source code...</div>;
    }

    return (
        <div className="code-viewer" ref={containerRef}>
            <div className="code-lines">
                {lines.map((lineContent, idx) => {
                    const lineNum = idx + 1;
                    const isActive = lineNum === activeLine;
                    return (
                        <div
                            key={lineNum}
                            className={`code-line ${isActive ? 'active-line' : ''}`}
                            ref={isActive ? activeLineRef : null}
                        >
                            <span className="line-number">{lineNum}</span>
                            <span className="line-content">{lineContent || ' '}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
