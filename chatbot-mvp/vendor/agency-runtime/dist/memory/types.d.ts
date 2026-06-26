import type { Message } from '../provider/types.js';
export interface Memory {
    load(sessionId: string): Promise<Message[]>;
    save(sessionId: string, messages: Message[]): Promise<void>;
    clear(sessionId: string): Promise<void>;
}
//# sourceMappingURL=types.d.ts.map