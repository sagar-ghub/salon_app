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
  "/createproduct",
  body("category_id").not().isEmpty().trim().isNumeric(),
  body("product_name").not().isEmpty().trim(),
  body("product_description").not().isEmpty().trim(),
  body("product_price").not().isEmpty().trim(),
  body("product_offer_price").not().isEmpty().trim(),

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
      product_name,
      product_description,
      product_price,
      product_offer_price,
    } = req.body;
    const { user_id } = req.user;
    const file = req.files.product_photo;
    try {
      let productDetails;
      await file.mv(
        "public/images/products/" + file.name,
        async function (err) {
          if (err) {
            console.log(err);
            throw err;
          }
          let productObj = {
            category_id,
            product_name,
            product_description,
            product_price,
            product_offer_price,
            product_photo: file.name,
            created_by: user_id,
          };
          productDetails = await knexdb(tables.product).insert(productObj);
          return productDetails;
        }
      );
      return res.status(201).json({
        status: 201,
        msg: "successfully added",
        data: productDetails,
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
    let results = await knexdb.select("*").from(tables.product);

    if (results.length == 0) {
      return res.status(400).json({ error: 1, msg: "No Product exists" });
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
      .from(tables.product)
      .where({ category_id: id });
    if (results.length == 0) {
      return res.status(400).json({ error: 1, msg: "No Product exists" });
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
      const products = await knexdb
        .select("*")
        .from(tables.product)
        .leftJoin(tables.shop_service_product, function () {
          this.on(
            tables.product + ".product_id",
            "=",
            tables.shop_service_product + ".product_id"
          );
        })
        .where({ shop_id: id });

      // let results = await knexdb.select("*").from(tables.service);

      if (products.length == 0) {
        return res.status(400).json({ error: 1, msg: "No Prodduct exists" });
      }

      return res.status(201).json({
        status: 201,
        msg: "success",
        data: products,
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
    const shop = await knexdb
      .select("*")
      .from(tables.shop)
      .where({ shop_id: id });
    if (shop.length == 0) {
      return res.status(400).json({ error: 1, msg: "No Shop exists" });
    }

    try {
      //left join services table and shop_services table where shop_services.shop_id = id
      const products = await knexdb
        .select("*")
        .from(tables.product)
        .leftJoin(tables.shop_service_product, function () {
          this.on(
            tables.product + ".product_id",
            "=",
            tables.shop_service_product + ".product_id"
          );
        })
        .where({ shop_id: id })
        .leftJoin(tables.category, function () {
          this.on(
            tables.product + ".category_id",
            "=",
            tables.category + ".category_id"
          );
        })
        .where({ category_gender: gender });

      // let results = await knexdb.select("*").from(tables.service);

      if (products.length == 0) {
        return res.status(400).json({ error: 1, msg: "No Prodduct exists" });
      }

      return res.status(201).json({
        status: 201,
        msg: "success",
        data: products,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ status: 500, msg: "Try again later" });
    }
  }
);
module.exports = router;
