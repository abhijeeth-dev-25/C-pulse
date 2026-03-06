import { useState, useEffect, useRef, type ReactElement } from 'react';
import type { Snapshot, HeapNode } from '../types';
import './GraphCanvas.css';

interface GraphCanvasProps {
    snapshot: Snapshot | null;
    snapshots?: Snapshot[];
    currentIndex?: number;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 90;
const NODE_GAP_X = 100;
const NODE_GAP_Y = 140;
const CANVAS_PADDING = 60;
const VAR_BOX_WIDTH = 90;
const VAR_BOX_HEIGHT = 40;

interface LayoutNode {
    id: string;
    x: number;
    y: number;
    node: HeapNode;
}

type StructureType = 'Linked List' | 'Doubly Linked List' | 'Binary Tree' | 'Generic / Unknown';

function detectStructure(heap: HeapNode[]): StructureType {
    if (heap.length === 0) return 'Generic / Unknown';

    const hasLeftRight = heap.some(n => n.left !== null || n.right !== null || n.fields.some(f => f.key === 'left' || f.key === 'right'));
    if (hasLeftRight) return 'Binary Tree';

    const hasPrev = heap.some(n => n.fields.some(f => f.key === 'prev'));
    const hasNext = heap.some(n => n.next !== null || n.fields.some(f => f.key === 'next'));

    if (hasNext && hasPrev) return 'Doubly Linked List';
    if (hasNext) return 'Linked List';

    return 'Generic / Unknown';
}

function layoutNodes(heap: HeapNode[], stackOffset: number): { placed: LayoutNode[], type: StructureType } {
    const placed: LayoutNode[] = [];
    const visited = new Set<string>();
    const pointedTo = new Set(heap.flatMap(n => [n.next, n.left, n.right].filter(Boolean) as string[]));
    const roots = heap.filter(n => !pointedTo.has(n.id));

    function place(node: HeapNode, row: number, depth: number) {
        if (visited.has(node.id)) return;
        visited.add(node.id);
        const x = stackOffset + CANVAS_PADDING + depth * (NODE_WIDTH + NODE_GAP_X);
        const y = CANVAS_PADDING + row * (NODE_HEIGHT + NODE_GAP_Y);
        placed.push({ id: node.id, x, y, node });
        if (node.next) { const c = heap.find(n => n.id === node.next); if (c) place(c, row, depth + 1); }
        if (node.left) { const c = heap.find(n => n.id === node.left); if (c) place(c, row + 1, depth + 1); }
        if (node.right) { const c = heap.find(n => n.id === node.right); if (c) place(c, row + 2, depth + 1); }
    }

    roots.forEach((root, i) => place(root, i, 0));
    heap.forEach(n => { if (!visited.has(n.id)) place(n, placed.length, 0); });

    return { placed, type: detectStructure(heap) };
}

export function GraphCanvas({ snapshot, snapshots = [], currentIndex = -1 }: GraphCanvasProps) {
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [hoverNode, setHoverNode] = useState<HeapNode | null>(null);
    const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
    const graphContainerRef = useRef<HTMLDivElement>(null);
    const prevSnapshotRef = useRef<Snapshot | null>(null);
    const [changedPointers, setChangedPointers] = useState<Set<string>>(new Set());

    const handleResetView = () => {
        if (!snapshot || snapshot.heap.length === 0 || !graphContainerRef.current) {
            setTransform({ x: 0, y: 0, scale: 1 });
            return;
        }
        const STACK_WIDTH = 300;
        const { placed } = layoutNodes(snapshot.heap, STACK_WIDTH);

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        placed.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x + NODE_WIDTH);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y + NODE_HEIGHT);
        });
        snapshot.stack.forEach((_, i) => {
            const bx = CANVAS_PADDING - 20;
            const by = CANVAS_PADDING + i * (VAR_BOX_HEIGHT + 50);
            minX = Math.min(minX, bx);
            maxX = Math.max(maxX, bx + VAR_BOX_WIDTH);
            minY = Math.min(minY, by);
            maxY = Math.max(maxY, by + VAR_BOX_HEIGHT);
        });

        if (minX === Infinity) {
            setTransform({ x: 0, y: 0, scale: 1 });
            return;
        }

        minX -= 50; maxX += 50; minY -= 50; maxY += 50;

        const cw = graphContainerRef.current.clientWidth;
        const ch = graphContainerRef.current.clientHeight;

        const scaleX = cw / (maxX - minX);
        const scaleY = ch / (maxY - minY);
        const newScale = Math.min(scaleX, scaleY, 1.2);

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        setTransform({
            x: cw / 2 - cx * newScale,
            y: ch / 2 - cy * newScale,
            scale: newScale
        });
    };

    useEffect(() => {
        if (snapshot?.heap.length === 1 && prevSnapshotRef.current?.heap.length === 0) {
            handleResetView();
        }
        // Also auto center on first ever load
        if (snapshot && !prevSnapshotRef.current) {
            handleResetView();
        }
    }, [snapshot]);

    useEffect(() => {
        if (snapshot && prevSnapshotRef.current) {
            const newChanges = new Set<string>();

            // Check stack pointers
            snapshot.stack.filter(s => s.isPointer).forEach(sv => {
                const prev = prevSnapshotRef.current!.stack.find(p => p.name === sv.name);
                if (prev && prev.pointsTo !== sv.pointsTo && sv.pointsTo !== null) {
                    newChanges.add(`stack-${sv.name}-${sv.pointsTo}`);
                }
            });

            // Check heap pointers (next, left, right)
            snapshot.heap.forEach(node => {
                const prevNode = prevSnapshotRef.current!.heap.find(n => n.id === node.id);
                if (prevNode) {
                    if (prevNode.next !== node.next && node.next) newChanges.add(`heap-${node.id}-next-${node.next}`);
                    if (prevNode.left !== node.left && node.left) newChanges.add(`heap-${node.id}-left-${node.left}`);
                    if (prevNode.right !== node.right && node.right) newChanges.add(`heap-${node.id}-right-${node.right}`);
                }
            });

            if (newChanges.size > 0) {
                setChangedPointers(newChanges);
                const timer = setTimeout(() => setChangedPointers(new Set()), 500);
                prevSnapshotRef.current = snapshot;
                return () => clearTimeout(timer);
            }
        }
        prevSnapshotRef.current = snapshot;
    }, [snapshot]);

    if (!snapshot) {
        return (
            <div className="graph-canvas-empty">
                <div className="empty-icon">⊙</div>
                <p>Waiting for C code trace...</p>
                <p className="empty-sub">Open a <code>.c</code> file then start tracing</p>
            </div>
        );
    }

    const { heap, stack, hasLeak, warnings } = snapshot;
    const ptrVars = stack.filter(v => v.isPointer);
    const STACK_WIDTH = 300;
    const { placed: layout, type: structureType } = layoutNodes(heap, STACK_WIDTH);

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const handleWheel = (e: React.WheelEvent) => {
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        setTransform(prev => ({ ...prev, scale: Math.max(0.1, Math.min(4, prev.scale * zoomDelta)) }));
    };

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(13, 27, 42, 0.8)', border: '1px solid #4fc3f7', color: '#4fc3f7', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', zIndex: 100 }}>
                Structure: {structureType}
            </div>
            {hasLeak && (
                <div style={{ backgroundColor: '#ff9800', color: '#000', padding: '6px', textAlign: 'center', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '12px', zIndex: 100, borderBottom: '2px solid #e65100' }}>
                    ⚠ MEMORY LEAK DETECTED: {heap.filter(n => n.isLeaked).length} allocations were not freed.
                </div>
            )}
            {warnings && warnings.length > 0 && (
                <div style={{ backgroundColor: '#b71c1c', color: '#fff', padding: '6px', textAlign: 'center', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '12px', zIndex: 101, borderBottom: '2px solid #d32f2f' }}>
                    {warnings.map((w, idx) => <div key={idx}>{w}</div>)}
                </div>
            )}
            <div className="graph-canvas-wrap" ref={graphContainerRef} style={{ width: '100%', flex: 1, position: 'relative', overflow: 'hidden' }}>
                <svg
                    className="graph-svg"
                    width="100%"
                    height="100%"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onWheel={handleWheel}
                >
                    <defs>
                        <marker id="arrow-blue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#4fc3f7" />
                        </marker>
                        <marker id="arrow-red" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#ef5350" />
                        </marker>
                        <filter id="glow">
                            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#4fc3f7" floodOpacity="0.5" />
                        </filter>
                        <filter id="glow-red">
                            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ef5350" floodOpacity="0.4" />
                        </filter>
                    </defs>

                    <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
                        {/* Background Regions */}
                        <rect x={-5000} y={-5000} width={5000 + STACK_WIDTH} height={10000} fill="rgba(79, 195, 247, 0.02)" />
                        <rect x={STACK_WIDTH} y={-5000} width={10000} height={10000} fill="rgba(176, 190, 197, 0.02)" />
                        <line x1={STACK_WIDTH} y1={-5000} x2={STACK_WIDTH} y2={5000} stroke="#4fc3f7" strokeWidth="2" strokeDasharray="10,10" opacity="0.3" />
                        <text x={STACK_WIDTH / 2} y={20} textAnchor="middle" fill="#4fc3f7" opacity="0.5" fontSize="20" fontWeight="bold" fontFamily="monospace">STACK (Local Variables)</text>
                        <text x={STACK_WIDTH + 200} y={20} textAnchor="middle" fill="#b0bec5" opacity="0.5" fontSize="20" fontWeight="bold" fontFamily="monospace">HEAP (Dynamic Memory)</text>

                        {/* Stack Variable Pointer Boxes */}
                        {ptrVars.map((sv, i) => {
                            const bx = CANVAS_PADDING - 20;
                            const by = CANVAS_PADDING + i * (VAR_BOX_HEIGHT + 50);
                            const targetLayout = layout.find(l => l.id === sv.pointsTo);
                            const isActive = ['curr', 'temp', 'ptr'].includes(sv.name);

                            return (
                                <g key={sv.name}>
                                    <rect x={bx} y={by} width={VAR_BOX_WIDTH} height={VAR_BOX_HEIGHT} rx="4"
                                        fill={isActive ? '#3a1f1f' : '#1f2a3a'}
                                        stroke={isActive ? '#ef5350' : '#4fc3f7'}
                                        strokeWidth="1.5"
                                        filter={isActive ? 'url(#glow-red)' : 'url(#glow)'}
                                    />
                                    <text x={bx + VAR_BOX_WIDTH / 2} y={by + VAR_BOX_HEIGHT / 2 + 5}
                                        textAnchor="middle"
                                        fill={isActive ? '#ef9a9a' : '#90caf9'}
                                        fontSize="13" fontWeight="bold" fontFamily="monospace"
                                    >{sv.name}</text>
                                    <text x={bx + VAR_BOX_WIDTH / 2} y={by + VAR_BOX_HEIGHT + 14}
                                        textAnchor="middle" fill="#546e7a" fontSize="10" fontFamily="monospace"
                                    >{sv.value}</text>
                                    {targetLayout && (() => {
                                        const sx = bx + VAR_BOX_WIDTH;
                                        const sy = by + VAR_BOX_HEIGHT / 2;
                                        const ex = targetLayout.x;
                                        const ey = targetLayout.y + NODE_HEIGHT / 2;
                                        const mx = (sx + ex) / 2;
                                        const pointsToGhost = targetLayout.node.isFreed;
                                        return (
                                            <g>
                                                <path d={`M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}`}
                                                    className={`animated-path ${changedPointers.has(`stack-${sv.name}-${sv.pointsTo}`) ? 'pointer-reassigned' : ''}`}
                                                    fill="none" stroke={pointsToGhost || isActive ? '#ef5350' : '#4fc3f7'}
                                                    strokeWidth="1.5"
                                                    strokeDasharray={pointsToGhost || isActive ? '5,3' : '0'}
                                                    markerEnd={pointsToGhost || isActive ? 'url(#arrow-red)' : 'url(#arrow-blue)'}
                                                />
                                                {pointsToGhost && (
                                                    <text x={mx} y={(sy + ey) / 2 - 10}
                                                        textAnchor="middle" fill="#ef5350" fontSize="10" fontWeight="bold" fontFamily="monospace"
                                                    >⚠ USE AFTER FREE</text>
                                                )}
                                            </g>
                                        );
                                    })()}

                                    {!targetLayout && sv.isDereferencingNull && (() => {
                                        const sx = bx + VAR_BOX_WIDTH;
                                        const sy = by + VAR_BOX_HEIGHT / 2;
                                        const ex = sx + 60;
                                        return (
                                            <g>
                                                <line x1={sx} y1={sy} x2={ex - 5} y2={sy} stroke="#ef5350" strokeWidth="2" strokeDasharray="5,5" markerEnd="url(#arrow-red)" />
                                                <rect x={ex} y={sy - 15} width="60" height="30" fill="#3a1f1f" stroke="#ef5350" rx="3" />
                                                <text x={ex + 30} y={sy + 4} textAnchor="middle" fill="#ef9a9a" fontSize="11" fontWeight="bold" fontFamily="monospace">NULL</text>
                                                <text x={sx + 30} y={sy - 10} textAnchor="middle" fill="#ef5350" fontSize="10" fontWeight="bold" fontFamily="monospace">⚠ NULL DEREF</text>
                                            </g>
                                        );
                                    })()}
                                </g>
                            );
                        })}

                        {/* Heap Nodes */}
                        {layout.map(({ id, x, y, node }) => {
                            const ay = y;
                            const memAddr = `0x${(parseInt(id.replace('node_', '')) * 64 + 0x55a0).toString(16).toUpperCase()}`;
                            const isGhost = node.isFreed;
                            const isLeaked = node.isLeaked;
                            const isDoubleFree = node.isDoubleFree;

                            return (
                                <g key={id} className={Array.from(changedPointers).some(p => p.endsWith(`-${id}`)) ? 'node-pulse' : ''}
                                    onMouseEnter={(e) => {
                                        const svgBox = graphContainerRef.current?.getBoundingClientRect();
                                        if (svgBox) {
                                            setHoverNode(node);
                                            setHoverPos({ x: e.clientX - svgBox.left, y: e.clientY - svgBox.top + 20 });
                                        }
                                    }}
                                    onMouseMove={(e) => {
                                        if (hoverNode) {
                                            const svgBox = graphContainerRef.current?.getBoundingClientRect();
                                            if (svgBox) setHoverPos({ x: e.clientX - svgBox.left, y: e.clientY - svgBox.top + 20 });
                                        }
                                    }}
                                    onMouseLeave={() => setHoverNode(null)}
                                >
                                    <rect x={x} y={ay} width={NODE_WIDTH} height={NODE_HEIGHT} rx="6"
                                        fill={isDoubleFree ? "rgba(58, 31, 31, 0.6)" : (isGhost ? "rgba(13, 27, 42, 0.4)" : (isLeaked ? "#1f1700" : "#0d1b2a"))}
                                        stroke={isDoubleFree ? "#ff1744" : (isGhost ? "#ef5350" : (isLeaked ? "#ff9800" : "#4fc3f7"))}
                                        strokeWidth={isDoubleFree ? "3.5" : (isLeaked ? "2.5" : "1.5")}
                                        strokeDasharray={isDoubleFree ? "6,4" : (isGhost ? "5,5" : (isLeaked ? "8,4" : "none"))}
                                        filter={isDoubleFree ? "url(#glow-red)" : (isGhost ? "none" : (isLeaked ? "none" : "url(#glow)"))}
                                    />
                                    {isDoubleFree && (
                                        <text x={x + NODE_WIDTH / 2} y={ay + NODE_HEIGHT / 2}
                                            textAnchor="middle" fill="#ff1744"
                                            fontSize="18" fontWeight="bold" fontFamily="monospace"
                                            transform={`rotate(-10 ${x + NODE_WIDTH / 2} ${ay + NODE_HEIGHT / 2})`}
                                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                                        >⚠ DOUBLE FREE</text>
                                    )}
                                    {isGhost && !isDoubleFree && (
                                        <text x={x + NODE_WIDTH / 2} y={ay + NODE_HEIGHT / 2}
                                            textAnchor="middle" fill="rgba(239, 83, 80, 0.4)"
                                            fontSize="20" fontWeight="bold" fontFamily="monospace"
                                            transform={`rotate(-15 ${x + NODE_WIDTH / 2} ${ay + NODE_HEIGHT / 2})`}
                                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                                        >DEALLOCATED</text>
                                    )}
                                    {isLeaked && (
                                        <text x={x + NODE_WIDTH / 2} y={ay - 10}
                                            textAnchor="middle" fill="#ff9800"
                                            fontSize="12" fontWeight="bold" fontFamily="monospace"
                                        >⚠ MEMORY LEAK</text>
                                    )}
                                    <text x={x + 10} y={ay + 14} fill={isGhost ? "#ef5350" : (isLeaked ? "#ffcc80" : "#546e7a")} fontSize="10" fontFamily="monospace">{memAddr}</text>
                                    <line x1={x + 1} y1={ay + 20} x2={x + NODE_WIDTH - 1} y2={ay + 20} stroke={isGhost ? "rgba(239, 83, 80, 0.3)" : (isLeaked ? "rgba(255, 152, 0, 0.5)" : "#1c3a52")} strokeWidth="1" />
                                    {node.fields.map((field, fi) => (
                                        <g key={field.key}>
                                            <text x={x + 12} y={ay + 34 + fi * 18} fill={isGhost ? "rgba(239, 83, 80, 0.6)" : (isLeaked ? "#ffb74d" : "#78909c")} fontSize="11" fontFamily="monospace">{field.key}:</text>
                                            <text x={x + NODE_WIDTH - 12} y={ay + 34 + fi * 18}
                                                textAnchor="end"
                                                fill={isGhost ? "rgba(239, 83, 80, 0.8)" : (['next', 'left', 'right'].includes(field.key) ? '#4fc3f7' : '#b0bec5')}
                                                fontSize="11" fontFamily="monospace"
                                                fontWeight={field.key === 'data' ? 'bold' : 'normal'}
                                            >{field.value}</text>
                                        </g>
                                    ))}
                                </g>
                            );
                        })}

                        {/* Pointer Arrows between heap nodes */}
                        {layout.map(({ id, x, y, node }) => {
                            const ay = y;
                            const arrows: ReactElement[] = [];
                            if (node.next) {
                                const target = layout.find(l => l.id === node.next);
                                if (target) {
                                    const tay = target.y;
                                    const sx = x + NODE_WIDTH, sy = ay + NODE_HEIGHT / 2;
                                    const ex = target.x, ey = tay + NODE_HEIGHT / 2;
                                    const mx = (sx + ex) / 2;
                                    const pointsToGhost = target.node.isFreed;
                                    arrows.push(
                                        <path key={`${id}-next`}
                                            className={`animated-path ${changedPointers.has(`heap-${node.id}-next-${node.next}`) ? 'pointer-reassigned' : ''}`}
                                            d={`M ${sx} ${sy} C ${sx + 30} ${sy}, ${ex - 30} ${ey}, ${ex} ${ey}`}
                                            fill="none" stroke={pointsToGhost ? '#ef5350' : '#4fc3f7'} strokeWidth="1.5"
                                            strokeDasharray="6,3" markerEnd={pointsToGhost ? 'url(#arrow-red)' : 'url(#arrow-blue)'}
                                        />
                                    );
                                    arrows.push(
                                        <text key={`${id}-lbl`} x={mx} y={(sy + ey) / 2 - 10}
                                            textAnchor="middle" fill={pointsToGhost ? '#ef5350' : '#37474f'} fontSize="10" fontWeight={pointsToGhost ? "bold" : "normal"} fontFamily="monospace">{pointsToGhost ? "⚠ USE AFTER FREE" : "next"}</text>
                                    );
                                } else {
                                    const sx = x + NODE_WIDTH, sy = ay + NODE_HEIGHT / 2;
                                    arrows.push(
                                        <g key={`${id}-null`}>
                                            <line x1={sx} y1={sy} x2={sx + 40} y2={sy} stroke="#444" strokeWidth="1.5" />
                                            <text x={sx + 45} y={sy + 4} fill="#444" fontSize="11" fontFamily="monospace">NULL</text>
                                        </g>
                                    );
                                }
                            }
                            return <g key={`arrows-${id}`}>{arrows}</g>;
                        })}
                    </g>
                </svg>

                <button
                    onClick={handleResetView}
                    style={{
                        position: 'absolute',
                        bottom: '20px',
                        right: '20px',
                        padding: '8px 16px',
                        background: '#1c3a52',
                        border: '1px solid #4fc3f7',
                        color: '#b0bec5',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                        transition: 'all 0.2s',
                        zIndex: 10
                    }}
                >
                    ⟳ Reset / Auto-Center
                </button>

                {hoverNode && (
                    <div className="node-tooltip" style={{ left: hoverPos.x, top: hoverPos.y }}>
                        <strong>Address: {hoverNode.id}</strong>
                        <div className="tooltip-section">
                            {hoverNode.label && <div><span className="tooltip-key">Val:</span> {hoverNode.label}</div>}
                            {hoverNode.fields.map(f => <div key={f.key}><span className="tooltip-key">{f.key}:</span> {f.value}</div>)}
                            <div className="tooltip-divider" />
                            <div><span className="tooltip-key">Alloc:</span> Step {snapshots.find(s => s.heap.some(n => n.id === hoverNode.id))?.step || '?'}</div>
                            {hoverNode.isFreed && <div><span className="tooltip-key">Freed:</span> Step {snapshots.find(s => s.heap.some(n => n.id === hoverNode.id && n.isFreed))?.step || '?'}</div>}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
