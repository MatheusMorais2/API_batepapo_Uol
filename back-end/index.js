import { MongoClient } from "mongodb";

const mongoClient = new MongoClient("mongodb://localhost:27017");
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("API_batepapo_uol");
});

db.collection("users").insertOne({
  email: "joao@email.com",
  password: "minha_super_senha",
});
