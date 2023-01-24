const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult, param } = require("express-validator");

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
  const { shop_name, shop_owner_name, shop_phone, shop_email, location_id } =
    req.body;
  const { user_id } = req.user;
  try {
    let results = await knexdb
      .select("*")
      .from(tables.shop)
      .where("shop_phone", shop_phone);

    if (results.length !== 0) {
      return res
        .status(400)
        .json({ error: 1, msg: "Mobile number already exists for shop" });
    }

    let shopDetails = await knexdb(tables.shop).insert({
      shop_name,
      shop_owner_name,
      shop_phone,
      shop_email,
      location_id,
      created_by: user_id,
      updated_by: user_id,
      updated_at: new Date(),
    });
    // console.log(shopDetails[0]);
    await knexdb(tables.location).where("location_id", location_id).update({
      shop_id: shopDetails[0],
    });

    return res.status(201).json({
      status: 201,
      msg: "successfully registered",
      data: shopDetails[0],
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ status: 500, msg: "Try again later" });
  }
});

router.get(
  "/getshop/:id",

  requireAuth(),
  async (req, res) => {
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
        .from(tables.shop)
        .where("shop_id", id);
      console.log(results);

      if (results.length == 0) {
        return res
          .status(400)
          .json({ error: 1, msg: "No Shop exists for given shop_id" });
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
  }
);

router.get(
  "/pincode/:pin",
  param("pin").not().isEmpty().isLength({
    min: 6,
    max: 6,
  }),
  requireAuth(),
  async (req, res) => {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(422).json({
        status: 422,
        msg: "err",
        validationErrors: validationErrors.array({ onlyFirstError: true }),
      });
    }
    const { pin } = req.params;

    try {
      let results = await knexdb
        .select("*")
        .from(tables.location)
        .where("location_pincode", pin);
      // console.log(results[0]);

      let shop_id = results.map((item) => {
        return item.shop_id;
      });

      let shopDetails = await knexdb
        .select("*")
        .from(tables.shop)
        .whereIn("shop_id", shop_id);

      if (shopDetails.length == 0) {
        return res
          .status(400)
          .json({ error: 1, msg: "No Shop exists for given Pincode" });
      }

      return res.status(201).json({
        status: 201,
        msg: "success",
        data: shopDetails,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ status: 500, msg: "Try again later" });
    }
  }
);
router.get(
  "/city/:city",
  // param("city").not().isEmpty().isLength({
  //   min: 6,
  //   max: 6,
  // }),
  requireAuth(),
  async (req, res) => {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(422).json({
        status: 422,
        msg: "err",
        validationErrors: validationErrors.array({ onlyFirstError: true }),
      });
    }
    const { city } = req.params;

    try {
      let results = await knexdb
        .select("*")
        .from(tables.location)
        .where("location_city", city);
      // console.log(results[0]);

      let shop_id = results.map((item) => {
        return item.shop_id;
      });

      let shopDetails = await knexdb
        .select("*")
        .from(tables.shop)
        .whereIn("shop_id", shop_id);

      if (shopDetails.length == 0) {
        return res
          .status(400)
          .json({ error: 1, msg: "No Shop exists for given City" });
      }

      return res.status(201).json({
        status: 201,
        msg: "success",
        data: shopDetails,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ status: 500, msg: "Try again later" });
    }
  }
);
module.exports = router;
