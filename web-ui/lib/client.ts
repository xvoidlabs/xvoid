import { XVoidClient } from '@xvoid/sdk';

let cachedClient: XVoidClient | null = null;

export const getClient = (): XVoidClient => {
  if (cachedClient) {
    return cachedClient;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_COORDINATOR_URL ?? 'http://localhost:4000';

  cachedClient = new XVoidClient({
    baseUrl
  });

  return cachedClient;
};

