import axios, { AxiosInstance } from "axios";
import {
  CreateIntentRequest,
  CreateIntentResponse,
  RouteIntentStatus,
  PrivacyLevel,
} from "@xvoid/common";

export interface XVoidClientConfig {
  baseUrl: string;
  timeout?: number;
}

export class XVoidClient {
  private httpClient: AxiosInstance;

  constructor(config: XVoidClientConfig) {
    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Create a new route intent
   */
  async createIntent(params: {
    recipient: string;
    amountSol: number;
    privacyLevel: PrivacyLevel;
    senderPubkey: string;
  }): Promise<CreateIntentResponse> {
    try {
      const request: CreateIntentRequest = {
        recipient: params.recipient,
        amountSol: params.amountSol,
        privacyLevel: params.privacyLevel,
        senderPubkey: params.senderPubkey,
      };

      const response = await this.httpClient.post<CreateIntentResponse>(
        "/intents",
        request
      );

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          error.response.data?.error || `HTTP ${error.response.status}: ${error.response.statusText}`
        );
      } else if (error.request) {
        throw new Error("Network error: No response from coordinator");
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  /**
   * Confirm an intent after deposit transaction
   */
  async confirmIntent(intentId: string, txSignature: string): Promise<void> {
    try {
      await this.httpClient.post(`/intents/${intentId}/confirm`, {
        txSignature,
      });
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          error.response.data?.error || `HTTP ${error.response.status}: ${error.response.statusText}`
        );
      } else if (error.request) {
        throw new Error("Network error: No response from coordinator");
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  /**
   * Get the status of a route intent
   */
  async getStatus(intentId: string): Promise<RouteIntentStatus> {
    try {
      const response = await this.httpClient.get<RouteIntentStatus>(
        `/intents/${intentId}/status`
      );

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          error.response.data?.error || `HTTP ${error.response.status}: ${error.response.statusText}`
        );
      } else if (error.request) {
        throw new Error("Network error: No response from coordinator");
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }
}

