export async function runEvals(agent, evals, sessionPrefix = 'eval') {
    const results = [];
    for (const ev of evals) {
        const sessionId = `${sessionPrefix}-${ev.name}-${Date.now()}`;
        const responses = [];
        try {
            for (const turn of ev.turns) {
                const response = await agent.run(turn, sessionId);
                responses.push(response);
            }
            const passed = await ev.expect(responses[responses.length - 1] ?? '', responses);
            results.push({ name: ev.name, passed, responses });
        }
        catch (err) {
            results.push({
                name: ev.name,
                passed: false,
                responses,
                error: err.message,
            });
        }
    }
    return results;
}
//# sourceMappingURL=runner.js.map