import { ExecutionTimeline } from './ExecutionTimeline';
import type { Snapshot } from '../types';
import './ControlBar.css';

interface ControlBarProps {
    fileName: string;
    currentStep: number;
    totalSteps: number;
    currentLine: number;
    description: string;
    isLive: boolean;
    snapshots: Snapshot[];
    currentIndex: number;
    isReplaying: boolean;
    onReplayBug: (index: number) => void;
    onPrev: () => void;
    onNext: () => void;
    onSeek: (index: number) => void;
    onLatest: () => void;
    onLoadFile: () => void;
    focusGraph: boolean;
    onToggleFocus: () => void;
}

export function ControlBar({
    fileName,
    currentStep,
    totalSteps,
    currentLine,
    description,
    isLive,
    snapshots,
    currentIndex,
    isReplaying,
    onReplayBug,
    onPrev,
    onNext,
    onSeek,
    onLatest,
    onLoadFile,
    focusGraph,
    onToggleFocus,
}: ControlBarProps) {
    const currentSnap = currentIndex >= 0 ? snapshots[currentIndex] : null;

    let badgeText = 'PAUSED';
    let badgeClass = 'paused';

    if (currentSnap?.warnings && currentSnap.warnings.length > 0 || currentSnap?.hasLeak) {
        badgeText = 'MEMORY ERROR';
        badgeClass = 'error';
    } else if (isLive && currentIndex === totalSteps - 1) {
        badgeText = 'RUNNING';
        badgeClass = 'running';
    } else if (totalSteps > 0 && currentIndex === totalSteps - 1) {
        badgeText = 'FINISHED';
        badgeClass = 'finished';
    }

    if (isReplaying) {
        badgeText = 'REPLAYING';
        badgeClass = 'running';
    }

    return (
        <div className="control-bar">
            {/* Status Row */}
            <div className="status-row">
                <div className="status-left">
                    <span className={`status-badge ${badgeClass}`}>
                        {badgeText}
                    </span>
                    <span className="info-label" style={{ marginLeft: '8px' }}>
                        Step: <strong>{totalSteps > 0 ? currentStep : '—'} / {totalSteps || '—'}</strong>
                    </span>
                    <span className="info-label" style={{ marginLeft: '12px' }}>
                        Line: <strong>{currentLine > 0 ? currentLine : '—'}</strong>
                    </span>
                    {fileName && (
                        <>
                            <span className="separator">|</span>
                            <span className="file-label">📄 {fileName}</span>
                        </>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {snapshots.some(s => s.warnings && s.warnings.length > 0 || s.hasLeak) && (
                        <button
                            className={`btn-load ${isReplaying ? 'active-replay' : ''}`}
                            style={{ backgroundColor: '#b71c1c', borderColor: '#d32f2f' }}
                            onClick={() => {
                                const bugIdx = snapshots.findIndex(s => s.warnings && s.warnings.length > 0 || s.hasLeak);
                                if (bugIdx !== -1) onReplayBug(bugIdx);
                            }}
                        >
                            {isReplaying ? '⏹ Replaying...' : '▶ Replay Bug'}
                        </button>
                    )}
                    {snapshots.some(s => s.warnings && s.warnings.length > 0 || s.hasLeak) && (
                        <button
                            className="btn-load"
                            style={{ backgroundColor: '#263238', borderColor: '#455a64' }}
                            onClick={() => {
                                const bugIdx = snapshots.findIndex(s => s.warnings && s.warnings.length > 0 || s.hasLeak);
                                if (bugIdx !== -1) onSeek(bugIdx);
                            }}
                        >
                            ⏪ Jump to Root Cause
                        </button>
                    )}
                    <button className={`btn-load ${focusGraph ? 'active-replay' : ''}`} onClick={onToggleFocus} style={{ backgroundColor: focusGraph ? '#004d40' : '#1c3a52', borderColor: focusGraph ? '#00695c' : '#264b6e' }}>
                        {focusGraph ? '🔍 Exit Focus' : '🔍 Focus Graph'}
                    </button>
                    <button className="btn-load" onClick={onLoadFile}>
                        📂 Open File
                    </button>
                </div>
            </div>

            {/* Description Row */}
            {description && (
                <div className="desc-row">
                    <span className="desc-text">▸ {description}</span>
                </div>
            )}

            {/* Navigation Row */}
            <div className="nav-row">
                <button className="btn-nav" onClick={onPrev} disabled={currentStep <= 1}>
                    ◀ Prev
                </button>
                <div style={{ flex: 1, padding: '0 10px', height: '40px' }}>
                    <ExecutionTimeline
                        snapshots={snapshots}
                        currentIndex={currentIndex}
                        onSeek={onSeek}
                    />
                </div>
                <button className="btn-nav" onClick={onNext} disabled={currentStep >= totalSteps}>
                    Next ▶
                </button>
                <button className="btn-latest" onClick={onLatest} disabled={currentStep >= totalSteps}>
                    ⏭ Latest
                </button>
            </div>
        </div>
    );
}
