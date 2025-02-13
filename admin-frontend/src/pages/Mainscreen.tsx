import { useEffect, useState } from "react";
import { WebPubSubClient } from "@azure/web-pubsub-client";
import { createAvatar } from "@dicebear/core";
import { bottts } from "@dicebear/collection";
import { joinGroup } from "../ws/websocketClient";
import { useNavigate } from "react-router";

type Player = {
	id: string;
	screenName: string;
	email: string;
	prompt?: string;
	gameId: string;
	avatar: string;
};

type PlayerJoinedMessage = {
	message: string;
	player: Player;
};

type MainScreenProps = {
	client: WebPubSubClient;
	gameId: string;
};

export const judgeAvatar = createAvatar(bottts, {
	size: 128,
	seed: "veryGodJudge",
}).toDataUri();

export default function MainScreen({ client, gameId }: MainScreenProps) {
	const [players, setPlayers] = useState<Player[]>([]);

	const [theme, setTheme] = useState("Coffee");

	const navigation = useNavigate();

	console.log("Game id", gameId);

	useEffect(() => {
		const handleMessage = (msg: any) => {
			console.log("Received message:", msg.message.data);
			if (msg.message.data.message === "A new player joined the game") {
				const message = msg.message.data as PlayerJoinedMessage;
				setPlayers((prevPlayers) => [
					...prevPlayers,
					{
						...message.player,
						avatar: createAvatar(bottts, {
							size: 128,
							seed: message.player.id,
						}).toDataUri(),
					},
				]);
			}
			if (
				msg.message.data.message === "A player has submitted a prompt"
			) {
				console.log("Player submitted a prompt");
				const message = msg.message.data as PlayerJoinedMessage;
				setPlayers((prevPlayers) =>
					prevPlayers.map((player) =>
						player.id === message.player.id
							? { ...player, prompt: message.player.prompt }
							: player
					)
				);
				//Check if all players have submitted
				const allPlayersSubmitted = players.every(
					(player) => player.prompt
				);
				if (allPlayersSubmitted) {
					client.sendToGroup(gameId, { message: "End Game" }, "json");
				}
				//Navigate to the next screen and pass the players
				navigation(`/result/${gameId}`);
			}
		};

		client.on("group-message", handleMessage);

		return () => {
			client.off("group-message", handleMessage);
		};
	}, [client]);

	const sendStartMessage = () => {
		client.sendToGroup(gameId, { message: "Start Game" }, "json");
	};
	const sendEndMessage = () => {
		client.sendToGroup(gameId, { message: "End Game" }, "json");
	};

	useEffect(() => {
		if (client) {
			joinGroup(gameId);
		}
	}, [client, gameId]);

	useEffect(() => {
		const fetchGame = async () => {
			const response = await fetch(
				`${process.env.API_URL}/getGame?gameId=${gameId}`
			);
			const data = await response.json();
			setPlayers(
				data.players.map((player: any) => ({
					...player,
					avatar: createAvatar(bottts, {
						size: 128,
						seed: player.id,
					}).toDataUri(),
				}))
			);

			setTheme(data.theme);
		};

		fetchGame();
	}, [gameId]);

	return (
		<div className="flex flex-col items-center h-full gap-4">
			<h1 className="text-4xl">Prompty Crush Saga</h1>
			<h2 className="flex flex-col items-center">
				The theme is: <span className="italic bold">{theme}</span>
			</h2>
			<div className="avatar flex flex-col items-center gap-4">
				<div className="ring-primary ring-offset-base-100 w-32 rounded-full ring ring-offset-2">
					<img src={judgeAvatar} />
				</div>
				<p className="text-xl font-semibold">Mr Judge</p>
			</div>
			<h2 className="text-2xl">Players:</h2>
			<ul className="flex gap-4 flex-wrap">
				{players.map((player) => (
					<li
						key={player.id}
						className="flex items-center gap-4 flex-col"
					>
						<div className="flex gap-2">
							<div className="avatar">
								<div className="ring-primary ring-offset-base-100 w-24 rounded-full ring ring-offset-2">
									<img src={player.avatar} />
								</div>
							</div>
							{player.prompt && (
								<div className="chat chat-start">
									<div className="chat-bubble">
										I submitted!
									</div>
								</div>
							)}
						</div>
						<p className="text-2xl">{player.screenName}</p>
					</li>
				))}
			</ul>
			<button onClick={sendStartMessage}>Start game</button>
			<button onClick={sendEndMessage}>End game</button>
		</div>
	);
}
