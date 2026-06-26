import type { Provider } from '../provider/types.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { Memory } from '../memory/types.js';
export interface AgentOptions {
    system?: string;
    maxTokens?: number;
    maxTurns?: number;
}
export declare class Agent {
    private readonly provider;
    private readonly tools;
    private readonly memory;
    private readonly options;
    constructor(provider: Provider, tools: ToolRegistry, memory: Memory, options?: AgentOptions);
    run(userMessage: string, sessionId?: string): Promise<string>;
    private extractText;
    private executeTools;
}
//# sourceMappingURL=agent.d.ts.map