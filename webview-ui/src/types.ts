// Shared types between frontend and backend

export interface HeapNode {
    id: string;
    label: string;
    fields: { key: string; value: string }[];
    next: string | null;
    left: string | null;
    right: string | null;
    isFreed?: boolean;
    isLeaked?: boolean;
    isDoubleFree?: boolean;
}

export interface StackVar {
    name: string;
    value: string;
    pointsTo: string | null;
    isPointer: boolean;
    isDereferencingNull?: boolean;
}

export interface Snapshot {
    step: number;
    line: number;
    description: string;
    stack: StackVar[];
    heap: HeapNode[];
    hasLeak?: boolean;
    warnings?: string[];
}
