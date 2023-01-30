const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult, param, query } = require("express-validator");

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
  "/createservice",
  body("category_id").not().isEmpty().trim().escape().isNumeric(),
  body("service_name").not().isEmpty().trim().escape(),
  body("service_description").not().isEmpty().trim().escape(),
  body("service_price").not().isEmpty().trim().escape(),
  body("service_offer_price").not().isEmpty().trim().escape(),
  body("service_duration").not().isEmpty(),
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
      await file.mv(
        "public/images/services/" + file.name,
        async function (err) {
          if (err) {
            console.log(err);
            throw err;
          }
          let serviceObj = {
            category_id,
            service_name,
            service_description,
            service_price,
            service_offer_price,
            service_duration,
            service_photo: file.name,
            created_by: user_id,
          };
          serviceDetails = await knexdb(tables.service).insert(serviceObj);
          return serviceDetails;
        }
      );
      return res.status(201).json({
        status: 201,
        msg: "successfully added",
        data: serviceDetails,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ status: 500, msg: "Try again later" });
    }
  }
);

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

router.get(
  "/byshopid/:id",
  param("id").not().isEmpty().trim().isNumeric({
    no_symbols: true,
  }),
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
      //left join services table and shop_services table where shop_services.shop_id = id
      const shop = await knexdb
        .select("*")
        .from(tables.shop)
        .where({ shop_id: id });
      if (shop.length == 0) {
        return res.status(400).json({ error: 1, msg: "No Shop exists" });
      }
      const services = await knexdb
        .select("*")
        .from(tables.service)
        .leftJoin(tables.shop_service_product, function () {
          this.on(
            tables.service + ".service_id",
            "=",
            tables.shop_service_product + ".service_id"
          );
        })
        .where({ shop_id: id });

      // let results = await knexdb.select("*").from(tables.service);

      if (services.length == 0) {
        return res.status(400).json({ error: 1, msg: "No Service exists" });
      }

      return res.status(201).json({
        status: 201,
        msg: "success",
        data: services,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ status: 500, msg: "Try again later" });
    }
  }
);
router.get(
  "/bygenderandshop",
  query("id").not().isEmpty().trim().isNumeric({
    no_symbols: true,
  }),
  query("gender").not().isEmpty().trim().isNumeric({
    no_symbols: true,
  }),
  async (req, res) => {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(422).json({
        status: 422,
        msg: "err",
        validationErrors: validationErrors.array({ onlyFirstError: true }),
      });
    }
    const { id, gender } = req.query;

    try {
      //left join services table and shop_services table where shop_services.shop_id = id
      const shop = await knexdb
        .select("*")
        .from(tables.shop)
        .where({ shop_id: id });
      if (shop.length == 0) {
        return res.status(400).json({ error: 1, msg: "No Shop exists" });
      }
      const services = await knexdb
        .select("*")
        .from(tables.service)
        .leftJoin(tables.shop_service_product, function () {
          this.on(
            tables.service + ".service_id",
            "=",
            tables.shop_service_product + ".service_id"
          );
        })
        .where({ shop_id: id })
        .leftJoin(tables.category, function () {
          this.on(
            tables.service + ".category_id",
            "=",
            tables.category + ".category_id"
          );
        })
        .where({ category_gender: gender });

      // let results = await knexdb.select("*").from(tables.service);

      if (services.length == 0) {
        return res.status(400).json({ error: 1, msg: "No Product exists" });
      }

      return res.status(201).json({
        status: 201,
        msg: "success",
        data: services,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ status: 500, msg: "Try again later" });
    }
  }
);
module.exports = router;
