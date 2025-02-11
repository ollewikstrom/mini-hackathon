import { useEffect, useState } from "react";
import "./App.css";
import HomeScreen from "./pages/HomeScreen";
import { WebPubSubClient } from "@azure/web-pubsub-client";
import { getWebSocketClient } from "./ws/websocketClient";
import { BrowserRouter, Route, Routes } from "react-router";
import GameScreen from "./pages/GameScreen";
import ResultScreen from "./pages/ResultScreen";

function App() {
	const [client, setClient] = useState<WebPubSubClient | null>(null);

	useEffect(() => {
		const setupWebSocket = async () => {
			console.log("Initializing WebSocket...");
			const wsClient = await getWebSocketClient();
			console.log("Got connected client");

			setClient(wsClient);
		};
		console.log("only once right");
		setupWebSocket();
	}, []);

	return (
		<BrowserRouter>
			<Routes>
				<Route
					path=":gameId"
					element={
						client ? <HomeScreen client={client} /> : <p>Loading</p>
					}
				/>
				<Route
					path="/game/:gameId"
					element={
						client ? <GameScreen client={client} /> : <p>Loading</p>
					}
				/>
				<Route
					path="/result/:gameId"
					element={client ? <ResultScreen /> : <p>Loading...</p>}
				/>
			</Routes>
		</BrowserRouter>
	);
}

export default App;
