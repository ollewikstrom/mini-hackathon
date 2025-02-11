import { useEffect, useState } from "react";
import { getWebSocketClient, joinGroup } from "./ws/websocketClient";
import Mainscreen from "./pages/Mainscreen";
import { WebPubSubClient } from "@azure/web-pubsub-client";

export default function App() {
  const [client, setClient] = useState<WebPubSubClient | null>(null);
  const [gameId, setGameId] = useState("1234");

  useEffect(() => {
    const setupWebSocket = async () => {
      console.log("Initializing WebSocket...");
      const wsClient = await getWebSocketClient();
      console.log("Got connected client");
      
      setClient(wsClient);
    };
    console.log("only once right")
    setupWebSocket();
  }, []);

  useEffect(() => {
    if (client) {
      joinGroup(gameId);
    }
  }, [client, gameId]);





  const changeGame = () => {
    console.log("change game")
    setGameId("5678");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h2 className="text-2xl text-center">Current game: <br></br><span className="italic">{gameId}</span></h2>
      {client ? <Mainscreen client={client} gameId={gameId} /> : <p>Connecting...</p>}
      <button onClick={changeGame}>Start new game</button>
    </div>
  );
}
