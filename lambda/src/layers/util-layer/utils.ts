import { EventBridgeEvent, APIGatewayProxyEventV2 /*, Context, Callback*/ } from "aws-lambda";
import Mux from '@mux/mux-node';
import { DynamoDBClient, ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { PutCommand, QueryCommand, QueryCommandOutput, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

//An interface for the purposes of returning both a boolean and a Mux.Event for verifyEventAsync

const getMux = async (mux: Mux | null): Promise<Mux | null> => {
    //if no mux instance, instantiate a new mux instance. Otherwise, return the existing mux instance without
    //instantiating a new one.
    if (!mux) {
        mux = new Mux(process.env.MUX_TOKEN_ID!, process.env.MUX_TOKEN_SECRET!);
        // console.log("Instantiated a new Mux object.")
    } else {
        // console.log("Found an existing Mux object instance.")
    }
    return mux;
};

const getClient = async (client: DynamoDBClient | null): Promise<DynamoDBClient | null> => {
    //if no DynamoDBClient instance, instantiate a new DynamoDBClient instance. Otherwise, return the existing 
    //DynamoDBClient instance without instantiating a new one.
    if (!client) {
        client = new DynamoDBClient({});
        console.log("Instantiated a new DynamoDBClient object.")
    }
    return client;
};

const getDocClient = async (client: DynamoDBClient | null, docClient: DynamoDBDocumentClient | null): Promise<DynamoDBDocumentClient | null> => {
    //if no DynamoDBDocumentClient instance, instantiate a new DynamoDBDocumentClient instance. Otherwise, return the existing DynamoDBDocumentClient instance without
    //instantiating a new one.
    if (!docClient) {
        docClient = DynamoDBDocumentClient.from(client!);
        console.log("Instantiated a new DynamoDBDocumentClient object.")
    }
    return docClient;
};

//Ensures the event is a genuine mux event
async function verifyEventAsync(event: EventBridgeEvent<any, any>, mux: Mux | null): Promise<boolean> {
    const payload = event.detail.data;
    const sig = event.detail.muxSignature
    console.log('mux signature ', sig);
    console.log(`Processed event ${payload}`);
    //Initialize a new TEventVerification with default values
    try {
        //Use Mux's constructEvent method to verify the event
        return Mux?.Webhooks.verifyHeader(payload, sig!, process.env.MUX_WEBHOOK_SIGNING_SECRET!);
    } catch (err) {
        if (err instanceof Error) {
            console.error(`Webhook Error: ${err.message}`);
        }
    }
    return false
}

//To insert a record into the data table, we need the following information:
//playback_id
//title of the movie from passthrough
async function putMovieData(/*lineItemdata: Mux.LineItem,*/ eventdata: any, docClient: DynamoDBDocumentClient | null): Promise<Record<string, any> | null> {
    const dataDetails: Record<string, any> = {
        title: eventdata.data.passthrough.toLowerCase().trim(),
        playbackid: eventdata.data.playback_ids[0].id
    }
    const command = new PutCommand({
        TableName: process.env.DYNAMODB_NAME,
        Item: dataDetails,
    });
    try {
        const response = await docClient?.send(command);
        console.log(response);
    } catch (err) {
        throw err
    }
    return dataDetails
}

//Search for specific items owned by the customer. Customer information provided in the event header.
async function queryItemsByTitle(docClient: DynamoDBDocumentClient | null, event: APIGatewayProxyEventV2): Promise<QueryCommandOutput | undefined> {
    console.info('received request get by title:', event);
    const regex2 = (/(%20|\+)/g);
    if (event.headers) {
        const command = new QueryCommand({
            TableName: process.env.DYNAMODB_NAME,
            // Get all items where puchaseType = "Buy" or 
            // (purchaseType contains "rental" and  rentalExpiryDateEpochSeconds < current time in unix seconds)
            //and title contains title parameter
            KeyConditionExpression:
                "title = :Title",
            ExpressionAttributeValues: {
                ':Title': event.pathParameters?.title?.replace(regex2, ' ').toLowerCase()
            },
            ConsistentRead: true,
        });

        const response = await docClient?.send(command);
        // console.log("response?.Items: ", response?.Items);
        return response;
    }
    return undefined;
}

export { getMux, getClient, getDocClient, verifyEventAsync, putMovieData, queryItemsByTitle }