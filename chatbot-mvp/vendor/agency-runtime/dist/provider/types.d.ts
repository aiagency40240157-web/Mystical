export type Role = 'user' | 'assistant';
export interface TextBlock {
    type: 'text';
    text: string;
}
export interface ToolUseBlock {
    type: 'tool_use';
    id: string;
    name: string;
    input: unknown;
}
export interface ToolResultBlock {
    type: 'tool_result';
    tool_use_id: string;
    content: string;
}
export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;
export interface Message {
    role: Role;
    content: string | ContentBlock[];
}
export type StopReason = 'end_turn' | 'tool_use' | 'max_tokens';
export interface ProviderResponse {
    message: Message;
    stopReason: StopReason;
    usage: {
        inputTokens: number;
        outputTokens: number;
    };
}
export interface ToolSchema {
    name: string;
    description: string;
    input_schema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
}
export interface Provider {
    send(messages: Message[], options?: {
        tools?: ToolSchema[];
        system?: string;
        maxTokens?: number;
    }): Promise<ProviderResponse>;
    model(): string;
    setModel(model: string): void;
}
//# sourceMappingURL=types.d.ts.map