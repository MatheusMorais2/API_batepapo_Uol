import { MongoClient } from "mongodb";
import express from "express";
import dayjs from "dayjs";
import dotenv from "dotenv";

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

const server = express();
server.use(express.json());

server.post("/participants", async (req, res) => {
  try {
    await mongoClient.connect();
    db = mongoClient.db("API_batepapo_uol");

    const userInsertion = { ...req.body, lastStatus: Date.now() };
    await db.collection("users").insertOne(userInsertion);

    const statusInsertion = {
      from: req.body.name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:mm:ss"),
    };
    await db.collection("messages").insertOne(statusInsertion);

    res.sendStatus(201);
    if (mongoClient) mongoClient.close();
  } catch {
    res.status(500).send("Internal server error");
    if (mongoClient) mongoClient.close();
  }
});

server.get("/participants", async (req, res) => {
  try {
    await mongoClient.connect();
    db = mongoClient.db("API_batepapo_uol");

    const userList = await db.collection("users").find().toArray();
    res.status(201).send(userList);

    if (mongoClient) mongoClient.close();
  } catch {
    res.status(500).send("Internal server error");
    if (mongoClient) mongoClient.close();
  }
});

server.listen(5000);
