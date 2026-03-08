"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainerRunner = void 0;
class ContainerRunner {
    async runContainer(imageName, command) {
        // Stub for deterministic container runner
        console.log(`Running command in container ${imageName}: ${command}`);
        return 'Container output';
    }
}
exports.ContainerRunner = ContainerRunner;
