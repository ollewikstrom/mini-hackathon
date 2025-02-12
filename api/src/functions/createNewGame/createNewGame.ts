import { CosmosClient } from "@azure/cosmos";
import {
	app,
	HttpRequest,
	HttpResponseInit,
	InvocationContext,
} from "@azure/functions";

import { v4 as uuid } from "uuid";

export async function createNewGame(
	request: HttpRequest,
	context: InvocationContext
): Promise<HttpResponseInit> {
	const client = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);
	const database = client.database("mini-hackathon");
	const gameContainer = database.container("games");
	const judgeContainer = database.container("judges");

	const judge = await judgeContainer.items
		.query({
			query: "SELECT * FROM c WHERE c.id = 'coffee-judge'",
		})
		.fetchAll();

	console.log("judge", judge);
	const gameId = uuid();

	const game = {
		id: gameId,
		status: "waiting",
		players: [],
		judge: judge.resources[0],
	};

	const createdGame = await gameContainer.items.upsert(game);

	if (!createdGame) {
		return { status: 500, body: "Failed to create game" };
	}

	return { status: 200, body: JSON.stringify(game) };
}

app.http("createNewGame", {
	methods: ["GET", "POST"],
	authLevel: "anonymous",
	handler: createNewGame,
});
