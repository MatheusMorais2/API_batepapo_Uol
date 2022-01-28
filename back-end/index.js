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

async function getUserList() {
  try {
    await mongoClient.connect();
    db = mongoClient.db("Api_batepapo_uol");

    const userList = await db.collection("users").find({}).toArray();

    if (mongoClient) mongoClient.close();
    return userList;
  } catch {
    if (mongoClient) mongoClient.close();
    return -1;
  }
}

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
      if (mongoClient) mongoClient.close();
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

    const userListRaw = await db.collection("users").find({}).toArray();
    const userList = userListRaw.map((elem) => elem.name);

    res.status(201).send(userList);
    if (mongoClient) mongoClient.close();
  } catch {
    res.status(500).send("Internal server error");
    if (mongoClient) mongoClient.close();
  }
});

server.post("/messages", async (req, res) => {
  const bodySchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.valid("message", "private_message"),
  });
  const headerSchema = joi.string().required();

  const bodyValidation = bodySchema.validate(req.body);
  const headerValidation = headerSchema.validate(req.headers.user);

  if (bodyValidation.error || headerValidation.error) {
    res.sendStatus(422);
    return;
  }

  try {
    await mongoClient.connect();
    db = mongoClient.db("API_batepapo_uol");

    const isUserOn = await db
      .collection("users")
      .findOne({ name: req.headers.user });

    if (isUserOn) {
      const messageInsertion = {
        ...req.body,
        from: req.headers.user,
        time: dayjs().format("HH:mm:ss"),
      };

      await db.collection("messages").insertOne(messageInsertion);

      res.sendStatus(201);
      if (mongoClient) mongoClient.close();
      return;
    } else {
      res.sendStatus(422);
      if (mongoClient) mongoClient.close();
      return;
    }
  } catch (error) {
    res.status(500).send("Internal server error");
    if (mongoClient) mongoClient.close();
  }
});

server.listen(5000);
