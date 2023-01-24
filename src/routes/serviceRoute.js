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

router.post("/create", requireAuth(), async (req, res) => {
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    return res.status(422).json({
      status: 422,
      msg: "err",
      validationErrors: validationErrors.array({ onlyFirstError: true }),
    });
  }
  const {
    category_id,
    service_name,
    service_description,
    service_price,
    service_offer_price,
    service_duration,
  } = req.body;
  const { user_id } = req.user;
  const file = req.files.service_photo;
  try {
    let serviceDetails;
    await file.mv("public/images/services/" + file.name, async function (err) {
      if (err) {
        console.log(err);
        throw err;
      }
      serviceDetails = await knexdb(tables.service).insert({
        category_id,
        service_name,
        service_description,
        service_price,
        service_offer_price,
        service_duration,
        service_photo: file.name,
        created_by: user_id,
        updated_by: user_id,
        updated_at: new Date(),
      });
      return serviceDetails;
    });
    return res.status(201).json({
      status: 201,
      msg: "successfully added",
      data: serviceDetails,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ status: 500, msg: "Try again later" });
  }
});

router.get("/", requireAuth(), async (req, res) => {
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    return res.status(422).json({
      status: 422,
      msg: "err",
      validationErrors: validationErrors.array({ onlyFirstError: true }),
    });
  }

  try {
    let results = await knexdb.select("*").from(tables.service);

    if (results.length == 0) {
      return res.status(400).json({ error: 1, msg: "No service exists" });
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
router.get("/category/:id", requireAuth(), async (req, res) => {
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
      .from(tables.service)
      .where({ category_id: id });
    if (results.length == 0) {
      return res.status(400).json({ error: 1, msg: "No service exists" });
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
