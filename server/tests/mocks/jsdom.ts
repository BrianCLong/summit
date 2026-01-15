export class JSDOM {
    constructor() {
        return {
            window: {
                document: {
                    createElement: () => ({}),
                },
            },
        } as any;
    }
}
