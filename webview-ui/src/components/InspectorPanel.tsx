import { useState } from 'react';
import type { Snapshot, HeapNode } from '../types';
import './InspectorPanel.css';

interface InspectorPanelProps {
    snapshot: Snapshot | null;
    snapshots: Snapshot[];
    currentIndex: number;
}

export function InspectorPanel({ snapshot, snapshots, currentIndex }: InspectorPanelProps) {
    const [activeTab, setActiveTab] = useState<'stack' | 'heap' | 'warnings' | 'events'>('stack');

    if (!snapshot) {
        return (
            <div className="inspector-panel empty">
                <p>No memory state available. Start tracing a program.</p>
            </div>
        );
    }

    const { stack, heap, warnings } = snapshot;

    return (
        <div className="inspector-panel">
            <div className="inspector-tabs">
                <button
                    className={`tab-btn ${activeTab === 'stack' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stack')}
                >
                    Stack
                </button>
                <button
                    className={`tab-btn ${activeTab === 'heap' ? 'active' : ''}`}
                    onClick={() => setActiveTab('heap')}
                >
                    Heap
                </button>
                {(warnings && warnings.length > 0) && (
                    <button
                        className={`tab-btn warning-tab ${activeTab === 'warnings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('warnings')}
                    >
                        ⚠ Warnings ({warnings.length})
                    </button>
                )}
                <button
                    className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                    onClick={() => setActiveTab('events')}
                >
                    Events
                </button>
            </div>

            <div className="inspector-content">
                {activeTab === 'stack' && (
                    <div className="stack-content">
                        {stack.length === 0 ? (
                            <p className="empty-text">Stack is empty.</p>
                        ) : (
                            <div className="stack-list">
                                {stack.map((v, i) => (
                                    <div key={i} className="list-item">
                                        <span className="var-name">{v.name}</span>: <span className="var-value">{v.value}</span>
                                        {v.pointsTo && <span className="var-ptr"> → {v.pointsTo}</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'heap' && (
                    <div className="heap-content">
                        {heap.length === 0 ? (
                            <p className="empty-text">Heap is empty.</p>
                        ) : (
                            <div className="heap-list">
                                {heap.map((n: HeapNode, i) => (
                                    <div key={i} className="list-item">
                                        <strong>{n.id}</strong>
                                        {n.label && <span> ({n.label})</span>}
                                        {n.isFreed && <span className="freed-badge">Freed</span>}
                                        {n.isLeaked && <span className="leak-badge">Leaked</span>}
                                        <div className="node-fields">
                                            {n.fields.map(f => <span key={f.key} className="field-badge">{f.key}: {f.value}</span>)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'warnings' && warnings && (
                    <div className="warnings-content">
                        {warnings.map((w, i) => (
                            <div key={i} className="warning-item">⚠ {w}</div>
                        ))}
                    </div>
                )}

                {activeTab === 'events' && (
                    <div className="events-content">
                        {snapshots.slice(0, currentIndex + 1).map((s, i) => (
                            <div key={i} className="list-item event-item">
                                <strong style={{ color: '#4fc3f7' }}>Step {s.step}:</strong> <span style={{ color: '#e0e0e0' }}>{s.description || 'Program execution step'}</span>
                                {s.warnings && s.warnings.map((w, j) => (
                                    <div key={j} style={{ color: '#ff8a80', marginTop: '4px', fontSize: '11px' }}>⚠ {w}</div>
                                ))}
                            </div>
                        ))}
                        {snapshots.length === 0 && <p className="empty-text">No events recorded.</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
