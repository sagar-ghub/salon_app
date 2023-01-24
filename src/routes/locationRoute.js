const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");

const knexdb = require("../db/index");
const {
  apiSecrect,
  tables,
  userRole,
  webTokenExpires,
  otpTokenExpires,
} = require("../../config");
const { generateOtp, sanatizeMemberData } = require("../util");
const requireAuth = require("../middlewares/requireAuth");
const requireOtpAuth = require("../middlewares/requireOtpAuth");

const router = express.Router();

router.post("/create", async (req, res) => {
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    return res.status(422).json({
      status: 422,
      msg: "err",
      validationErrors: validationErrors.array({ onlyFirstError: true }),
    });
  }
  const {
    location_locality,
    location_city,
    location_state,
    location_pincode,
    // user_id,
  } = req.body;
  try {
    let locationDetails = await knexdb(tables.location).insert({
      location_locality,
      location_city,
      location_state,
      location_pincode,
    });

    return res.status(201).json({
      status: 201,
      msg: "location added successfully",
      data: locationDetails[0],
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ status: 500, msg: "Try again later" });
  }
});

router.get("/byshop/:id", requireAuth(), async (req, res) => {
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    return res.status(422).json({
      status: 422,
      msg: "err",
      validationErrors: validationErrors.array({ onlyFirstError: true }),
    });
  }
  const { id } = req.params;

  try {
    let results = await knexdb
      .select("*")
      .from(tables.location)
      .where("shop_id", id);
    // console.log(results);

    if (results.length == 0) {
      return res
        .status(400)
        .json({ error: 1, msg: "No Location exists for given shop_id" });
    }

    return res.status(201).json({
      status: 201,
      msg: "success",
      data: results,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ status: 500, msg: "Try again later" });
  }
});

module.exports = router;
