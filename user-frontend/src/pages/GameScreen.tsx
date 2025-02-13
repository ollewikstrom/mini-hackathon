import { WebPubSubClient } from "@azure/web-pubsub-client";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

type GameScreenProps = {
	client: WebPubSubClient;
};

export default function GameScreen({ client }: GameScreenProps) {
	const { gameId } = useParams();
	const navigate = useNavigate();

	const intervalRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined
	);

	const countdownTime = 15;
	const [countdown, setCountdown] = useState(countdownTime);
	const theme = "Coffee";
	const [submitted, setSubmitted] = useState(false);
	const [prompt, setPrompt] = useState("");

	const formatTime = (timeInSeconds: number) => {
		const minutes = Math.floor(timeInSeconds / 60);
		const seconds = timeInSeconds % 60;
		return `${minutes.toString().padStart(2, "0")}:${seconds
			.toString()
			.padStart(2, "0")}`;
	};

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

	useEffect(() => {
		const interval = setInterval(() => {
			setCountdown((prev) => prev - 1);
		}, 1000);

		intervalRef.current = interval;

		return () => {
			clearInterval(interval);
		};
	}, []);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitted(true);
		submitPrompt();
	};

	const submitPrompt = async () => {
		const userId = localStorage.getItem("userId");
		const response = await fetch(`${process.env.API_URL}/submitPrompt`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				gameId,
				userId,
				prompt,
			}),
		});

		if (response.ok) {
			console.log("Prompt submitted!");
		} else {
			console.error("Failed to submit prompt");
		}
	};

	if (countdown === 0) {
		console.log("Game ended!");
		if (prompt === "") setPrompt(() => "No prompt submitted");
		clearInterval(intervalRef.current);
		submitPrompt();
		navigate(`/result/${gameId}`);
	}

	return (
		<div>
			<p>{formatTime(countdown)}</p>
			{submitted ? (
				<p>Submitted!</p>
			) : (
				<>
					<h1>Game Screen</h1>
					<h2>Your theme is: {theme}</h2>
					<form onSubmit={handleSubmit}>
						<textarea
							name="prompt"
							id="prompt"
							placeholder="Write your prompt here..."
							onChange={(e) => setPrompt(e.target.value)}
						></textarea>
						<button type="submit">Submit</button>
					</form>
				</>
			)}
		</div>
	);
}
