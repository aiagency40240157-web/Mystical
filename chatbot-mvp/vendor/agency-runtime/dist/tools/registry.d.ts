import type { ToolDefinition } from './types.js';
import type { ToolSchema } from '../provider/types.js';
export declare class ToolRegistry {
    private readonly tools;
    register(tool: ToolDefinition): this;
    get(name: string): ToolDefinition | undefined;
    toProviderFormat(): ToolSchema[];
    get size(): number;
}
//# sourceMappingURL=registry.d.ts.map