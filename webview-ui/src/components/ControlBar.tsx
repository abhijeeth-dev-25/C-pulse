import './ControlBar.css';

interface ControlBarProps {
    fileName: string;
    currentStep: number;
    totalSteps: number;
    currentLine: number;
    description: string;
    isLive: boolean;
    onPrev: () => void;
    onNext: () => void;
    onLatest: () => void;
    onLoadFile: () => void;
}

export function ControlBar({
    fileName,
    currentStep,
    totalSteps,
    currentLine,
    description,
    isLive,
    onPrev,
    onNext,
    onLatest,
    onLoadFile,
}: ControlBarProps) {
    return (
        <div className="control-bar">
            {/* Status Row */}
            <div className="status-row">
                <div className="status-left">
                    <span className={`live-badge ${isLive ? 'live' : ''}`}>
                        {isLive ? '● LIVE' : '○ IDLE'}
                    </span>
                    <span className="separator">|</span>
                    <span className="info-label">
                        Step: <strong>{totalSteps > 0 ? currentStep : '—'}/{totalSteps || '—'}</strong>
                    </span>
                    <span className="separator">|</span>
                    <span className="info-label">
                        Line: <strong>{currentLine > 0 ? currentLine : '—'}</strong>
                    </span>
                    {fileName && (
                        <>
                            <span className="separator">|</span>
                            <span className="file-label">📄 {fileName}</span>
                        </>
                    )}
                </div>
                <button className="btn-load" onClick={onLoadFile}>
                    📂 Open File
                </button>
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
                <div className="step-track">
                    <div
                        className="step-fill"
                        style={{ width: totalSteps > 0 ? `${(currentStep / totalSteps) * 100}%` : '0%' }}
                    />
                    <span className="step-label">{currentStep} / {totalSteps}</span>
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
