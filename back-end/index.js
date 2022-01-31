import { MongoClient, ObjectId } from "mongodb";
import express from "express";
import dayjs from "dayjs";
import dotenv from "dotenv";
import joi from "joi";

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

const server = express();
server.use(express.json());

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
  const userSchema = joi.object({
    name: joi.string().required(),
  });

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
  } catch {
    res.status(500).send("Internal server error");
    if (mongoClient) mongoClient.close();
  }
});

server.get("/messages", async (req, res) => {
  let limit = parseInt(req.query.limit);
  if (!limit) limit = Number.POSITIVE_INFINITY;

  const headerSchema = joi.string().required();
  const headerValidation = headerSchema.validate(req.headers.user);
  if (headerValidation.error) {
    res.sendStatus(422);
    return;
  }

  try {
    await mongoClient.connect();
    db = mongoClient.db("API_batepapo_uol");

    const messages = await db.collection("messages").find({}).toArray();
    let messagesOutput = [];

    for (
      let i = messages.length - 1;
      i >= messages.length - limit && i >= 0;
      i--
    ) {
      if (
        messages[i].from === req.headers.user ||
        messages[i].to === req.headers.user ||
        messages[i].to === "Todos" ||
        messages[i].type === "message"
      ) {
        messagesOutput.push(messages[i]);
      }
    }

    res.status(201).send(messagesOutput);
    if (mongoClient) mongoClient.close();
  } catch {
    res.status(500).send("Internal server error");
    if (mongoClient) mongoClient.close();
  }
});

server.post("/status", async (req, res) => {
  const headerSchema = joi.string().required();
  const headerValidation = headerSchema.validate(req.headers.user);
  if (headerValidation.error) {
    res.sendStatus(422);
    return;
  }

  try {
    await mongoClient.connect();
    db = mongoClient.db("API_batepapo_uol");

    const user = await db
      .collection("users")
      .findOne({ name: req.headers.user });

    console.log(user);

    if (user) {
      await db.collection("users").updateOne(
        {
          _id: user._id,
        },
        { $set: { lastStatus: Date.now() } }
      );
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }

    if (mongoClient) mongoClient.close();
    return;
  } catch {
    res.status(500).send("Internal server error");
    if (mongoClient) mongoClient.close();
  }
});

setInterval(async () => {
  try {
    await mongoClient.connect();
    db = mongoClient.db("API_batepapo_uol");

    const tenSecAgo = Date.now() - 10000;
    let awayUsers = await db
      .collection("users")
      .find({ lastStatus: { $lt: tenSecAgo } })
      .toArray();

    awayUsers.map(async (elem) => {
      await db.collection("users").deleteOne({ _id: new ObjectId(elem._id) });

      const messageInsertion = {
        from: elem.name,
        to: "Todos",
        text: "sai da sala...",
        type: "status",
        time: dayjs().format("HH:mm:ss"),
      };

      await db.collection("messages").insertOne(messageInsertion);
    });
  } catch {
    console.log("Error deleting AFK users");
  }
}, 15000);

server.listen(5000);
