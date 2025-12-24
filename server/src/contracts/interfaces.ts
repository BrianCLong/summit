export interface ILogger {
  info(message: string, meta?: Record<string, any>): void;
  error(message: string, error?: Error, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}

export interface IConfig {
  get<T>(key: string): T | undefined;
  getOrThrow<T>(key: string): T;
  has(key: string): boolean;
}

export interface IEventBus {
  publish<T>(topic: string, event: T): Promise<void>;
  subscribe<T>(topic: string, handler: (event: T) => Promise<void>): void;
}

export interface IUserStore<TUser> {
  findById(id: string): Promise<TUser | null>;
  findByEmail(email: string): Promise<TUser | null>;
  create(user: TUser): Promise<TUser>;
  update(id: string, user: Partial<TUser>): Promise<TUser>;
}
