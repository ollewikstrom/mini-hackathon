// websocketClient.ts
import { WebPubSubClient } from "@azure/web-pubsub-client";

let clientPromise: Promise<WebPubSubClient> | null = null; // Store the promise globally
let client: WebPubSubClient | null = null;
let isConnected = false;

export const getWebSocketClient = async () => {
  if (client) return client; // Return existing instance if it exists
  if (clientPromise) return clientPromise; // Return the pending promise to avoid duplicate fetch calls

  clientPromise = fetch(`${import.meta.env.VITE_API_URL}/negotiateAdmin?userId=admin`)
    .then((res) => res.json())
    .then(({ url }) => {
      client = new WebPubSubClient(url);

      return new Promise<WebPubSubClient>((resolve) => {
        client!.on("connected", () => {
          console.log("WebSocket connected");
          isConnected = true;
          resolve(client!); // Only resolve when connected
        });

        client!.start(); // Start WebSocket connection
      });
    });

  return clientPromise;
};

export const joinGroup = async (gameId: string) => {
  const wsClient = await getWebSocketClient(); // Ensure we wait for a connected WebSocket
  if (isConnected) {
    await wsClient.joinGroup(gameId);
  }
};
