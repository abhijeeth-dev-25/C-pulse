import React from "react";
import "./MemoryView.css";

interface Variable {
    name: string;
    value: string;
}

interface MemoryState {
    stack: Variable[];
    heap: any[]; // We'll expand heap visualization later
}

interface MemoryViewProps {
    state: MemoryState | null;
}

export const MemoryView: React.FC<MemoryViewProps> = ({ state }) => {
    if (!state) {
        return (
            <div className="memory-view empty">
                <p>No memory state available. Start tracing a program.</p>
            </div>
        );
    }

    return (
        <div className="memory-view">
            <div className="memory-section stack-section">
                <h3>Stack (Local Variables)</h3>
                {state.stack.length === 0 ? (
                    <p className="empty-text">Stack is empty.</p>
                ) : (
                    <div className="stack-container">
                        {state.stack.map((v, i) => (
                            <div key={i} className="stack-frame-variable">
                                <span className="var-name">{v.name}</span>
                                <span className="var-value">{v.value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="memory-section heap-section">
                <h3>Heap (Dynamic Allocations)</h3>
                {state.heap.length === 0 ? (
                    <p className="empty-text">Heap is empty.</p>
                ) : (
                    <div className="heap-container">
                        {/* Future DSA nodes goes here */}
                        <p>Allocations present.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
