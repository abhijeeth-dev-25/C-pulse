import { useState, useRef, type MouseEvent } from 'react';
import type { Snapshot } from '../types';
import './ExecutionTimeline.css';

interface ExecutionTimelineProps {
    snapshots: Snapshot[];
    currentIndex: number;
    onSeek: (index: number) => void;
}

type EventType = 'malloc' | 'free' | 'pointer' | 'leak' | 'warning' | 'default';

function getEventType(snap: Snapshot): EventType {
    if (snap.warnings && snap.warnings.length > 0) return 'warning';
    if (snap.hasLeak) return 'leak';

    const desc = snap.description.toLowerCase();
    if (desc.includes('malloc') || desc.includes('allocated')) return 'malloc';
    if (desc.includes('free')) return 'free';
    // Most pointer assignments use '→' or '=' or 'updated'
    if (desc.includes('→') || desc.includes('=') || desc.includes('updat') || desc.includes('point')) return 'pointer';

    return 'default';
}

export function ExecutionTimeline({ snapshots, currentIndex, onSeek }: ExecutionTimelineProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    const handleTrackClick = (e: MouseEvent<HTMLDivElement>) => {
        if (!trackRef.current || snapshots.length === 0) return;
        const rect = trackRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        const targetIndex = Math.min(snapshots.length - 1, Math.floor(percentage * snapshots.length));
        onSeek(targetIndex);
    };

    const handleDrag = (e: globalThis.MouseEvent) => {
        if (!trackRef.current || snapshots.length === 0) return;
        const rect = trackRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        const targetIndex = Math.min(snapshots.length - 1, Math.floor(percentage * snapshots.length));
        onSeek(targetIndex);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const onPointerMove = (moveEvent: globalThis.MouseEvent) => handleDrag(moveEvent);
        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        // Force an initial update as well
        handleDrag(e.nativeEvent);
    };

    if (snapshots.length === 0) {
        return <div className="timeline-empty">Timeline unavailable (No Trace Selected)</div>;
    }

    return (
        <div className="execution-timeline" >
            <div
                className="timeline-track"
                ref={trackRef}
                onClick={handleTrackClick}
                onPointerDown={handlePointerDown}
                onMouseLeave={() => setHoverIndex(null)}
                onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                    setHoverIndex(Math.min(snapshots.length - 1, Math.floor((x / rect.width) * snapshots.length)));
                }}
            >
                {/* Visual line background */}
                <div className="timeline-line"></div>

                {/* Filled portion up to current index */}
                <div
                    className="timeline-fill"
                    style={{ width: `${(currentIndex / Math.max(1, snapshots.length - 1)) * 100}%` }}
                ></div>

                {/* Individual Tick Marks */}
                {snapshots.map((snap, i) => {
                    const percent = (i / Math.max(1, snapshots.length - 1)) * 100;
                    const type = getEventType(snap);
                    const isActive = i === currentIndex;
                    return (
                        <div
                            key={i}
                            className={`timeline-tick type-${type} ${isActive ? 'active-tick' : ''}`}
                            style={{ left: `${percent}%` }}
                        />
                    );
                })}

                {/* Draggable Scrubber Handle */}
                <div
                    className="timeline-handle"
                    style={{ left: `${(currentIndex / Math.max(1, snapshots.length - 1)) * 100}%` }}
                />
            </div>

            {/* Hover Tooltip display */}
            <div className="timeline-tooltip-wrapper">
                {hoverIndex !== null && snapshots[hoverIndex] && (
                    <div className="timeline-tooltip">
                        <strong>Step {hoverIndex + 1}</strong>: {snapshots[hoverIndex].description}
                        {snapshots[hoverIndex].hasLeak && <div className="tooltip-warn">⚠ MEMORY LEAK</div>}
                        {snapshots[hoverIndex].warnings?.map((w, idx) => <div key={idx} className="tooltip-error">⚠ {w}</div>)}
                    </div>
                )}
            </div>
        </div>
    );
}
