import axios, { AxiosInstance } from 'axios';
import { PrivacyLevel, TaskStatus } from '@xvoid/common';
import { z } from 'zod';

export interface XVoidClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  apiKey?: string;
}

export interface SendRequest {
  recipient: string;
  amount: number;
  privacy: PrivacyLevel;
}

const submitResponseSchema = z.object({
  trackingId: z.string()
});

const statusResponseSchema = z.object({
  trackingId: z.string(),
  totalFragments: z.number(),
  completed: z.number(),
  pending: z.number(),
  failed: z.number()
});

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class XVoidClient {
  private readonly http: AxiosInstance;
  private readonly retries: number;
  private readonly retryDelay: number;

  constructor(private readonly options: XVoidClientOptions) {
    if (!options.baseUrl) {
      throw new Error('XVoidClient requires a baseUrl');
    }

    this.http = axios.create({
      baseURL: options.baseUrl.replace(/\/$/, ''),
      timeout: options.timeoutMs ?? 10_000,
      headers: options.apiKey ? { 'x-api-key': options.apiKey } : undefined
    });

    this.retries = options.retries ?? 3;
    this.retryDelay = options.retryDelayMs ?? 500;
  }

  async send(request: SendRequest): Promise<{ trackingId: string }> {
    const bodySchema = z.object({
      recipient: z.string().min(32),
      amount: z.number().positive(),
      privacy: z.enum(['low', 'medium', 'high'])
    });
    const payload = bodySchema.parse(request);

    const response = await this.requestWithRetry(() =>
      this.http.post('/submit', {
        recipient: payload.recipient,
        amount: payload.amount,
        privacyLevel: payload.privacy
      })
    );

    return submitResponseSchema.parse(response.data);
  }

  async getStatus(trackingId: string): Promise<TaskStatus> {
    if (!trackingId) {
      throw new Error('trackingId is required');
    }

    const response = await this.requestWithRetry(() =>
      this.http.get(`/tasks/${trackingId}/status`)
    );

    return statusResponseSchema.parse(response.data);
  }

  private async requestWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let delay = this.retryDelay;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await operation();
      } catch (error) {
        attempt += 1;
        if (attempt > this.retries) {
          throw error;
        }
        await sleep(delay);
        delay *= 2;
      }
    }
  }
}

