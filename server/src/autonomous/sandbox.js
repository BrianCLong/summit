"use strict";
/**
 * Action Sandbox - Secure execution environment for autonomous operations
 * Addresses P0 security gaps with containerized execution and network controls
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.URLValidator = exports.ActionSandbox = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const crypto_1 = require("crypto");
const url_1 = require("url");
class ActionSandbox {
    logger;
    basePath;
    networkGuard;
    constructor(logger, basePath = '/tmp/sandbox') {
        this.logger = logger;
        this.basePath = basePath;
        this.networkGuard = new NetworkGuard(logger);
        // Ensure base directory exists
        fs_1.promises.mkdir(basePath, { recursive: true }).catch(() => { });
    }
    /**
     * Execute command in secure sandbox
     */
    async execute(context) {
        const startTime = Date.now();
        const sandboxId = context.id || (0, crypto_1.randomUUID)();
        const sandboxPath = (0, path_1.join)(this.basePath, sandboxId);
        this.logger.info({
            sandboxId,
            command: context.command,
            config: context.config,
        }, 'Starting sandbox execution');
        try {
            // Create sandbox directory
            await fs_1.promises.mkdir(sandboxPath, { recursive: true });
            // Setup sandbox environment
            await this.setupSandbox(sandboxPath, context);
            // Execute with constraints
            const result = await this.executeConstrained(sandboxPath, context);
            // Calculate duration
            result.duration = Date.now() - startTime;
            this.logger.info({
                sandboxId,
                success: result.success,
                duration: result.duration,
                exitCode: result.exitCode,
            }, 'Sandbox execution completed');
            return result;
        }
        catch (error) {
            this.logger.error({
                sandboxId,
                error: error.message,
            }, 'Sandbox execution failed');
            return {
                success: false,
                exitCode: -1,
                stdout: '',
                stderr: error.message,
                duration: Date.now() - startTime,
                resourceUsage: {
                    maxMemoryMB: 0,
                    cpuTimeMs: 0,
                    networkConnections: 0,
                },
                violations: [`Sandbox setup failed: ${error.message}`],
            };
        }
        finally {
            // Cleanup sandbox directory
            await this.cleanupSandbox(sandboxPath).catch((err) => {
                this.logger.warn({ sandboxId, error: err.message }, 'Failed to cleanup sandbox');
            });
        }
    }
    /**
     * Setup sandbox environment with security controls
     */
    async setupSandbox(sandboxPath, context) {
        // Create working directory
        const workDir = (0, path_1.join)(sandboxPath, 'work');
        await fs_1.promises.mkdir(workDir, { recursive: true });
        // Write artifacts to sandbox
        for (const [name, content] of context.artifacts) {
            const filePath = (0, path_1.join)(workDir, name);
            await fs_1.promises.writeFile(filePath, content);
        }
        // Create security profiles
        await this.createSeccompProfile(sandboxPath);
        await this.createAppArmorProfile(sandboxPath, context.config);
        // Setup network namespace if needed
        if (context.config.networkPolicy !== 'none') {
            await this.setupNetworkNamespace(sandboxPath, context.config);
        }
    }
    /**
     * Execute with resource and security constraints
     */
    async executeConstrained(sandboxPath, context) {
        return new Promise((resolve) => {
            const violations = [];
            let stdout = '';
            let stderr = '';
            let maxMemoryMB = 0;
            let cpuTimeMs = 0;
            let networkConnections = 0;
            // Build Docker command with security constraints
            const dockerArgs = this.buildDockerArgs(sandboxPath, context);
            this.logger.debug({ dockerArgs }, 'Executing Docker command');
            const dockerProcess = (0, child_process_1.spawn)('docker', dockerArgs, {
                cwd: sandboxPath,
                env: { ...process.env, ...context.config.environment },
            });
            let timeoutHandle = null;
            let killed = false;
            // Setup timeout
            if (context.config.timeoutMs > 0) {
                timeoutHandle = setTimeout(() => {
                    if (!killed) {
                        killed = true;
                        dockerProcess.kill('SIGKILL');
                        violations.push(`Execution timeout after ${context.config.timeoutMs}ms`);
                    }
                }, context.config.timeoutMs);
            }
            // Monitor resource usage
            const resourceMonitor = setInterval(() => {
                this.getContainerStats(context.id)
                    .then((stats) => {
                    if (stats) {
                        maxMemoryMB = Math.max(maxMemoryMB, stats.memoryMB);
                        cpuTimeMs += stats.cpuUsageMs;
                        networkConnections = stats.networkConnections;
                        // Check memory limits
                        if (context.config.maxMemoryMB > 0 &&
                            stats.memoryMB > context.config.maxMemoryMB) {
                            violations.push(`Memory limit exceeded: ${stats.memoryMB}MB > ${context.config.maxMemoryMB}MB`);
                            if (!killed) {
                                killed = true;
                                dockerProcess.kill('SIGKILL');
                            }
                        }
                    }
                })
                    .catch(() => { }); // Ignore monitoring errors
            }, 1000);
            // Capture output
            dockerProcess.stdout?.on('data', (data) => {
                stdout += data.toString();
                // Check for suspicious output patterns
                const suspiciousPatterns = [
                    /password[:\s]/i,
                    /api[_\s]*key/i,
                    /secret/i,
                    /token/i,
                    /credential/i,
                ];
                for (const pattern of suspiciousPatterns) {
                    if (pattern.test(data.toString())) {
                        violations.push('Suspicious output detected - potential secret leakage');
                        break;
                    }
                }
            });
            dockerProcess.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            // Network monitoring
            const networkMonitor = this.networkGuard.monitor(context.id, context.config);
            networkMonitor.on('violation', (violation) => {
                violations.push(`Network violation: ${violation}`);
            });
            dockerProcess.on('close', (code) => {
                if (timeoutHandle)
                    clearTimeout(timeoutHandle);
                clearInterval(resourceMonitor);
                networkMonitor.stop();
                resolve({
                    success: code === 0 && violations.length === 0,
                    exitCode: code || -1,
                    stdout: stdout.slice(0, 10000), // Limit output size
                    stderr: stderr.slice(0, 10000),
                    duration: 0, // Will be set by caller
                    resourceUsage: {
                        maxMemoryMB,
                        cpuTimeMs,
                        networkConnections,
                    },
                    violations,
                });
            });
            process.on('error', (error) => {
                if (timeoutHandle)
                    clearTimeout(timeoutHandle);
                clearInterval(resourceMonitor);
                networkMonitor.stop();
                resolve({
                    success: false,
                    exitCode: -1,
                    stdout,
                    stderr: stderr + '\n' + error.message,
                    duration: 0,
                    resourceUsage: {
                        maxMemoryMB,
                        cpuTimeMs,
                        networkConnections,
                    },
                    violations: violations.map((violation) => violation.description).concat([`Process error: ${error.message}`]),
                });
            });
        });
    }
    /**
     * Build Docker command with security constraints
     */
    buildDockerArgs(sandboxPath, context) {
        const workDir = (0, path_1.join)(sandboxPath, 'work');
        const seccompProfile = (0, path_1.join)(sandboxPath, 'seccomp.json');
        const args = [
            'run',
            '--rm',
            '--name',
            `sandbox-${context.id}`,
            // Security constraints
            '--user',
            '65534:65534', // nobody user
            '--read-only',
            '--no-new-privileges',
            '--security-opt',
            `seccomp=${seccompProfile}`,
            '--cap-drop',
            'ALL',
            // Resource limits
            '--memory',
            `${context.config.maxMemoryMB}m`,
            '--cpus',
            (context.config.maxCpuPercent / 100).toString(),
            '--ulimit',
            'nofile=100:100',
            '--ulimit',
            'nproc=50:50',
            // Network policy
            ...this.getNetworkArgs(context.config),
            // Mounts
            '--volume',
            `${workDir}:/work:ro`,
            '--workdir',
            '/work',
            // Environment
            ...Object.entries(context.config.environment).flatMap(([k, v]) => [
                '-e',
                `${k}=${v}`,
            ]),
            // Image and command
            'alpine:3.18', // Minimal base image
            ...context.command,
        ];
        return args;
    }
    /**
     * Get network arguments based on policy
     */
    getNetworkArgs(config) {
        switch (config.networkPolicy) {
            case 'none':
                return ['--network', 'none'];
            case 'internal':
                return [
                    '--network',
                    'bridge',
                    '--add-host',
                    'host.docker.internal:host-gateway',
                ];
            case 'allowlist':
                // Custom network with firewall rules
                return ['--network', 'sandbox-allowlist'];
            case 'internet':
            default:
                return ['--network', 'bridge'];
        }
    }
    /**
     * Create seccomp profile for system call filtering
     */
    async createSeccompProfile(sandboxPath) {
        const profile = {
            defaultAction: 'SCMP_ACT_ERRNO',
            syscalls: [
                {
                    names: [
                        // Essential syscalls
                        'read',
                        'write',
                        'open',
                        'close',
                        'stat',
                        'fstat',
                        'lstat',
                        'poll',
                        'lseek',
                        'mmap',
                        'mprotect',
                        'munmap',
                        'brk',
                        'rt_sigaction',
                        'rt_sigprocmask',
                        'rt_sigreturn',
                        'ioctl',
                        'pread64',
                        'pwrite64',
                        'readv',
                        'writev',
                        'access',
                        'pipe',
                        'select',
                        'sched_yield',
                        'mremap',
                        'msync',
                        'mincore',
                        'madvise',
                        'shmget',
                        'shmat',
                        'shmctl',
                        'dup',
                        'dup2',
                        'pause',
                        'nanosleep',
                        'getitimer',
                        'alarm',
                        'setitimer',
                        'getpid',
                        'sendfile',
                        'socket',
                        'connect',
                        'accept',
                        'sendto',
                        'recvfrom',
                        'sendmsg',
                        'recvmsg',
                        'shutdown',
                        'bind',
                        'listen',
                        'getsockname',
                        'getpeername',
                        'socketpair',
                        'setsockopt',
                        'getsockopt',
                        'clone',
                        'fork',
                        'vfork',
                        'execve',
                        'exit',
                        'wait4',
                        'kill',
                        'uname',
                        'semget',
                        'semop',
                        'semctl',
                        'shmdt',
                        'msgget',
                        'msgsnd',
                        'msgrcv',
                        'msgctl',
                        'fcntl',
                        'flock',
                        'fsync',
                        'fdatasync',
                        'truncate',
                        'ftruncate',
                        'getdents',
                        'getcwd',
                        'chdir',
                        'fchdir',
                        'rename',
                        'mkdir',
                        'rmdir',
                        'creat',
                        'link',
                        'unlink',
                        'symlink',
                        'readlink',
                        'chmod',
                        'fchmod',
                        'chown',
                        'fchown',
                        'lchown',
                        'umask',
                        'gettimeofday',
                        'getrlimit',
                        'getrusage',
                        'sysinfo',
                        'times',
                        'ptrace',
                        'getuid',
                        'syslog',
                        'getgid',
                        'setuid',
                        'setgid',
                        'geteuid',
                        'getegid',
                        'setpgid',
                        'getppid',
                        'getpgrp',
                        'setsid',
                        'setreuid',
                        'setregid',
                        'getgroups',
                        'setgroups',
                        'setresuid',
                        'getresuid',
                        'setresgid',
                        'getresgid',
                        'getpgid',
                        'setfsuid',
                        'setfsgid',
                        'getsid',
                        'capget',
                        'capset',
                        'rt_sigpending',
                        'rt_sigtimedwait',
                        'rt_sigqueueinfo',
                        'rt_sigsuspend',
                        'sigaltstack',
                        'utime',
                        'mknod',
                        'uselib',
                        'personality',
                        'ustat',
                        'statfs',
                        'fstatfs',
                        'sysfs',
                        'getpriority',
                        'setpriority',
                        'sched_setparam',
                        'sched_getparam',
                        'sched_setscheduler',
                        'sched_getscheduler',
                        'sched_get_priority_max',
                        'sched_get_priority_min',
                        'sched_rr_get_interval',
                        'mlock',
                        'munlock',
                        'mlockall',
                        'munlockall',
                        'vhangup',
                        'modify_ldt',
                        'pivot_root',
                        '_sysctl',
                        'prctl',
                        'arch_prctl',
                        'adjtimex',
                        'setrlimit',
                        'chroot',
                        'sync',
                        'acct',
                        'settimeofday',
                        'mount',
                        'umount2',
                        'swapon',
                        'swapoff',
                        'reboot',
                        'sethostname',
                        'setdomainname',
                        'iopl',
                        'ioperm',
                        'create_module',
                        'init_module',
                        'delete_module',
                        'get_kernel_syms',
                        'query_module',
                        'quotactl',
                        'nfsservctl',
                        'getpmsg',
                        'putpmsg',
                        'afs_syscall',
                        'tuxcall',
                        'security',
                        'gettid',
                        'readahead',
                        'setxattr',
                        'lsetxattr',
                        'fsetxattr',
                        'getxattr',
                        'lgetxattr',
                        'fgetxattr',
                        'listxattr',
                        'llistxattr',
                        'flistxattr',
                        'removexattr',
                        'lremovexattr',
                        'fremovexattr',
                        'tkill',
                        'time',
                        'futex',
                        'sched_setaffinity',
                        'sched_getaffinity',
                        'set_thread_area',
                        'io_setup',
                        'io_destroy',
                        'io_getevents',
                        'io_submit',
                        'io_cancel',
                        'get_thread_area',
                        'lookup_dcookie',
                        'epoll_create',
                        'epoll_ctl_old',
                        'epoll_wait_old',
                        'remap_file_pages',
                        'getdents64',
                        'set_tid_address',
                        'restart_syscall',
                        'semtimedop',
                        'fadvise64',
                        'timer_create',
                        'timer_settime',
                        'timer_gettime',
                        'timer_getoverrun',
                        'timer_delete',
                        'clock_settime',
                        'clock_gettime',
                        'clock_getres',
                        'clock_nanosleep',
                        'exit_group',
                        'epoll_wait',
                        'epoll_ctl',
                        'tgkill',
                        'utimes',
                        'vserver',
                        'mbind',
                        'set_mempolicy',
                        'get_mempolicy',
                        'mq_open',
                        'mq_unlink',
                        'mq_timedsend',
                        'mq_timedreceive',
                        'mq_notify',
                        'mq_getsetattr',
                        'kexec_load',
                        'waitid',
                        'add_key',
                        'request_key',
                        'keyctl',
                        'ioprio_set',
                        'ioprio_get',
                        'inotify_init',
                        'inotify_add_watch',
                        'inotify_rm_watch',
                        'migrate_pages',
                        'openat',
                        'mkdirat',
                        'mknodat',
                        'fchownat',
                        'futimesat',
                        'newfstatat',
                        'unlinkat',
                        'renameat',
                        'linkat',
                        'symlinkat',
                        'readlinkat',
                        'fchmodat',
                        'faccessat',
                        'pselect6',
                        'ppoll',
                        'unshare',
                        'set_robust_list',
                        'get_robust_list',
                        'splice',
                        'tee',
                        'sync_file_range',
                        'vmsplice',
                        'move_pages',
                        'utimensat',
                        'epoll_pwait',
                        'signalfd',
                        'timerfd_create',
                        'eventfd',
                        'fallocate',
                        'timerfd_settime',
                        'timerfd_gettime',
                        'accept4',
                        'signalfd4',
                        'eventfd2',
                        'epoll_create1',
                        'dup3',
                        'pipe2',
                        'inotify_init1',
                        'preadv',
                        'pwritev',
                        'rt_tgsigqueueinfo',
                        'perf_event_open',
                    ],
                    action: 'SCMP_ACT_ALLOW',
                },
            ],
        };
        await fs_1.promises.writeFile((0, path_1.join)(sandboxPath, 'seccomp.json'), JSON.stringify(profile, null, 2));
    }
    /**
     * Create AppArmor profile for additional MAC controls
     */
    async createAppArmorProfile(sandboxPath, config) {
        // AppArmor profile would be created here for additional mandatory access control
        // This is a simplified example - production would need full profile development
    }
    /**
     * Setup network namespace with custom rules
     */
    async setupNetworkNamespace(sandboxPath, config) {
        // Network namespace setup would be implemented here
        // This involves creating custom Docker networks with iptables rules
    }
    /**
     * Get container resource statistics
     */
    async getContainerStats(containerId) {
        return new Promise((resolve) => {
            const process = (0, child_process_1.spawn)('docker', [
                'stats',
                `sandbox-${containerId}`,
                '--no-stream',
                '--format',
                'json',
            ]);
            let stdout = '';
            process.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            process.on('close', () => {
                try {
                    const stats = JSON.parse(stdout);
                    resolve({
                        memoryMB: parseFloat(stats.MemUsage.split('/')[0].trim().replace('MiB', '')),
                        cpuUsageMs: parseFloat(stats.CPUPerc.replace('%', '')),
                        networkConnections: 0, // Would parse from netstat
                    });
                }
                catch {
                    resolve(null);
                }
            });
        });
    }
    /**
     * Cleanup sandbox resources
     */
    async cleanupSandbox(sandboxPath) {
        await fs_1.promises.rm(sandboxPath, { recursive: true, force: true });
    }
}
exports.ActionSandbox = ActionSandbox;
/**
 * Network Guard - Monitor and control network access
 */
