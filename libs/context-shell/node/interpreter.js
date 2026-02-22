import path from 'path';
function splitPipeline(command) {
    const parts = [];
    let current = '';
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < command.length; i += 1) {
        const char = command[i];
        if (char === "'" && !inDouble) {
            inSingle = !inSingle;
            current += char;
            continue;
        }
        if (char === '"' && !inSingle) {
            inDouble = !inDouble;
            current += char;
            continue;
        }
        if (char === '|' && !inSingle && !inDouble) {
            parts.push(current.trim());
            current = '';
            continue;
        }
        current += char;
    }
    if (current.trim()) {
        parts.push(current.trim());
    }
    return parts;
}
function tokenize(command) {
    const tokens = [];
    let current = '';
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < command.length; i += 1) {
        const char = command[i];
        if (char === "'" && !inDouble) {
            inSingle = !inSingle;
            continue;
        }
        if (char === '"' && !inSingle) {
            inDouble = !inDouble;
            continue;
        }
        if (char === ' ' && !inSingle && !inDouble) {
            if (current) {
                tokens.push(current);
                current = '';
            }
            continue;
        }
        current += char;
    }
    if (current) {
        tokens.push(current);
    }
    return tokens;
}
function parse(command) {
    const pipeline = splitPipeline(command);
    return pipeline
        .map((segment) => tokenize(segment))
        .filter((tokens) => tokens.length > 0)
        .map((tokens) => ({
        name: tokens[0],
        args: tokens.slice(1),
    }));
}
async function cmdPwd(ctx) {
    return {
        stdout: `${ctx.root}\n`,
        stderr: '',
        exitCode: 0,
        filesRead: [],
    };
}
async function cmdLs(ctx, args) {
    const target = args.find((arg) => !arg.startsWith('-')) ?? '.';
    const resolved = path.resolve(ctx.root, target);
    const entries = await ctx.listDir(resolved);
    const output = entries.join('\n');
    return {
        stdout: output ? `${output}\n` : '',
        stderr: '',
        exitCode: 0,
        filesRead: [resolved],
    };
}
async function cmdCat(ctx, args) {
    const target = args[0];
    if (!target) {
        return { stdout: '', stderr: 'cat: missing file\n', exitCode: 1, filesRead: [] };
    }
    const resolved = path.resolve(ctx.root, target);
    const content = await ctx.readFile(resolved);
    return { stdout: content, stderr: '', exitCode: 0, filesRead: [resolved] };
}
function buildRegex(pattern) {
    return new RegExp(pattern, 'g');
}
async function cmdRg(ctx, args) {
    const effectiveArgs = [...args];
    if (effectiveArgs[0] === '-n') {
        effectiveArgs.shift();
    }
    if (effectiveArgs.length === 0) {
        return { stdout: '', stderr: 'rg: missing pattern\n', exitCode: 1, filesRead: [] };
    }
    const patternArg = effectiveArgs.shift();
    if (!patternArg) {
        return { stdout: '', stderr: 'rg: missing pattern\n', exitCode: 1, filesRead: [] };
    }
    const target = effectiveArgs[0] ?? '.';
    const resolvedRoot = path.resolve(ctx.root, target);
    const regex = buildRegex(patternArg);
    const files = await ctx.listFilesRecursive(resolvedRoot);
    const filesRead = [];
    const lines = [];
    for (const file of files) {
        if (filesRead.length >= ctx.limits.maxFiles) {
            break;
        }
        const content = await ctx.readFile(file);
        filesRead.push(file);
        const rows = content.split(/\r?\n/);
        for (let i = 0; i < rows.length; i += 1) {
            const row = rows[i];
            if (regex.test(row)) {
                lines.push(`${file}:${i + 1}:${row}`);
            }
            regex.lastIndex = 0;
        }
    }
    const stdout = lines.join('\n');
    return {
        stdout: stdout ? `${stdout}\n` : '',
        stderr: '',
        exitCode: 0,
        filesRead,
    };
}
async function cmdFind(ctx, args) {
    const target = args.find((arg) => !arg.startsWith('-')) ?? '.';
    const resolvedRoot = path.resolve(ctx.root, target);
    const files = await ctx.listFilesRecursive(resolvedRoot);
    const output = files.slice(0, ctx.limits.maxFiles).join('\n');
    return {
        stdout: output ? `${output}\n` : '',
        stderr: '',
        exitCode: 0,
        filesRead: [resolvedRoot],
    };
}
async function cmdWc(input, args) {
    if (args[0] !== '-l') {
        return {
            stdout: '',
            stderr: 'wc: only -l is supported\n',
            exitCode: 1,
            filesRead: [],
        };
    }
    const lines = input === '' ? 0 : input.trimEnd().split(/\r?\n/).length;
    return {
        stdout: `${lines}\n`,
        stderr: '',
        exitCode: 0,
        filesRead: [],
    };
}
async function executeSingle(ctx, command, input) {
    switch (command.name) {
        case 'pwd':
            return cmdPwd(ctx);
        case 'ls':
            return cmdLs(ctx, command.args);
        case 'cat':
            return cmdCat(ctx, command.args);
        case 'rg':
            return cmdRg(ctx, command.args);
        case 'find':
            return cmdFind(ctx, command.args);
        case 'wc':
            return cmdWc(input, command.args);
        default:
            return {
                stdout: '',
                stderr: `Command not supported: ${command.name}\n`,
                exitCode: 1,
                filesRead: [],
            };
    }
}
export async function executeBashLike(ctx, command) {
    const pipeline = parse(command);
    let output = '';
    let stderr = '';
    let exitCode = 0;
    const filesRead = [];
    for (const segment of pipeline) {
        const result = await executeSingle(ctx, segment, output);
        output = result.stdout;
        if (result.stderr) {
            stderr = `${stderr}${result.stderr}`;
        }
        exitCode = result.exitCode;
        filesRead.push(...result.filesRead);
        if (exitCode !== 0) {
            break;
        }
    }
    return {
        stdout: output,
        stderr,
        exitCode,
        filesRead,
    };
}
export function parseCommands(command) {
    return parse(command);
}
//# sourceMappingURL=interpreter.js.map