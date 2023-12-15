const express = require("express");
const { mongoClient } = require("../../database");
const { ObjectId } = require("mongodb");

const app = express.Router();
const database = mongoClient.db("onev_main");
const users = database.collection("users");

app.post("/checkvehicle", async (req, res) => {
  if (!req.body.vehicle_number) {
    return res
      .status(400)
      .json({ status: "error", message: "Vehicle Number not provided..." });
  }
  try {
    
    res.status(200).json({ status: "success", details: encoded_details });
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ status: "error", message: "Something went wrong..." });
  }
});

module.exports = app;