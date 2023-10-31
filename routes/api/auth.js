const express = require("express");
const otpGenerator = require("otp-generator");
const { mongoClient } = require("../../database");
const fast2sms = require("fast-two-sms");
const { encode, decode } = require("../../utils/crypt");
const { ObjectId } = require("mongodb");
const { sign_jwt } = require("../../utils/jwt_helpers");

const app = express.Router();
const database = mongoClient.db("onev_main");
const otps = database.collection("otp");
const drivers = database.collection("driver");

app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to Auth API" });
});

app.post("/login", async (req, res) => {
  if (!req.body.number || req.body.number.length != 10) {
    return res
      .status(400)
      .json({ status: "error", message: "Number not provided..." });
  }
  const phone = req.body.number;
  const otp = otpGenerator.generate(4, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
  try {
    const sms_res = await fast2sms.sendMessage({
      authorization: process.env.FAST_2_SMS_AUTH,
      message: otp,
      numbers: [phone],
    });
    if (sms_res.return !== true) {
      return res
        .status(400)
        .json({ status: "error", message: sms_res?.message });
    }
    const now = Date.now();
    const expiration_time = now + 5 * 60 * 1000;
    const otp_object = {
      otp,
      expiration_time,
      created_at: now,
      updated_at: "",
      verified: false,
    };
    const new_otp = await otps.insertOne(otp_object);
    const details = {
      timestamp: now,
      check: phone,
      success: true,
      message: "OTP sent to user",
      otp_id: new_otp.insertedId,
    };
    const encoded_details = await encode(JSON.stringify(details));
    res.status(200).json({ status: "success", details: encoded_details });
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ status: "error", message: "Something went wrong..." });
  }
});

app.post("/verify", async (req, res) => {
  if (
    !req.body.verification_key ||
    !req.body.otp ||
    !req.body.phone ||
    req.body.otp.length != 4 ||
    req.body.phone.length != 10
  ) {
    return res
      .status(400)
      .json({ status: "error", message: "Details Not provided..." });
  }
  const { verification_key, otp, phone } = req.body;
  const now = Date.now();
  try {
    let decoded;
    try {
      decoded = await decode(verification_key);
    } catch (err) {
      return res
        .status(400)
        .json({ status: "error", message: "Bad Request..." });
    }
    const obj = JSON.parse(decoded);
    const check_obj = obj.check;
    if (check_obj != phone) {
      return res.status(400).json({
        status: "error",
        message: "OTP was not sent to this particular email or phone number",
      });
    }
    const query = { _id: new ObjectId(obj.otp_id) };
    const otp_instance = await otps.findOne(query);
    if (otp_instance != null) {
      if (otp_instance.verified != true) {
        if (now < otp_instance.expiration_time) {
          if (otp === otp_instance.otp) {
            const update = {
              $set: {
                verified: true,
                updated_at: now,
              },
            };
            const options = { upsert: false };
            const result = await otps.updateOne(query, update, options);
            if (result.matchedCount !== result.modifiedCount) {
              return res.status(400).json({
                status: "failure",
                message: "Something went wrong.",
              });
            }
            const driver_query = { driver_number: phone };
            const old_driver = await drivers.findOne(driver_query);
            if (old_driver == null) {
              const driver_object = {
                date: Date.now(),
                driver_number: phone,
                driver_name: "",
                driver_email: "",
                vehicle_number: "",
                vehicle_model: "",
                vehicle_rent: "",
                profile_pic: "",
                aadhar_front: "",
                aadhar_back: "",
                rc_front: "",
                rc_back: "",
                dl_front: "",
                dl_back: "",
                pan_front: "",
                insurance: "",
                account_number: "",
                account_ifsc: "",
                balance: 0,
                paid: 0,
                status: false,
                suspended: false,
                onboarded: false,
                points: 0,
                noti_token: "",
              };
              const new_driver = await drivers.insertOne(driver_object);
              const new_driver_object = await drivers.findOne({
                _id: new ObjectId(new_driver.insertedId),
              });
              const token = sign_jwt({ id: new_driver_object._id });
              const response = {
                status: "success",
                message: "OTP Matched",
                phone,
                driver: new_driver_object,
                token
              };
              return res.status(200).send(response);
            } else {
              const token = sign_jwt({ id: old_driver._id });
              const response = {
                status: "success",
                message: "OTP Matched",
                phone,
                driver: old_driver,
                token
              };
              return res.status(200).send(response);
            }
          } else {
            return res
              .status(400)
              .json({ status: "error", message: "Wrong OTP" });
          }
        } else {
          return res
            .status(400)
            .json({ status: "error", message: "OTP Expired" });
        }
      } else {
        return res
          .status(400)
          .json({ status: "error", message: "OTP Already Used" });
      }
    } else {
      return res
        .status(400)
        .json({ status: "error", message: "Bad Request..." });
    }
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ status: "error", message: "Something went wrong..." });
  }
});



module.exports = app;
