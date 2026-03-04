import type { ReactElement } from 'react';
import type { Snapshot, HeapNode } from '../types';
import './GraphCanvas.css';

interface GraphCanvasProps {
    snapshot: Snapshot | null;
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

function layoutNodes(heap: HeapNode[]): LayoutNode[] {
    const placed: LayoutNode[] = [];
    const visited = new Set<string>();
    const pointedTo = new Set(heap.flatMap(n => [n.next, n.left, n.right].filter(Boolean) as string[]));
    const roots = heap.filter(n => !pointedTo.has(n.id));

    function place(node: HeapNode, row: number, depth: number) {
        if (visited.has(node.id)) return;
        visited.add(node.id);
        const x = CANVAS_PADDING + depth * (NODE_WIDTH + NODE_GAP_X);
        const y = CANVAS_PADDING + row * (NODE_HEIGHT + NODE_GAP_Y);
        placed.push({ id: node.id, x, y, node });
        if (node.next) { const c = heap.find(n => n.id === node.next); if (c) place(c, row, depth + 1); }
        if (node.left) { const c = heap.find(n => n.id === node.left); if (c) place(c, row + 1, depth + 1); }
        if (node.right) { const c = heap.find(n => n.id === node.right); if (c) place(c, row + 2, depth + 1); }
    }

    roots.forEach((root, i) => place(root, i, 0));
    heap.forEach(n => { if (!visited.has(n.id)) place(n, placed.length, 0); });
    return placed;
}

export function GraphCanvas({ snapshot }: GraphCanvasProps) {
    if (!snapshot) {
        return (
            <div className="graph-canvas-empty">
                <div className="empty-icon">⊙</div>
                <p>Waiting for C code trace...</p>
                <p className="empty-sub">Open a <code>.c</code> file then start tracing</p>
            </div>
        );
    }

    const { heap, stack } = snapshot;
    const layout = layoutNodes(heap);
    const maxX = Math.max(...layout.map(l => l.x + NODE_WIDTH), 400) + CANVAS_PADDING;
    const maxY = Math.max(...layout.map(l => l.y + NODE_HEIGHT), 300) + CANVAS_PADDING;
    const ptrVars = stack.filter(v => v.isPointer);
    const VAR_OFFSET = ptrVars.length * (VAR_BOX_HEIGHT + 10) + 20;

    return (
        <div className="graph-canvas-wrap">
            <svg
                className="graph-svg"
                width={Math.max(maxX + 20, 600)}
                height={Math.max(maxY + VAR_OFFSET, 400)}
                xmlns="http://www.w3.org/2000/svg"
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

                {/* Stack Variable Pointer Boxes */}
                {ptrVars.map((sv, i) => {
                    const bx = CANVAS_PADDING + i * (VAR_BOX_WIDTH + 60);
                    const by = 20;
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
                                const ey = targetLayout.y + NODE_HEIGHT / 2 + VAR_OFFSET;
                                const mx = (sx + ex) / 2;
                                return (
                                    <path d={`M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}`}
                                        fill="none" stroke={isActive ? '#ef5350' : '#4fc3f7'}
                                        strokeWidth="1.5"
                                        strokeDasharray={isActive ? '5,3' : '0'}
                                        markerEnd={isActive ? 'url(#arrow-red)' : 'url(#arrow-blue)'}
                                    />
                                );
                            })()}
                        </g>
                    );
                })}

                {/* Heap Nodes */}
                {layout.map(({ id, x, y, node }) => {
                    const ay = y + VAR_OFFSET;
                    const memAddr = `0x${(parseInt(id.replace('node_', '')) * 64 + 0x55a0).toString(16).toUpperCase()}`;
                    return (
                        <g key={id}>
                            <rect x={x} y={ay} width={NODE_WIDTH} height={NODE_HEIGHT} rx="6"
                                fill="#0d1b2a" stroke="#4fc3f7" strokeWidth="1.5" filter="url(#glow)"
                            />
                            <text x={x + 10} y={ay + 14} fill="#546e7a" fontSize="10" fontFamily="monospace">{memAddr}</text>
                            <line x1={x + 1} y1={ay + 20} x2={x + NODE_WIDTH - 1} y2={ay + 20} stroke="#1c3a52" strokeWidth="1" />
                            {node.fields.map((field, fi) => (
                                <g key={field.key}>
                                    <text x={x + 12} y={ay + 34 + fi * 18} fill="#78909c" fontSize="11" fontFamily="monospace">{field.key}:</text>
                                    <text x={x + NODE_WIDTH - 12} y={ay + 34 + fi * 18}
                                        textAnchor="end"
                                        fill={['next', 'left', 'right'].includes(field.key) ? '#4fc3f7' : '#b0bec5'}
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
                    const ay = y + VAR_OFFSET;
                    const arrows: ReactElement[] = [];
                    if (node.next) {
                        const target = layout.find(l => l.id === node.next);
                        if (target) {
                            const tay = target.y + VAR_OFFSET;
                            const sx = x + NODE_WIDTH, sy = ay + NODE_HEIGHT / 2;
                            const ex = target.x, ey = tay + NODE_HEIGHT / 2;
                            const mx = (sx + ex) / 2;
                            arrows.push(
                                <path key={`${id}-next`}
                                    d={`M ${sx} ${sy} C ${sx + 30} ${sy}, ${ex - 30} ${ey}, ${ex} ${ey}`}
                                    fill="none" stroke="#4fc3f7" strokeWidth="1.5"
                                    strokeDasharray="6,3" markerEnd="url(#arrow-blue)"
                                />
                            );
                            arrows.push(
                                <text key={`${id}-lbl`} x={mx} y={(sy + ey) / 2 - 10}
                                    textAnchor="middle" fill="#37474f" fontSize="10" fontFamily="monospace">next</text>
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
            </svg>
        </div>
    );
}
