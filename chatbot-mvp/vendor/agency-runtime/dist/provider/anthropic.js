import Anthropic from '@anthropic-ai/sdk';
export class AnthropicProvider {
    client;
    _model;
    constructor(options) {
        this.client = new Anthropic({ apiKey: options?.apiKey });
        this._model = options?.model ?? process.env['ANTHROPIC_MODEL'] ?? 'claude-sonnet-4-6';
    }
    async send(messages, options) {
        const params = {
            model: this._model,
            max_tokens: options?.maxTokens ?? 8096,
            messages: messages,
        };
        if (options?.system)
            params.system = options.system;
        if (options?.tools?.length)
            params.tools = options.tools;
        const response = await this.client.messages.create(params);
        const content = response.content.map((block) => {
            if (block.type === 'text')
                return { type: 'text', text: block.text };
            if (block.type === 'tool_use') {
                return { type: 'tool_use', id: block.id, name: block.name, input: block.input };
            }
            throw new Error(`Unknown content block type: ${block.type}`);
        });
        return {
            message: { role: 'assistant', content },
            stopReason: response.stop_reason,
            usage: {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
            },
        };
    }
    model() { return this._model; }
    setModel(model) { this._model = model; }
}
//# sourceMappingURL=anthropic.js.map