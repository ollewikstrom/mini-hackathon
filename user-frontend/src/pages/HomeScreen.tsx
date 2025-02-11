import { WebPubSubClient } from "@azure/web-pubsub-client";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

type HomeScreenProps = {
	client: WebPubSubClient;
};

export default function HomeScreen({ client }: HomeScreenProps) {
	// Get params from URL
	const { gameId } = useParams();
	console.log("gameId", gameId);

	const navigate = useNavigate();

	const [submitted, setSubmitted] = useState(false);
	const coundownTime = 6;

	const [gameOver, setGameOver] = useState(false);

	const [countdown, setCountdown] = useState(coundownTime);

	useEffect(() => {
		const handleMessage = (msg: any) => {
			console.log("Received message:", msg.message.data);
			if (msg.message.data.message === "Start Game") {
				console.log("Game started!");
				//Start counddown
				const interval = setInterval(() => {
					setCountdown((prev) => prev - 1);
				}, 1000);
				setTimeout(() => {
					clearInterval(interval);
					console.log("Game has started!");
					navigate(`/game/${gameId}`);
				}, coundownTime * 1000);
			}
		};

		client.on("group-message", handleMessage);

		return () => {
			client.off("group-message", handleMessage);
		};
	}, [client]);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const screenName = formData.get("screenName") as string;
		const email = formData.get("email") as string;

		// Send the data to the backend
		fetch(`${import.meta.env.VITE_API_URL}/playerReg`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				gameId,
				screenName,
				email,
			}),
		})
			.then((response) => response.json())
			.then((data) => {
				console.log("Success:", data);
				setSubmitted(true);
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	};

	return (
		<div className="min-h-screen flex flex-col items-center justify-center gap-4">
			<h1 className="text-4xl">Welcome to the Game</h1>
			{submitted ? (
				<>
					{countdown !== coundownTime ? (
						<p className="text-2xl">
							Game starting in {countdown}...
						</p>
					) : (
						<p className="text-2xl">
							Waiting for the game to start...
						</p>
					)}
				</>
			) : (
				<>
					<p className="text-2xl">
						Please enter your screen name and email to join
					</p>
					<form
						onSubmit={handleSubmit}
						className="flex flex-col gap-4"
					>
						<input
							type="text"
							name="screenName"
							placeholder="Screen Name"
							className="p-2"
						/>
						<input
							type="email"
							name="email"
							placeholder="Email"
							className="p-2"
						/>
						<button
							type="submit"
							className="bg-primary text-white p-2 rounded-md"
						>
							Join Game
						</button>
					</form>
				</>
			)}
		</div>
	);
}
