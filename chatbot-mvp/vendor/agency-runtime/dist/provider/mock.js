export class MockProvider {
    turns;
    turnIndex = 0;
    _model = 'mock';
    calls = [];
    constructor(turns) {
        this.turns = turns;
    }
    async send(messages, _options) {
        this.calls.push([...messages]);
        const turn = this.turns[this.turnIndex] ?? { text: '(mock: no more turns)' };
        this.turnIndex++;
        if (turn.toolCalls && turn.toolCalls.length > 0) {
            return {
                message: {
                    role: 'assistant',
                    content: turn.toolCalls.map((tc, i) => ({
                        type: 'tool_use',
                        id: `mock_tool_${i}`,
                        name: tc.name,
                        input: tc.input,
                    })),
                },
                stopReason: 'tool_use',
                usage: { inputTokens: 10, outputTokens: 10 },
            };
        }
        return {
            message: { role: 'assistant', content: turn.text ?? '' },
            stopReason: 'end_turn',
            usage: { inputTokens: 10, outputTokens: 10 },
        };
    }
    model() { return this._model; }
    setModel(model) { this._model = model; }
    reset() { this.turnIndex = 0; this.calls.length = 0; }
}
//# sourceMappingURL=mock.js.map