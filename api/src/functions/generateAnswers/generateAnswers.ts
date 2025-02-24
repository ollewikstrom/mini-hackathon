import {
	app,
	HttpRequest,
	HttpResponseInit,
	InvocationContext,
} from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import { AzureOpenAI } from "openai";

// Initialize clients
const cosmosClient = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);
const openAIClient = new AzureOpenAI({
	apiKey: process.env.OPENAI_KEY,
	endpoint: process.env.OPENAI_ENDPOINT,
	deployment: "gpt-35-turbo-16k",
	apiVersion: "2024-05-01-preview",
});

interface Player {
	id: string;
	gameId: string;
	prompt: string;
}

interface JudgeQuestion {
	id: string;
	content: string;
}

interface AIAnswer {
	id: string;
	gameId: string;
	playerId: string;
	playerName: string;
	questionId: string;
	question: string;
	assistantPrompt: string;
	answer: string;
	timestamp: string;
}

export async function generateAnswers(
	request: HttpRequest,
	context: InvocationContext
): Promise<HttpResponseInit> {
	try {
		context.log(`Processing request for URL "${request.url}"`);

		// Get gameId from query parameter
		const gameId = request.query.get("gameId");
		if (!gameId) {
			return {
				status: 400,
				jsonBody: {
					error: "Missing gameId parameter",
				},
			};
		}

		// Get database and container references
		const database = cosmosClient.database("mini-prompt-quiz");
		const gameContainer = database.container("games");
		const playerContainer = database.container("players");

		//The judge exists on the game object. Fetch all the questions from the game object's judge
		const { resource: game } = await gameContainer
			.item(gameId, gameId)
			.read();
		if (!game) {
			return {
				status: 404,
				jsonBody: {
					error: "Game not found",
				},
			};
		}
		const judgeQuestions: JudgeQuestion[] = game.judge.questions;
		if (judgeQuestions.length === 0) {
			return {
				status: 404,
				jsonBody: {
					error: "No judge questions found",
				},
			};
		}

		const playerQuery = `SELECT * FROM c WHERE c.gameId = @gameId`;

		// Fetch players for the specific gameId
		const playerRes = await playerContainer.items
			.query({
				query: playerQuery,
				parameters: [{ name: "@gameId", value: gameId }],
			})
			.fetchAll();

		// If no players are found, return

		if (playerRes.resources.length === 0) {
			return {
				status: 404,
				jsonBody: {
					error: "No players found for this game",
				},
			};
		}

		const players = playerRes.resources;

		// Process each player's assistant with each judge question
		const aiResponses = await Promise.all(
			players.flatMap((player) =>
				judgeQuestions.map(async (judgeQ) => {
					if (!player.prompt) {
						return {
							playerId: player.id,
							questionId: judgeQ.id,
							error: "No prompt found for player",
						};
					}

					// Combine the assistant's prompt with the judge's question
					const combinedPrompt = `You are an AI assistant with the following characteristics: ${player.prompt}\n\nPlease answer this question: ${judgeQ.content}. \n\n Your answer should not be longer than 1 sentence.`;

					const response = await openAIClient.chat.completions.create(
						{
							model: "gpt-35-turbo-16k",
							messages: [
								{
									role: "user",
									content: combinedPrompt,
								},
							],
							temperature: 0.7,
							max_tokens: 800,
						}
					);

					return {
						id: `${gameId}-${player.id}-${judgeQ.id}`,
						gameId: player.gameId,
						playerId: player.id,
						playerName: player.screenName,
						questionId: judgeQ.id,
						question: judgeQ.content,
						assistantPrompt: player.prompt,
						answer: response.choices[0].message.content,
						timestamp: new Date().toISOString(),
					};
				})
			)
		);

		await gameContainer.item(gameId, gameId).patch([
			{
				op: "add",
				path: "/aiResponses",
				value: aiResponses.filter((response) => !("error" in response)),
			},
		]);

		const successfulResponses = aiResponses.filter(
			(response) => !("error" in response)
		);

		return {
			status: 200,
			jsonBody: {
				message:
					"Successfully processed all questions with player assistants",
				gameId: gameId,
				processedCount: successfulResponses.length,
				totalPlayers: players.length,
				totalQuestions: judgeQuestions.length,
				expectedTotal: players.length * judgeQuestions.length,
				responses: aiResponses,
			},
		};
	} catch (error) {
		context.error("Error in generateAnswers:", error);
		return {
			status: 500,
			jsonBody: {
				error: "Internal server error occurred",
				message:
					error instanceof Error ? error.message : "Unknown error",
			},
		};
	}
}

app.http("generateAnswers", {
	methods: ["GET", "POST"],
	authLevel: "anonymous",
	handler: generateAnswers,
});