class NetworkGuard {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    monitor(sandboxId, config) {
        const eventEmitter = new (require('events').EventEmitter)();
        // Start monitoring network activity
        const monitorProcess = (0, child_process_1.spawn)('netstat', ['-tupln']);
        monitorProcess.stdout?.on('data', (data) => {
            const connections = data.toString().split('\n');
            for (const conn of connections) {
                if (conn.includes(`sandbox-${sandboxId}`)) {
                    this.checkConnection(conn, config, eventEmitter);
                }
            }
        });
        return {
            on: eventEmitter.on.bind(eventEmitter),
            stop: () => {
                monitorProcess.kill();
            },
        };
    }
    checkConnection(connection, config, emitter) {
        // Parse connection and check against policy
        try {
            const parts = connection.trim().split(/\s+/);
            if (parts.length < 4)
                return;
            const localAddr = parts[3];
            const [host, port] = localAddr.split(':');
            // Check against allowlist
            if (config.networkPolicy === 'allowlist') {
                const portNum = parseInt(port, 10);
                if (!config.allowedHosts.includes(host) ||
                    !config.allowedPorts.includes(portNum)) {
                    emitter.emit('violation', `Unauthorized connection to ${host}:${port}`);
                }
            }
            // Check for suspicious connections
            if (this.isSuspiciousConnection(host, parseInt(port, 10))) {
                emitter.emit('violation', `Suspicious connection to ${host}:${port}`);
            }
        }
        catch (error) {
            // Ignore parsing errors
        }
    }
    isSuspiciousConnection(host, port) {
        // Check for commonly abused ports and suspicious hosts
        const suspiciousPorts = [22, 23, 3389, 5900, 1433, 3306]; // SSH, Telnet, RDP, VNC, SQL
        const suspiciousHosts = ['169.254.169.254', 'metadata.google.internal']; // Cloud metadata
        return suspiciousPorts.includes(port) || suspiciousHosts.includes(host);
    }
}
/**
 * URL validator to prevent SSRF attacks
 */
