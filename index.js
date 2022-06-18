const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const validator = require("email-validator");
const fs = require("fs");
const randomNum = require("./randomNum");
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

// Connect to DB
mongoose
  .connect("mongodb://localhost:27017/otpContactsDB")
  .then(() => console.log("Successfully connected to mongoDB"))
  .catch((err) => console.error(err));

// Contact Schema
const contactSchema = mongoose.Schema({
  first_name: {
    type: String,
    required: true,
  },
  last_name: { type: String, required: true },
  gender: String,
  email: {
    type: String,
    required: true,
    validate: [validator.validate, "Please enter a valid email address"],
  },
  phone: { type: String, required: true, unique: true },
  photo: String,
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

// Contact Model
const Contact = mongoose.model("Contact", contactSchema);

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

app.get("/get-messages", async (req, res) => {
  try {
    const messagesResponse = await client.messages.list();
    const contacts = await Contact.find();

    const messages = messagesResponse.map((message) => {
      return {
        to: message.to,
        date: message.dateSent,
        body: message.body,
      };
    });

    messages.forEach((message) => {
      contacts.forEach((contact) => {
        if (contact.phone.trim() === message.to.trim()) {
          message.photo = contact.photo;
          message.first_name = contact.first_name;
          message.last_name = contact.last_name;
        }
      });
    });

    res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      success: false,
      message: "Cannot get messages",
    });
  }
});

// Contacts
app.get("/contacts", (req, res) => {
  Contact.find({})
    .sort({ first_name: 1 })
    .then((data) =>
      res.status(200).json({
        success: true,
        contacts: data,
      })
    )
    .catch((err) => {
      console.error(err);
      res.status(400).json({
        success: false,
        message: err.messsage,
      });
    });
});

app.post("/contact", async (req, res) => {
  try {
    const { first_name, last_name, gender, phone, email } = req.body;
    const newContact = new Contact({
      first_name,
      last_name,
      gender,
      email,
      // to generate random photo
      photo: `https://xsgames.co/randomusers/assets/avatars/male/${randomNum(
        1,
        75
      )}.jpg`,
      phone,
    });

    await newContact.save();

    res
      .status(200)
      .json({ success: true, message: "Contact created successfully" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
});

app.delete("/contact", (req, res) => {
  const phone = req.body.phone;
  if (phone) {
    Contact.deleteOne({ phone: phone }).then((result) => {
      result.acknowledged && result.deletedCount > 0
        ? res
            .status(200)
            .json({ success: true, message: "Deleted Successfully" })
        : res.status(400).json({
            success: false,
            message: "Cannot delete",
          });
      console.log(result);
    });
  } else {
    res.status(400).json({
      success: false,
      message: "Cannot delete",
    });
  }
});

// To create mock data in DB
app.post("/add-mock-data", (req, res) => {
  const fileContents = fs.readFileSync(__dirname + "/contacts.json", "utf8");

  try {
    const data = JSON.parse(fileContents);
    const contacts = data.contacts;

    contacts.map(async (contact) => {
      const newContact = new Contact({
        first_name: contact.first_name,
        last_name: contact.last_name,
        gender: contact.gender,
        email: contact.email,
        phone: contact.phone,
        photo: contact.photo,
      });

      await newContact.save();
    });

    res.send("Done!");
  } catch (err) {
    console.error(err);
  }
});

app.all("/*", (req, res) => {
  res.status(400).send({
    success: false,
    message: "Page not found",
  });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
