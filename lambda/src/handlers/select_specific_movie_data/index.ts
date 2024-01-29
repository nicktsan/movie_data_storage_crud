import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import Mux from '@mux/mux-node';
import { getMux, getClient, getDocClient, queryItemsByTitle /*getMuxProduct, attachImageToResponse*/ } from "/opt/nodejs/utils";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let mux: Mux | null;
let client: DynamoDBClient | null;
let docClient: DynamoDBDocumentClient | null;
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    console.log("event: ", event)
    if (event.routeKey !== process.env.ROUTE_KEY) {
        throw new Error(`${process.env.ROUTE_KEY} method only accepts ${process.env.ROUTE_KEY} method, you tried: ${event.routeKey}`);
    }
    //initialize a new Mux instance if there is none.
    mux = await getMux(mux);
    //initialize a new DynmoDBClient instance if there is none.
    client = await getClient(client);
    //initialize a new DynamoDBDocumentClient instance if there is none.
    docClient = await getDocClient(client, docClient)
    try {
        //Query a specific movie for playback
        const res = await queryItemsByTitle(docClient, event);
        const resItems = res?.Items;
        let returnMessage;
        if (resItems == undefined) {
            returnMessage = "Received request without a payload."
        }
        else {
            returnMessage = resItems
        }
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: returnMessage
            }),
        };
    } catch (err) {
        let errMessage = "An error occured."
        if (err instanceof Error) {
            errMessage = err.message
        }
        console.warn(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: errMessage,
            }),
        };
    }
};