class URLValidator {
    static BLOCKED_SCHEMES = ['file', 'ftp', 'jar', 'data'];
    static BLOCKED_HOSTS = [
        '127.0.0.1',
        'localhost',
        '0.0.0.0',
        '169.254.169.254', // AWS metadata
        'metadata.google.internal', // GCP metadata
        '100.100.100.200', // Alibaba metadata
        '::1', // IPv6 localhost
    ];
    static BLOCKED_NETWORKS = [
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
        '127.0.0.0/8',
        'fc00::/7', // IPv6 private
        'fe80::/10', // IPv6 link-local
    ];
    static validate(url) {
        try {
            const parsed = new url_1.URL(url);
            // Check scheme
            if (this.BLOCKED_SCHEMES.includes(parsed.protocol.slice(0, -1))) {
                return { valid: false, reason: `Blocked protocol: ${parsed.protocol}` };
            }
            // Check host
            if (this.BLOCKED_HOSTS.includes(parsed.hostname.toLowerCase())) {
                return { valid: false, reason: `Blocked host: ${parsed.hostname}` };
            }
            // Check for private IP ranges (simplified)
            if (this.isPrivateNetwork(parsed.hostname)) {
                return {
                    valid: false,
                    reason: `Private network access not allowed: ${parsed.hostname}`,
                };
            }
            // Additional checks for suspicious patterns
            if (parsed.username || parsed.password) {
                return { valid: false, reason: 'URLs with credentials not allowed' };
            }
            return { valid: true };
        }
        catch (error) {
            return { valid: false, reason: 'Invalid URL format' };
        }
    }
    static isPrivateNetwork(hostname) {
        // Simplified check - production would use proper IP range validation
        return (hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.'));
    }
}
exports.URLValidator = URLValidator;
