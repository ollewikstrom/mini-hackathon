import { useEffect, useState } from "react";
import { WebPubSubClient } from "@azure/web-pubsub-client";



export default function MainScreen() {
  const [players, setPlayers] = useState([]);
  const [client, setClient] = useState<any | null>(null);
  const [gameId, setGameId] = useState("1234");

  console.log(import.meta.env.VITE_WEB_PUBSUB_CLIENT_ACCESS_URL);

  useEffect(() => {
    
    const connect = async () => {
        const res = await fetch("http://localhost:7071/api/negotiate?userId=server");
        const { url, accessToken } = await res.json();
        const ws = new WebSocket(url)
        ws.onopen = () => console.log("connected");
        ws.onmessage = (msg) => console.log(msg.data);

    }
    connect();

    return () => {
      if (client) {
        client.stop();
      }
    };
  }, []);


  const sendMessage = async () => {
    if (client) {
      await client.sendToGroup(gameId, { message: "Hello, players!" }, "text");
    }
  }

  

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Waiting Room</h1>
      <h2>Players:</h2>
      <button onClick={() => sendMessage}>Click</button>
     
    </div>
  );
}
