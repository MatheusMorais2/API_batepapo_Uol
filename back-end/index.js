import { MongoClient } from "mongodb";
import express from "express";
import dayjs from "dayjs";
import dotenv from "dotenv";
import joi from "joi";

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

const server = express();
server.use(express.json());

const userSchema = joi.object({
  name: joi.string().required(),
});

server.post("/participants", async (req, res) => {
  const validation = userSchema.validate(req.body);
  if (validation.error) {
    res.status(422).send(validation.error.details);
    return;
  }

  try {
    await mongoClient.connect();
    db = mongoClient.db("API_batepapo_uol");

    let isNameDuplicate = await db.collection("users").findOne(req.body);
    if (isNameDuplicate) {
      res.status(409).send("Usuario ja cadastrado");
      return;
    }

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
