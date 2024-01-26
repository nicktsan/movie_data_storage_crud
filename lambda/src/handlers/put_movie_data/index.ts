import { EventBridgeEvent, EventBridgeHandler } from "aws-lambda";
import Mux from '@mux/mux-node';
import { getMux, getClient, getDocClient, verifyEventAsync, putMovieData } from "/opt/nodejs/utils";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";


let mux: Mux | null;
let client: DynamoDBClient | null;
let docClient: DynamoDBDocumentClient | null;

const handler: EventBridgeHandler<any, any, any> = async (event: EventBridgeEvent<any, any>): Promise<void> => {
    //initialize a new Mux instance if there is none.
    mux = await getMux(mux);
    client = await getClient(client);
    docClient = await getDocClient(client, docClient)
    console.log("EventbridgeEvent:")
    console.log(event)
    const eventVerification = await verifyEventAsync(event, mux);
    if (!mux) {
        console.info("mux is null. Nothing processed.")
    } else if (!eventVerification) {
        console.log("Failed eventbridge event verified")
    } else {
        console.log("Successful eventbridge event verified")
        // Handle the event

        // Retrieve the session. If you require line items in the response, you may include them by expanding line_items.
        const eventdata = JSON.parse(event.detail.data)
        // const myConstructedEventObject: any = eventVerification.constructedEvent?.data.object
        // const myConstructedEventObjectId = myConstructedEventObject.id

        // console.log("myConstructedEventObjectId", myConstructedEventObjectId)
        // const sessionWithLineItems = await mux?.checkout.sessions.retrieve(
        //     myConstructedEventObjectId,
        //     {
        //         expand
        //             : ['line_items'],
        //     }
        // );
        // const lineItems = sessionWithLineItems.line_items;
        // console.log("lineItems?.data[0].price", lineItems?.data[0].price)
        // lineItems?.data.forEach(lineItemdata => {
        // Fulfill the purchase...
        console.log("eventdata.type: ", eventdata.type)
        if (eventdata.type === "video.asset.ready") {
            await putMovieData(/*lineItems!.data[0], mux*/eventdata, docClient);
        }

        // });

    }
}

export { handler }