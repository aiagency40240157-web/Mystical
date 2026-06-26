import type { Provider, Message, ProviderResponse, ToolSchema } from './types.js';
export interface MockTurn {
    text?: string;
    toolCalls?: Array<{
        name: string;
        input: unknown;
    }>;
}
export declare class MockProvider implements Provider {
    private readonly turns;
    private turnIndex;
    private _model;
    readonly calls: Message[][];
    constructor(turns: MockTurn[]);
    send(messages: Message[], _options?: {
        tools?: ToolSchema[];
    }): Promise<ProviderResponse>;
    model(): string;
    setModel(model: string): void;
    reset(): void;
}
//# sourceMappingURL=mock.d.ts.map