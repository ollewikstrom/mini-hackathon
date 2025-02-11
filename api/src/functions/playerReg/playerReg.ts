import { CosmosClient } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { WebPubSubServiceClient } from "@azure/web-pubsub";


type PlayerRegRequest = {
    gameId: string;
    screenName: string;
    email: string;
};

type Player = {
    id: string;
    gameId: string;
    screenName: string;
    email: string;
};

export async function playerReg(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {

    if (request.method !== 'POST') {
        return { status: 405, body: 'Method Not Allowed' };
    }

    const { screenName, email, gameId }: PlayerRegRequest = await request.json() as PlayerRegRequest; 

    if (!screenName || !email) {
        return { status: 400, body: 'Screen name and email are required' };
    }
    context.log("Cosmos DB connection string: ", process.env.COSMOSDB_CONNECTION_STRING);

    const client = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);
    const database = client.database('real-time');
    const container = database.container('players');

    const player: Player = { id: email, screenName, email, gameId};

    const createdPlayer = await container.items.upsert(player);

    if (!createdPlayer) {
        return { status: 500, body: 'Failed to create player' };
    }

    await sendWebPubSubMessage(player, context);


    return { status: 201, body: JSON.stringify({"message": "Successfully created player", createdPlayer: createdPlayer.resource}) };
};

async function sendWebPubSubMessage(player: Player, context: InvocationContext) {
    try {
        if (!process.env.WEB_PUBSUB_CONNECTION_STRING) {
            throw new Error("WEB_PUBSUB_CONNECTION_STRING is not set");
        }

        const serviceClient = new WebPubSubServiceClient(process.env.WEB_PUBSUB_CONNECTION_STRING, "miniHackathon");
        const groupClient = serviceClient.group(player.gameId);
        await groupClient.sendToAll({message: "A new player joined the game", player});

        context.log("Web PubSub message sent successfully");
    } catch (error) {
        context.error("Failed to send Web PubSub message:", error);
    }
}

app.http('playerReg', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: playerReg
});
