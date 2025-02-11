// websocketClient.ts
import { WebPubSubClient } from "@azure/web-pubsub-client";

let clientPromise: Promise<WebPubSubClient> | null = null; // Store the promise globally
let client: WebPubSubClient | null = null;
let isConnected = false;

export const getWebSocketClient = async () => {
  if (client) return client; // Return existing instance if it exists
  if (clientPromise) return clientPromise; // Return the pending promise to avoid duplicate fetch calls

  clientPromise = fetch(`${import.meta.env.VITE_API_URL}/negotiateUser?userId=olle&groupId=1234`)
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
