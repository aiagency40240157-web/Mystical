import type { Memory } from './types.js';
import type { Message } from '../provider/types.js';
export declare class FileMemory implements Memory {
    private readonly dir;
    constructor(dir?: string);
    private path;
    load(sessionId: string): Promise<Message[]>;
    save(sessionId: string, messages: Message[]): Promise<void>;
    clear(sessionId: string): Promise<void>;
}
//# sourceMappingURL=file-store.d.ts.map