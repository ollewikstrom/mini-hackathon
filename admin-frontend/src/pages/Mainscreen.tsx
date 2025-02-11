import { useEffect, useState } from "react";
import { WebPubSubClient } from "@azure/web-pubsub-client";
import { createAvatar } from "@dicebear/core";
import { bottts } from "@dicebear/collection";

type Player = {
	id: string;
	screenName: string;
	email: string;
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

export default function MainScreen({ client, gameId }: MainScreenProps) {
	const [players, setPlayers] = useState<Player[]>([]);

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
							seed: message.player.email,
						}).toDataUri(),
					},
				]);
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

	return (
		<div className="flex flex-col items-center h-full gap-4">
			<h1 className="text-4xl">Waiting Room</h1>
			<h2 className="text-2xl">Players:</h2>
			<ul className="flex gap-4 flex-wrap">
				{players.map((player) => (
					<li
						key={player.id}
						className="flex items-center gap-4 flex-col"
					>
						<div className="avatar">
							<div className="ring-primary ring-offset-base-100 w-24 rounded-full ring ring-offset-2">
								<img src={player.avatar} />
							</div>
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
