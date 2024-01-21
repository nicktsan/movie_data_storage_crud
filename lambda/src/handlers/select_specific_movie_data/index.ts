import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import Mux from "mux";
import { getMux, getClient, getDocClient, queryItemsByTitle, getMuxProduct, attachImageToResponse } from "/opt/nodejs/utils";
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

    mux = await getMux(mux);
    client = await getClient(client);
    docClient = await getDocClient(client, docClient)
    try {
        //Query all items owned by the customer
        const res = await queryItemsByTitle(docClient, event);
        let resItems = res?.Items;
        let products: Mux.Product[] | undefined;
        let edittedResItems: Record<string, any> | undefined
        if (resItems!.length > 0) {
            //get product information of movies owned by customer
            products = await getMuxProduct(resItems, mux);
            //attach image information to response body
            edittedResItems = await attachImageToResponse(resItems, products)
        }
        let returnMessage;
        if (resItems == undefined) {
            returnMessage = "Received request without a payload."
        }
        else {
            returnMessage = edittedResItems
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