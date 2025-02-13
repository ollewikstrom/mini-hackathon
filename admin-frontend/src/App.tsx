import { useEffect, useState } from "react";
import { getWebSocketClient } from "./ws/websocketClient";
import MainScreen from "./pages/MainScreen";
import { WebPubSubClient } from "@azure/web-pubsub-client";
import { Route, Routes, useLocation, useNavigate } from "react-router";
import ResultScreen from "./pages/ResultScreen";

export default function App() {
	const [client, setClient] = useState<WebPubSubClient | null>(null);

	//Get gameId from the route in the url
	const location = useLocation();
	const { pathname } = location;

	// Remove the starting / from the pathname
	const urlGameId = pathname.slice(1);
	const [gameId, setGameId] = useState(urlGameId);
	const navigate = useNavigate();

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

	const changeGame = async () => {
		console.log("change game");
		await fetch(`${process.env.API_URL}/createNewGame`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		})
			.then((response) => response.json())
			.then((data) => {
				setGameId(data.id);
				navigate(`/${data.id}`);
			})
			.catch((error) => {
				alert(`Error: ${error}`);
			});
	};

	return (
		<>
			<Routes>
				<Route
					path="/:gameId"
					element={
						client ? (
							<MainScreen client={client} gameId={gameId} />
						) : (
							<p>Connecting...</p>
						)
					}
				/>
				<Route
					path="/"
					element={
						<button onClick={changeGame}>Start new game</button>
					}
				/>
				<Route element={<ResultScreen />} path="/result/:gameId" />
			</Routes>
		</>
	);
}
