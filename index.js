const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
  })
);
app.use(express.json());

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

app.get("/", (req, res) => {
  res.send("Server is running...");
});

app.post("/send-message", (req, res) => {
  const { message, to } = req.body;

  client.messages
    .create({
      body: message,
      messagingServiceSid: process.env.MESSAGING_SERVICE_SID,
      to: to,
    })
    .then((message) => {
      console.log(message.sid);
      res.status(200).json({
        success: true,
        message: "Message successfully sent.",
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(err.status).json({
        success: false,
        message: "Error occured Cannot send message.",
      });
    })
    .done();
});

app.get("/get-messages", (req, res) => {
  client.messages
    .list()
    .then((messages) => {
      console.log(messages);
      res.status(200).json({
        success: true,
        messages: messages.map((message) => {
          return {
            to: message.to,
            date: message.dateSent,
            body: message.body,
          };
        }),
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(400).json({
        success: false,
        message: "Cannot get messages",
      });
    });
});

app.all("/*", (req, res) => {
  res.status(400).send({});
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
