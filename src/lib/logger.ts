/**
 * Production-safe logger utility
 * Automatically disables console logs in production builds
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

// No-op functions for production
const noop = () => { };

/**
 * Logger that only outputs in development mode
 * In production, all console methods are no-ops
 */
export const logger = {
    log: isDevelopment ? console.log.bind(console) : noop,
    info: isDevelopment ? console.info.bind(console) : noop,
    warn: isDevelopment ? console.warn.bind(console) : noop,
    error: isDevelopment ? console.error.bind(console) : noop,
    debug: isDevelopment ? console.debug.bind(console) : noop,
    table: isDevelopment ? console.table.bind(console) : noop,
    group: isDevelopment ? console.group.bind(console) : noop,
    groupEnd: isDevelopment ? console.groupEnd.bind(console) : noop,
    groupCollapsed: isDevelopment ? console.groupCollapsed.bind(console) : noop,
    trace: isDevelopment ? console.trace.bind(console) : noop,
};

/**
 * Check if we're in development mode
 */
export const isDevMode = () => isDevelopment;

/**
 * Override global console in production (optional - use with caution)
 * This will completely disable all console methods globally
 */
export const disableConsoleInProduction = () => {
    if (!isDevelopment) {
        const methods = ['log', 'info', 'warn', 'error', 'debug', 'table', 'group', 'groupEnd', 'groupCollapsed', 'trace'];
        methods.forEach(method => {
            (console as any)[method] = noop;
        });
    }
};

export default logger;
