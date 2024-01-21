import { EventBridgeEvent, APIGatewayProxyEventV2 /*, Context, Callback*/ } from "aws-lambda";
import Mux from "mux";
import { DynamoDBClient, ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { PutCommand, QueryCommand, QueryCommandOutput, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

//An interface for the purposes of returning both a boolean and a Mux.Event for verifyEventAsync
interface TEventVerification {
    isVerified: boolean,
    constructedEvent: Mux.Event | undefined
}

const getMux = async (mux: Mux | null): Promise<Mux | null> => {
    //if no mux instance, instantiate a new mux instance. Otherwise, return the existing mux instance without
    //instantiating a new one.
    if (!mux) {
        mux = new Mux(process.env.MUX_SECRET!, {
            apiVersion: '2023-10-16',
        });
        // console.log("Instantiated a new Mux object.")
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
async function verifyEventAsync(event: EventBridgeEvent<any, any>, mux: Mux | null): Promise<TEventVerification> {
    const payload = event.detail.data;
    const sig = event.detail.muxSignature
    console.log('mux signature ', sig);
    console.log(`Processed event ${payload}`);
    //Initialize a new TEventVerification with default values
    const eventVerification: TEventVerification = {
        isVerified: false,
        constructedEvent: undefined
    };
    try {
        //Use Mux's constructEvent method to verify the event
        eventVerification.constructedEvent = mux?.webhooks.constructEvent(payload, sig!, process.env.MUX_SIGNING_SECRET!);
        eventVerification.isVerified = true;
    } catch (err) {
        if (err instanceof Error) {
            console.error(`Webhook Error: ${err.message}`);
        }
    }
    return eventVerification
}

//To insert a record into the data table, we need the following information:
// Customer email <- unique key. Retrievable via event.detail.data, where event is an EventBridgeEvent<any, any> object
// Movie Title <- unique key. Retreivable via lineItemdata.price.metadata or through lineItemdata.price.product lookup.
// Type of purchase (rent or buy) and rent duration if it is a rented movie. Retrievable via lineItemdata.price.nickname
// Time and date of purchase retrievable via event.detail.data.data.object.created. 
// Time and date of rental expiry.
async function fulfillOrder(lineItemdata: Mux.LineItem, event: EventBridgeEvent<any, any>, docClient: DynamoDBDocumentClient | null): Promise<Record<string, any> | null> {
    console.log("lineItemdata.price: ", lineItemdata.price)
    //Get customer email <- unique key
    const eventDetailData = JSON.parse(event.detail.data)
    console.log("event.detail.data: ", eventDetailData)
    const email = eventDetailData.data.object.customer_details.email
    console.log("customer email: ", email)
    //Get movie title
    const title = lineItemdata.price?.metadata.name
    console.log("Movie title: ", title)
    //Get purchase type
    const purchaseType = lineItemdata.price?.nickname
    console.log("purchase type: ", purchaseType)
    //Get time and date of purchase
    const purchaseDateEpochSeconds = eventDetailData.data.object.created
    console.log("purchase date (unix epoch): ", purchaseDateEpochSeconds)
    //Determine if purchase type is rental
    let rentalExpiryDateEpochSeconds: any = 0
    if (purchaseType?.toLowerCase().includes("rental")) {
        //Calculate rental expiry date
        rentalExpiryDateEpochSeconds = purchaseDateEpochSeconds + 60 * 60 * 24 * 3
        console.log("rentalExpiryDateEpochSeconds: ", rentalExpiryDateEpochSeconds)
    }

    const dataDetails: Record<string, any> = {
        customer: email,
        title: title,
        lowercaseTitle: title?.toLowerCase(),
        purchaseType: purchaseType,
        purchaseDateEpochSeconds: purchaseDateEpochSeconds,
        rentalExpiryDateEpochSeconds: rentalExpiryDateEpochSeconds
    }

    const command = new PutCommand({
        TableName: process.env.DYNAMODB_NAME,
        // Item: {
        //     customer: email,
        //     title: title,
        //     purchaseType: purchaseType,
        //     purchaseDateEpochSeconds: purchaseDateEpochSeconds,
        //     rentalExpiryDateEpochSeconds: rentalExpiryDateEpochSeconds
        // },
        Item: dataDetails,
        ConditionExpression: 'attribute_not_exists(customer) AND attribute_not_exists(title)'
    });
    try {
        const response = await docClient?.send(command);
        console.log(response);
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
            console.warn(`Entry containing customer and title already found. PUT operation stopped.`)
            console.warn(err.message)
            return null
        } else {
            throw err
        }
    }
    if (purchaseType?.toLowerCase().includes("rental")) {
        return dataDetails
    }
    return null
}

//Get all items owned by the customer. Customer information provided in the event header.
async function queryAllItems(docClient: DynamoDBDocumentClient | null, event: APIGatewayProxyEventV2): Promise<QueryCommandOutput | undefined> {
    if (event.headers) {
        const header = event.headers
        const command = new QueryCommand({
            TableName: process.env.DYNAMODB_NAME,
            // Get all items where puchaseType = "Buy" or 
            // (purchaseType contains "rental" and  rentalExpiryDateEpochSeconds < current time in unix seconds)
            FilterExpression:
                "purchaseType = :Buy or (contains(purchaseType, :Rental) and rentalExpiryDateEpochSeconds > :CurrentUnixTimeSeconds)",
            KeyConditionExpression:
                "customer = :Customer",
            ExpressionAttributeValues: {
                ":Customer": header.customer,
                ":Buy": "Buy",
                ":Rental": "rental",
                ":CurrentUnixTimeSeconds": Math.floor(Date.now() / 1000)
            },
            ConsistentRead: true,
        });

        const response = await docClient?.send(command);
        // console.log("response?.Items: ", response?.Items);
        return response;
    }
    return undefined;
}

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
async function getMuxProduct(resItems: Record<string, any>[] | undefined, mux: Mux | null): Promise<Mux.Product[] | undefined> {
    let queryCondition: string = ""
    for (let i = 0; i < resItems!.length; i++) {
        if (i != 0) {
            queryCondition = queryCondition + ' OR '
        }
        queryCondition = queryCondition + `name:'` + resItems![i].title.trim() + `'`
    }
    console.log("queryCondtion: ", queryCondition)
    const productsearch = await mux?.products.search({
        query: queryCondition
    })
    // console.log("productsearch?.data: ", productsearch?.data)
    return productsearch?.data
}
//function to attach image data to response body
async function attachImageToResponse(resItems: Record<string, any>[] | undefined, products: Mux.Product[] | undefined): Promise<Record<string, any>[] | undefined> {
    resItems?.forEach(item => {
        const matchingProduct = products?.find((product) => product.name === item.title)
        item.image = matchingProduct?.images[0]
    });
    return resItems
}

export { TEventVerification, getMux, getClient, getDocClient, verifyEventAsync, fulfillOrder, queryAllItems, queryItemsByTitle, getMuxProduct, attachImageToResponse }