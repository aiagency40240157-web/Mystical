const DEFAULT_MAX_TURNS = 20;
export class Agent {
    provider;
    tools;
    memory;
    options;
    constructor(provider, tools, memory, options = {}) {
        this.provider = provider;
        this.tools = tools;
        this.memory = memory;
        this.options = options;
    }
    async run(userMessage, sessionId = 'default') {
        const history = await this.memory.load(sessionId);
        const messages = [
            ...history,
            { role: 'user', content: userMessage },
        ];
        const maxTurns = this.options.maxTurns ?? DEFAULT_MAX_TURNS;
        for (let turn = 0; turn < maxTurns; turn++) {
            const response = await this.provider.send(messages, {
                tools: this.tools.toProviderFormat(),
                system: this.options.system,
                maxTokens: this.options.maxTokens,
            });
            messages.push(response.message);
            if (response.stopReason === 'end_turn' || response.stopReason === 'max_tokens') {
                await this.memory.save(sessionId, messages);
                return this.extractText(response.message);
            }
            if (response.stopReason === 'tool_use') {
                const toolResults = await this.executeTools(response.message.content);
                messages.push({ role: 'user', content: toolResults });
                continue;
            }
            break;
        }
        throw new Error(`Agent exceeded maxTurns (${maxTurns})`);
    }
    extractText(message) {
        if (typeof message.content === 'string')
            return message.content;
        return message.content
            .filter((b) => b.type === 'text')
            .map((b) => b.text)
            .join('\n');
    }
    async executeTools(blocks) {
        const toolUseBlocks = blocks.filter((b) => b.type === 'tool_use');
        return Promise.all(toolUseBlocks.map(async (block) => {
            const tool = this.tools.get(block.name);
            if (!tool) {
                return {
                    type: 'tool_result',
                    tool_use_id: block.id,
                    content: `Error: tool "${block.name}" not registered`,
                };
            }
            try {
                const content = await tool.execute(block.input);
                return { type: 'tool_result', tool_use_id: block.id, content };
            }
            catch (err) {
                return {
                    type: 'tool_result',
                    tool_use_id: block.id,
                    content: `Error: ${err.message}`,
                };
            }
        }));
    }
}
//# sourceMappingURL=agent.js.map