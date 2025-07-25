// src/utils/circuitBreaker.ts

/**
 * Generic async Circuit Breaker implementation (TypeScript)
 */
type State = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
    private failures = 0;
    private state: State = 'CLOSED';
    private lastFailureTime = 0;

    constructor(
        private maxFailures = 5,           // Failures before opening the circuit
        private openTimeout = 30000,       // Time to wait before half-open (ms)
        private callTimeout = 5000         // Max time for a single call (ms)
    ) { }

    getStatus(): State {
        // Expose current state (for logging/monitoring)
        return this.state;
    }

    async exec<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === 'OPEN') {
            // Check if it's time to allow a trial request (half-open)
            if (Date.now() - this.lastFailureTime > this.openTimeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('CircuitBreaker: OPEN (external API temporarily unavailable)');
            }
        }

        try {
            // Wrap in a call timeout for hung APIs
            const result = await this.timeoutPromise(fn(), this.callTimeout);

            // Success: reset failures and close circuit if half-open
            this.failures = 0;
            this.state = 'CLOSED';
            return result;
        } catch (err) {
            this.failures++;
            this.lastFailureTime = Date.now();

            if (this.state === 'HALF_OPEN' || this.failures >= this.maxFailures) {
                this.state = 'OPEN';
            }

            throw err;
        }
    }

    /**
     * Wraps a promise in a timeout.
     */
    private timeoutPromise<T>(p: Promise<T>, ms: number): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('CircuitBreaker: call timeout')), ms);
            p.then(res => {
                clearTimeout(timer);
                resolve(res);
            }).catch(err => {
                clearTimeout(timer);
                reject(err);
            });
        });
    }
}