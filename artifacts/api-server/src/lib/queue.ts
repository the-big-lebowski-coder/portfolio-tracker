type Task<T> = () => Promise<T>;

export class ConcurrencyQueue {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  run<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const attempt = () => {
        this.running++;
        task()
          .then(resolve, reject)
          .finally(() => {
            this.running--;
            if (this.queue.length > 0) {
              const next = this.queue.shift()!;
              next();
            }
          });
      };

      if (this.running < this.limit) {
        attempt();
      } else {
        this.queue.push(attempt);
      }
    });
  }
}

export const finnhubQueue = new ConcurrencyQueue(10);
