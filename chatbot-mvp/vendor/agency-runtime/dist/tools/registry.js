export class ToolRegistry {
    tools = new Map();
    register(tool) {
        this.tools.set(tool.name, tool);
        return this;
    }
    get(name) {
        return this.tools.get(name);
    }
    toProviderFormat() {
        return Array.from(this.tools.values()).map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.inputSchema,
        }));
    }
    get size() {
        return this.tools.size;
    }
}
//# sourceMappingURL=registry.js.map