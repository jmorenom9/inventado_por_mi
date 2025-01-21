import { MongoClient } from "mongodb";
import { ReservasModel, RestaurantesModel } from "./types.ts";
import { handler } from "./handler.ts";

const MONGO_URL = Deno.env.get("MONGO_URL");
if (!MONGO_URL) {
    throw new Error("You have to provide a MONGO_URL");
}

const mongoClient = new MongoClient(MONGO_URL);
await mongoClient.connect();

console.info("MongoDB connected!");

const db = mongoClient.db("reservas_apirest");
export const RestaurantesCollection = db.collection<RestaurantesModel>("restaurantes");
export const ReservasCollection = db.collection<ReservasModel>("reservas");

Deno.serve({port: 3000}, handler);