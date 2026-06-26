import type { Provider, Message, ProviderResponse, ToolSchema } from './types.js';
export interface AnthropicProviderOptions {
    apiKey?: string;
    model?: string;
}
export declare class AnthropicProvider implements Provider {
    private readonly client;
    private _model;
    constructor(options?: AnthropicProviderOptions);
    send(messages: Message[], options?: {
        tools?: ToolSchema[];
        system?: string;
        maxTokens?: number;
    }): Promise<ProviderResponse>;
    model(): string;
    setModel(model: string): void;
}
//# sourceMappingURL=anthropic.d.ts.map