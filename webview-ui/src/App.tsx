import { useState, useEffect, useCallback } from 'react';
import { ReactFlow, Controls, Background, MarkerType, Position, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import { vscode } from './utilities/vscode';
import './App.css';

const NODE_W = 200;
const NODE_H = 100;

// Fresh dagre graph every call — never reuse a singleton
function layout(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 120, nodesep: 60 });
  nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach(e => { try { g.setEdge(e.source, e.target); } catch { /* skip */ } });
  dagre.layout(g);
  return {
    nodes: nodes.map(n => {
      const p = g.node(n.id);
      if (!p) return n;
      return { ...n, position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 }, targetPosition: Position.Left, sourcePosition: Position.Right };
    }),
    edges,
  };
}

type Frame = { nodes: Node[]; edges: Edge[]; activeLine: number };

function AppInner() {
  const { fitView } = useReactFlow();
  const [frame, setFrame] = useState<Frame>({ nodes: [], edges: [], activeLine: 0 });
  const [steps, setSteps] = useState(0);
  const [fileName, setFileName] = useState('');
  const isLive = steps > 0;

  useEffect(() => { vscode.postMessage({ command: 'ready' }); }, []);

  // Refit whenever nodes update
  useEffect(() => {
    if (frame.nodes.length > 0) requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }));
  }, [frame.nodes, fitView]);

  const handleMessage = useCallback((ev: MessageEvent) => {
    const msg = ev.data;
    if (msg.type === 'live_start') {
      setFrame({ nodes: [], edges: [], activeLine: 0 });
      setSteps(0); setFileName(msg.fileName || ''); return;
    }
    if (msg.type !== 'live_event') return;

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Variable boxes (head, curr, etc.)
    (msg.stack || []).forEach((sv: any) => {
      if (!sv.isPointer || !sv.pointsTo) return;
      const varId = `var-${sv.name}`;
      nodes.push({ id: varId, position: { x: 0, y: 0 }, data: { label: sv.name }, style: { border: '2px solid #ef4444', borderRadius: '4px', padding: '5px 10px', backgroundColor: '#fef2f2', fontWeight: 'bold', color: '#1e293b', fontSize: '13px' } });
      const tid = String(sv.pointsTo).replace('node_', '');
      edges.push({ id: `e-${varId}`, source: varId, target: tid, label: 'ref', style: { stroke: '#ef4444', strokeWidth: 2 }, labelStyle: { fill: '#000', fontWeight: 700, fontSize: '12px' }, labelBgStyle: { fill: '#fff', fillOpacity: 0.9 }, labelBgPadding: [6, 4] as [number, number], labelBgBorderRadius: 4, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } });
    });

    // Heap nodes
    (msg.heap || []).forEach((hn: any) => {
      const id = String(hn.id).replace('node_', '');
      const fields = hn.fields || [];
      const label = JSON.stringify(Object.fromEntries(fields.map((f: any) => [f.key, f.value])), null, 2);
      nodes.push({ id, position: { x: 0, y: 0 }, data: { label }, style: { border: '2px solid #3b82f6', borderRadius: '8px', padding: '10px', backgroundColor: '#eff6ff', minWidth: '120px', color: '#1e293b', fontSize: '12px', fontWeight: 500, whiteSpace: 'pre-wrap' }, sourcePosition: Position.Right, targetPosition: Position.Left });
      if (hn.next) {
        const did = String(hn.next).replace('node_', '');
        edges.push({ id: `e-${id}-next`, source: id, target: did, label: 'next', animated: true, style: { stroke: '#334155', strokeWidth: 2 }, labelStyle: { fill: '#000', fontWeight: 700, fontSize: '12px' }, labelBgStyle: { fill: '#fff', fillOpacity: 0.9 }, labelBgPadding: [6, 4] as [number, number], labelBgBorderRadius: 4, markerEnd: { type: MarkerType.ArrowClosed, color: '#334155' } });
      }
    });

    const L = layout(nodes, edges);
    setFrame({ nodes: L.nodes, edges: L.edges, activeLine: msg.line || 0 });

    setSteps(s => s + 1);
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  const btn: React.CSSProperties = { padding: '6px 14px', border: '1px solid #475569', borderRadius: '6px', background: 'linear-gradient(180deg,#334155,#1e293b)', color: '#e2e8f0', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s', userSelect: 'none' };
  const btnOff: React.CSSProperties = { ...btn, opacity: 0.35, cursor: 'default' };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      {/* Top bar */}
      <div style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#0f172a,#1e293b)', color: 'white', display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '2px solid #334155', fontSize: '13px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: isLive ? '#22c55e' : '#64748b', boxShadow: isLive ? '0 0 8px #22c55e' : 'none', animation: isLive ? 'cpulse 1.5s ease-in-out infinite' : 'none' }} />
          <span style={{ fontWeight: 700, color: isLive ? '#4ade80' : '#94a3b8' }}>{isLive ? 'LIVE' : 'IDLE'}</span>
        </div>
        <div style={{ color: '#94a3b8', borderLeft: '1px solid #334155', paddingLeft: '16px' }}>Step: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{steps}</span></div>
        {frame.activeLine > 0 && <div style={{ color: '#94a3b8', borderLeft: '1px solid #334155', paddingLeft: '16px' }}>Line: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{frame.activeLine}</span></div>}
        {fileName && <div style={{ color: '#94a3b8', borderLeft: '1px solid #334155', paddingLeft: '16px', fontSize: '11px' }}>📄 {fileName}</div>}
        <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: '11px' }}>C Pulse Visualizer</div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {frame.nodes.length === 0 ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: '#94a3b8', backgroundColor: '#f8fafc' }}>
            <div style={{ width: 48, height: 48, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'cspin 1s linear infinite' }} />
            <div style={{ fontSize: '15px', fontWeight: 500 }}>Waiting for execution events...</div>
            <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Open a .c file → C-Pulse: Start Visualizer</div>
          </div>
        ) : (
          <ReactFlow nodes={frame.nodes} edges={frame.edges} fitView style={{ backgroundColor: '#f8fafc' }}>
            <Background />
            <Controls />
          </ReactFlow>
        )}
      </div>

      {/* Bottom nav */}
      {isLive && (
        <div style={{ padding: '8px 20px', background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderTop: '2px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexShrink: 0 }}>
          <button style={btnOff} disabled>◀ Prev</button>
          <div style={{ padding: '6px 16px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#94a3b8', fontSize: '12px', fontWeight: 500, minWidth: '90px', textAlign: 'center' }}>
            <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{steps}</span>
          </div>
          <button style={btn} onClick={() => fitView({ padding: 0.2, duration: 400 })}>⟳ Fit</button>
        </div>
      )}

      <style>{`
        @keyframes cpulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes cspin { to{transform:rotate(360deg)} }
        button:hover:not(:disabled){filter:brightness(1.2)}
        button:active:not(:disabled){transform:scale(0.96)}
      `}</style>
    </div>
  );
}

export default function App() {
  return <ReactFlowProvider><AppInner /></ReactFlowProvider>;
}
