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
//id
//title of the
async function putMovieData(/*lineItemdata: Mux.LineItem,*/ eventdata: any, docClient: DynamoDBDocumentClient | null): Promise<Record<string, any> | null> {
    const dataDetails: Record<string, any> = {
        id: eventdata.data.id,
        title: eventdata.data.passthrough.toLowerCase().trim()
        // asset: eventdata.data
    }

    const command = new PutCommand({
        TableName: process.env.DYNAMODB_NAME,
        Item: dataDetails,
        // ConditionExpression: 'attribute_not_exists(customer) AND attribute_not_exists(title)'
    });
    try {
        const response = await docClient?.send(command);
        console.log(response);
    } catch (err) {
        // if (err instanceof ConditionalCheckFailedException) {
        //     console.warn(`Entry containing customer and title already found. PUT operation stopped.`)
        //     console.warn(err.message)
        //     return null
        // } else {
        //     throw err
        // }
        throw err
    }
    return dataDetails
}

//Get all items owned by the customer. Customer information provided in the event header.
// async function queryAllItems(docClient: DynamoDBDocumentClient | null, event: APIGatewayProxyEventV2): Promise<QueryCommandOutput | undefined> {
//     if (event.headers) {
//         const header = event.headers
//         const command = new QueryCommand({
//             TableName: process.env.DYNAMODB_NAME,
//             // Get all items where puchaseType = "Buy" or 
//             // (purchaseType contains "rental" and  rentalExpiryDateEpochSeconds < current time in unix seconds)
//             FilterExpression:
//                 "purchaseType = :Buy or (contains(purchaseType, :Rental) and rentalExpiryDateEpochSeconds > :CurrentUnixTimeSeconds)",
//             KeyConditionExpression:
//                 "customer = :Customer",
//             ExpressionAttributeValues: {
//                 ":Customer": header.customer,
//                 ":Buy": "Buy",
//                 ":Rental": "rental",
//                 ":CurrentUnixTimeSeconds": Math.floor(Date.now() / 1000)
//             },
//             ConsistentRead: true,
//         });

//         const response = await docClient?.send(command);
//         // console.log("response?.Items: ", response?.Items);
//         return response;
//     }
//     return undefined;
// }

//Search for specific items owned by the customer. Customer information provided in the event header.
async function queryItemsByTitle(docClient: DynamoDBDocumentClient | null, event: APIGatewayProxyEventV2): Promise<QueryCommandOutput | undefined> {
    console.info('received request get by title:', event);
    const regex2 = (/(%20|\+)/g);
    if (event.headers) {
        const header = event.headers
        const command = new QueryCommand({
            TableName: process.env.DYNAMODB_NAME,
            // Get all items where puchaseType = "Buy" or 
            // (purchaseType contains "rental" and  rentalExpiryDateEpochSeconds < current time in unix seconds)
            //and lowercaseTitle contains title parameter
            FilterExpression:
                "contains(lowercaseTitle, :Title) and (purchaseType = :Buy or (contains(purchaseType, :Rental) and rentalExpiryDateEpochSeconds > :CurrentUnixTimeSeconds))",
            KeyConditionExpression:
                "customer = :Customer",
            ExpressionAttributeValues: {
                ":Customer": header.customer,
                ":Buy": "Buy",
                ":Rental": "rental",
                ":CurrentUnixTimeSeconds": Math.floor(Date.now() / 1000),
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

//Function to get product information from mux
// async function getMuxProduct(resItems: Record<string, any>[] | undefined, mux: Mux | null): Promise<Mux.Product[] | undefined> {
//     let queryCondition: string = ""
//     for (let i = 0; i < resItems!.length; i++) {
//         if (i != 0) {
//             queryCondition = queryCondition + ' OR '
//         }
//         queryCondition = queryCondition + `name:'` + resItems![i].title.trim() + `'`
//     }
//     console.log("queryCondtion: ", queryCondition)
//     const productsearch = await mux?.products.search({
//         query: queryCondition
//     })
//     // console.log("productsearch?.data: ", productsearch?.data)
//     return productsearch?.data
// }
//function to attach image data to response body
// async function attachImageToResponse(resItems: Record<string, any>[] | undefined, products: Mux.Product[] | undefined): Promise<Record<string, any>[] | undefined> {
//     resItems?.forEach(item => {
//         const matchingProduct = products?.find((product) => product.name === item.title)
//         item.image = matchingProduct?.images[0]
//     });
//     return resItems
// }

export { getMux, getClient, getDocClient, verifyEventAsync, putMovieData, /*queryAllItems,*/ queryItemsByTitle /*getMuxProduct, attachImageToResponse */ }