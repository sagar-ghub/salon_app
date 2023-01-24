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

router.post("/add", requireAuth(), async (req, res) => {
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    return res.status(422).json({
      status: 422,
      msg: "err",
      validationErrors: validationErrors.array({ onlyFirstError: true }),
    });
  }
  const { product_id = 0, service_id = 0, product_quantity } = req.body;
  const { user_id } = req.user;

  try {
    let results = await knexdb
      .select("*")
      .from(tables.cart)
      .where("user_id", user_id)
      .andWhere("product_id", product_id)
      .andWhere("service_id", service_id);

    if (results.length !== 0) {
      let updatecart = await knexdb(tables.cart)
        .where("user_id", user_id)
        .andWhere("product_id", product_id)
        .andWhere("service_id", service_id)
        .update({
          product_id: product_id,
          service_id: service_id,
          product_quantity: product_quantity,
          updated_by: user_id,
          updated_at: new Date(),
        });

      return res.status(201).json({
        status: 201,
        msg: "successfully added",
        data: updatecart,
      });
    }

    let cartDetails = await knexdb(tables.cart).insert({
      user_id,
      product_id: product_id,
      service_id: service_id,
      product_quantity,
      created_by: user_id,
      updated_by: user_id,
      updated_at: new Date(),
    });
    return res.status(201).json({
      status: 201,
      msg: "successfully added",
      data: cartDetails[0],
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ status: 500, msg: "Try again later" });
  }
});

router.get("/:user_id", requireAuth(), async (req, res) => {
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    return res.status(422).json({
      status: 422,
      msg: "err",
      validationErrors: validationErrors.array({ onlyFirstError: true }),
    });
  }

  try {
    let results = await knexdb
      .select("*")
      .from(tables.cart)
      .where("user_id", req.params.user_id);
    if (results.length == 0) {
      return res.status(400).json({ error: 1, msg: "No Product exists" });
    }
    let final_ids = {
      product_ids: [],
      service_ids: [],
    };
    let temp = {
      product_ids: [],
      service_ids: [],
    };
    for (let i = 0; i < results.length; i++) {
      if (results[i].product_id == 0) {
        temp.service_ids.push(results[i].service_id);
        final_ids.service_ids.push({
          service_id: results[i].service_id,
          product_quantity: results[i].product_quantity,
        });
      } else {
        temp.product_ids.push(results[i].product_id);
        final_ids.product_ids.push({
          product_id: results[i].product_id,
          product_quantity: results[i].product_quantity,
        });
      }
    }

    let productResults = await knexdb
      .select("*")
      .from(tables.product)
      .whereIn("product_id", temp.product_ids);
    let serviceResults = await knexdb
      .select("*")
      .from(tables.service)
      .whereIn("service_id", temp.service_ids);

    let arr3 = productResults.map((item, i) =>
      Object.assign({}, item, final_ids.product_ids[i])
    );
    let arr4 = productResults.map((item, i) =>
      Object.assign({}, item, final_ids.service_ids[i])
    );

    return res.status(201).json({
      status: 201,
      msg: "success",
      productResults: arr3,
      serviceResults: arr4,
      //   arr3,
      //   product_quantity: final_ids,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ status: 500, msg: "Try again later" });
  }
});

module.exports = router;
