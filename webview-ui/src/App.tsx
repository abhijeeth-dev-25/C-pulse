import { useState, useEffect, useCallback } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { GraphCanvas } from './components/GraphCanvas';
import { ControlBar } from './components/ControlBar';
import { InspectorPanel } from './components/InspectorPanel';
import { CodeViewer } from './components/CodeViewer';
import { vscode } from './utilities/vscode';
import type { Snapshot } from './types';
import './App.css';

export default function App() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [fileName, setFileName] = useState('');
  const [sourceCode, setSourceCode] = useState('');
  const [isReplaying, setIsReplaying] = useState(false);
  const [bugEndStep, setBugEndStep] = useState<number | null>(null);
  const [focusGraph, setFocusGraph] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  const handleMessage = useCallback((event: MessageEvent) => {
    const msg = event.data;
    if (msg.type === 'live_start') {
      setSnapshots([]);
      setCurrentIndex(-1);
      setFileName(msg.fileName || '');
      setSourceCode(msg.code || '');
      setIsReplaying(false);
      setBugEndStep(null);
    } else if (msg.type === 'live_event') {
      const snap: Snapshot = {
        step: msg.step,
        line: msg.line,
        description: msg.description,
        heap: msg.heap || [],
        stack: msg.stack || []
      };
      setSnapshots(prev => {
        const next = [...prev, snap];
        // Auto scroll to latest
        setCurrentIndex(next.length - 1);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    vscode.postMessage({ command: 'ready' });
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    let timer: any;
    if (isReplaying && bugEndStep !== null && currentIndex < bugEndStep) {
      timer = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 1200);
    } else if (isReplaying && currentIndex >= (bugEndStep || 0)) {
      setIsReplaying(false);
    }
    return () => clearTimeout(timer);
  }, [isReplaying, currentIndex, bugEndStep]);

  const handlePrev = useCallback(() => { setIsReplaying(false); setCurrentIndex(i => Math.max(0, i - 1)); }, []);
  const handleNext = useCallback(() => { setIsReplaying(false); setCurrentIndex(i => Math.min(snapshots.length - 1, i + 1)); }, [snapshots.length]);
  const handleLatest = useCallback(() => { setIsReplaying(false); setCurrentIndex(snapshots.length - 1); }, [snapshots.length]);
  const handleSeek = useCallback((index: number) => { setIsReplaying(false); setCurrentIndex(index); }, []);
  const handleLoad = useCallback(() => vscode.postMessage({ command: 'load_file' }), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeDiv = document.activeElement;
      if (activeDiv?.tagName === 'INPUT' || activeDiv?.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsReplaying(prev => !prev);
      } else if (e.key === 'Home') {
        handleSeek(0);
      } else if (e.key === 'End') {
        handleLatest();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleSeek, handleLatest]);

  const handleReplayBug = (bugIndex: number) => {
    setBugEndStep(bugIndex);
    setCurrentIndex(Math.max(0, bugIndex - 5));
    setIsReplaying(true);
  };

  const currentSnap = currentIndex >= 0 ? snapshots[currentIndex] : null;

  return (
    <div className="app" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <ControlBar
        fileName={fileName}
        currentStep={currentIndex + 1}
        totalSteps={snapshots.length}
        currentLine={currentSnap?.line || 0}
        description={currentSnap?.description || ''}
        isLive={snapshots.length > 0 && currentIndex === snapshots.length - 1}
        snapshots={snapshots}
        currentIndex={currentIndex}
        isReplaying={isReplaying}
        onReplayBug={handleReplayBug}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeek={handleSeek}
        onLatest={handleLatest}
        onLoadFile={handleLoad}
        focusGraph={focusGraph}
        onToggleFocus={() => setFocusGraph(prev => !prev)}
      />

      <div className="workspace-area" style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <PanelGroup orientation="vertical">
          <Panel defaultSize={95} minSize={50}>
            {focusGraph ? (
              <GraphCanvas snapshot={currentSnap} snapshots={snapshots} currentIndex={currentIndex} />
            ) : (
              <PanelGroup orientation="horizontal">
                <Panel defaultSize={25} minSize={15} style={{ borderRight: '1px solid #1c3a52', display: 'flex', flexDirection: 'column' }}>
                  <CodeViewer code={sourceCode} activeLine={currentSnap?.line || 0} />
                </Panel>
                <PanelResizeHandle style={{ width: '4px', background: '#1c3a52', cursor: 'col-resize', transition: 'background 0.2s' }} />
                <Panel defaultSize={50} minSize={30} style={{ position: 'relative' }}>
                  <GraphCanvas snapshot={currentSnap} snapshots={snapshots} currentIndex={currentIndex} />
                </Panel>
                <PanelResizeHandle style={{ width: '4px', background: '#1c3a52', cursor: 'col-resize', transition: 'background 0.2s' }} />
                <Panel defaultSize={25} minSize={15} style={{ borderLeft: '1px solid #1c3a52', display: 'flex', flexDirection: 'column' }}>
                  <InspectorPanel snapshot={currentSnap} snapshots={snapshots} currentIndex={currentIndex} />
                </Panel>
              </PanelGroup>
            )}
          </Panel>
          <PanelResizeHandle style={{ height: '4px', background: '#1c3a52', cursor: 'row-resize', display: isTerminalOpen ? 'block' : 'none' }} />
          <Panel
            defaultSize={isTerminalOpen ? 25 : 5}
            minSize={5}
            maxSize={isTerminalOpen ? 50 : 5}
            collapsible
            style={{ borderTop: '1px solid #1c3a52', display: 'flex', flexDirection: 'column' }}
          >
            <div
              style={{ padding: '4px 12px', background: '#0d1b2a', cursor: 'pointer', fontSize: '11px', color: '#90caf9', userSelect: 'none', borderBottom: isTerminalOpen ? '1px solid #1c3a52' : 'none' }}
              onClick={() => setIsTerminalOpen(prev => !prev)}
            >
              {isTerminalOpen ? '▼ Terminal (Standard Output)' : '▶ Terminal (Standard Output)'}
            </div>
            {isTerminalOpen && (
              <div style={{ flex: 1, backgroundColor: '#000', padding: '10px', color: '#e0e0e0', fontFamily: 'monospace', fontSize: '12px', overflowY: 'auto' }}>
                <span style={{ color: '#546e7a' }}>No program output yet. Standard I/O streams will appear here...</span>
              </div>
            )}
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
