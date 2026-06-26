export interface Eval {
    name: string;
    turns: string[];
    expect(finalResponse: string, allResponses: string[]): boolean | Promise<boolean>;
}
export interface EvalResult {
    name: string;
    passed: boolean;
    responses: string[];
    error?: string;
}
//# sourceMappingURL=types.d.ts.map