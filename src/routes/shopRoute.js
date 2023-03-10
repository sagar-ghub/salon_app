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

router.post(
  "/createshop",
  body("shop_name").not().isEmpty().trim().escape(),
  body("shop_owner_name").not().isEmpty().trim().escape(),
  body("shop_phone").not().isEmpty().trim().escape().isMobilePhone(),
  body("shop_email").not().isEmpty().trim().escape().isEmail(),
  body("location_id").not().isEmpty().isNumeric(),
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

      let shopObj = {
        shop_owner_name,
        shop_phone,
        shop_email,
        location_id,
        user_id,
        created_by: user_id,
      };

      let shopDetails = await knexdb(tables.shop).insert(shopObj);
      // console.log(shopDetails[0]);
      // await knexdb(tables.location).where("location_id", location_id).update({
      //   shop_id: shopDetails[0],
      // });

      return res.status(201).json({
        status: 201,
        msg: "successfully registered",
        data: shopDetails[0],
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ status: 500, msg: "Try again later" });
    }
  }
);

router.get(
  "/getshop/:id",
  param("id").not().isEmpty().isNumeric(),

  // requireAuth(),
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

      let shopDetails = results[0];
      let locationDetails = await knexdb
        .select("*")
        .from(tables.location)
        .where("location_id", shopDetails.location_id);

      shopDetails.locationDetails = locationDetails[0];

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
  "/pincode/:pin",
  param("pin").not().isEmpty().isNumeric().isLength({
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

      let location_ids = results.map((item) => {
        return item.location_id;
      });

      let shopDetails = await knexdb
        .select("*")
        .from(tables.shop)
        .whereIn("location_id", location_ids);

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
  param("city").not().isEmpty().trim(),
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

router.post(
  "/shop_mapping",
  body("shop_id").not().isEmpty().trim().isNumeric(),
  body("product_id").not().isEmpty().trim().isNumeric(),
  body("service_id").not().isEmpty().trim().isNumeric(),

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
    const { shop_id, product_id = 0, service_id = 0 } = req.body;
    const { user_id } = req.user;
    try {
      let shopMapObj = {
        shop_id: shop_id,
        product_id: product_id,
        service_id: service_id,
        created_by: user_id,
      };
      let shopDetails = await knexdb(tables.shop_service_product).insert(
        shopMapObj
      );

      return res.status(201).json({
        status: 201,
        msg: "successfully Added",
        data: shopDetails[0],
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ status: 500, msg: "Try again later" });
    }
  }
);

router.post(
  "/shop_mapping_usings_array",
  body("shop_id").not().isEmpty().trim().isNumeric(),
  // body("product_id").not().isEmpty().trim().isNumeric(),
  // body("service_id").not().isEmpty().trim().isNumeric(),

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
    const { shop_id, product_id = [], service_id = [] } = req.body;
    const { user_id } = req.user;

    try {
      let shopMapObj = [];

      if (product_id.length > 0 && product_id[0] != 0) {
        for (let i = 0; i < product_id.length; i++) {
          shopMapObj.push({
            shop_id: shop_id,
            product_id: product_id[i],
            service_id: 0,
            created_by: user_id,
          });
        }
      } else {
        // console.log("service_id", service_id);
        for (let i = 0; i < service_id.length; i++) {
          shopMapObj.push({
            shop_id: shop_id,
            product_id: 0,
            service_id: service_id[i],
            created_by: user_id,
          });
        }
      }
      // console.log(shopMapObj);
      // return;
      let shopDetails = await knexdb(tables.shop_service_product).insert(
        shopMapObj
      );

      return res.status(201).json({
        status: 201,
        msg: "successfully Added",
        data: shopDetails[0],
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ status: 500, msg: "Try again later" });
    }
  }
);

module.exports = router;
