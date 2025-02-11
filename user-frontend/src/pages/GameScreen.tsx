import { WebPubSubClient } from "@azure/web-pubsub-client";
import { use, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

type GameScreenProps = {
	client: WebPubSubClient;
};

export default function GameScreen({ client }: GameScreenProps) {
	const { gameId } = useParams();
	const navigate = useNavigate();

	const countdownTime = 5;
	const [countdown, setCountdown] = useState(countdownTime);

	useEffect(() => {
		const handleMessage = (msg: any) => {
			console.log("Received message:", msg.message.data);
			if (msg.message.data.message === "End Game") {
				console.log("Game ended!");
				navigate(`/result/${gameId}`);
			}
		};

		client.on("group-message", handleMessage);

		return () => {
			client.off("group-message", handleMessage);
		};
	}, [client]);

	if (countdown === 0) {
		console.log("Game ended!");
		navigate(`/result/${gameId}`);
	}

	useEffect(() => {
		const interval = setInterval(() => {
			setCountdown((prev) => prev - 1);
		}, 1000);

		return () => {
			clearInterval(interval);
		};
	}, []);

	return (
		<div>
			<p>{countdown}</p>
			<h1>Game Screen</h1>
		</div>
	);
}
