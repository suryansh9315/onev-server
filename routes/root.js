const express = require("express");
const auth = require("./api/auth");

const app = express.Router();

app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to API" });
});

app.use("/api/auth", auth);

app.all("*", (req, res) => {
    res.status(400).json({ message: "Route D.N.E" });
});

module.exports = app;
