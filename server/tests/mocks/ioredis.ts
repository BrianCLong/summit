
export default class Redis {
    options: any;
    keyPrefix: string;
    status: string;

    constructor() {
        console.log('Mock Redis initialized');
        this.status = 'ready';
        this.options = { keyPrefix: 'summit:' };
        this.keyPrefix = 'summit:';
    }
    on(event, callback) {
        if (event === 'connect' || event === 'ready') {
            setTimeout(() => callback && callback(), 10);
        }
        return this;
    }
    async connect() { return Promise.resolve(); }
    async ping() { return 'PONG'; }
    async get() { return null; }
    async set() { return 'OK'; }
    async del() { return 1; }
    disconnect() { }
    quit() { }
    duplicate() { return this; }
}
export { Redis };
