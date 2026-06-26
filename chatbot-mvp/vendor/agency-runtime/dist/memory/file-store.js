import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
export class FileMemory {
    dir;
    constructor(dir = '.sessions') {
        this.dir = dir;
    }
    path(sessionId) {
        return join(this.dir, `${sessionId}.json`);
    }
    async load(sessionId) {
        try {
            const raw = await readFile(this.path(sessionId), 'utf8');
            return JSON.parse(raw);
        }
        catch {
            return [];
        }
    }
    async save(sessionId, messages) {
        await mkdir(this.dir, { recursive: true });
        await writeFile(this.path(sessionId), JSON.stringify(messages, null, 2), 'utf8');
    }
    async clear(sessionId) {
        try {
            await unlink(this.path(sessionId));
        }
        catch {
            // already cleared or never existed
        }
    }
}
//# sourceMappingURL=file-store.js.map