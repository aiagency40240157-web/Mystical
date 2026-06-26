export interface ToolDefinition<TInput = unknown> {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
    execute(input: TInput): Promise<string>;
}
//# sourceMappingURL=types.d.ts.map