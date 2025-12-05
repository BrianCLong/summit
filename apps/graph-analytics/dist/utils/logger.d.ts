import winston from 'winston';
export declare const logger: winston.Logger;
export declare const performanceLogger: {
    start: (operation: string) => {
        end: () => void;
    };
};
