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
  "/addtocart",
  requireAuth(),
  // body("product_id").not().isEmpty().trim().isNumeric(),
  // body("service_id").not().isEmpty().trim().isNumeric(),
  body("shop_id").not().isEmpty().trim().isNumeric(),
  body("product_quantity").not().isEmpty().trim().isNumeric(),
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
      product_id = 0,
      service_id = 0,
      product_quantity,
      shop_id,
    } = req.body;
    const { user_id } = req.user;

    try {
      //checking if product is of other shop
      let checkProduct = await knexdb
        .select("*")
        .from(tables.shop_service_product)
        .where("service_id", service_id)
        .andWhere("product_id", product_id)
        .andWhere("shop_id", shop_id);

      if (checkProduct.length == 0) {
        return res
          .status(400)
          .json({ error: 1, msg: "No Product exists for the current shop" });
      }

      let checkCart = await knexdb
        .select("*")
        .from(tables.cart)
        .where("user_id", user_id);

      if (checkCart.length > 0) {
        if (checkCart[0].shop_id != shop_id) {
          //delete all entries with the user in cart
          await knexdb(tables.cart).where("user_id", user_id).del();
          let cartObj = {
            user_id,
            product_id: product_id,
            service_id: service_id,
            shop_id,
            product_quantity,
            created_by: user_id,
          };
          let cartDetails1 = await knexdb(tables.cart).insert(cartObj);
          return res.status(201).json({
            status: 201,
            msg: "successfully added",
            data: cartDetails1[0],
          });
        }
      }
      //Check if product is already in cart
      let results = await knexdb
        .select("*")
        .from(tables.cart)
        .where("user_id", user_id)
        .andWhere("product_id", product_id)
        .andWhere("service_id", service_id);

      if (results.length !== 0) {
        let updateCartObj = {
          product_id: product_id,
          service_id: service_id,
          product_quantity: product_quantity,
          updated_by: user_id,
          updated_at: new Date(),
        };
        let updatecart = await knexdb(tables.cart)
          .where("user_id", user_id)
          .andWhere("product_id", product_id)
          .andWhere("service_id", service_id)
          .update(updateCartObj);

        return res.status(201).json({
          status: 201,
          msg: "successfully updated",
          data: updatecart,
        });
      }
      let cartObj = {
        user_id,
        product_id: product_id,
        service_id: service_id,
        product_quantity,
        shop_id,
        created_by: user_id,
      };
      let cartDetails = await knexdb(tables.cart).insert(cartObj);
      return res.status(201).json({
        status: 201,
        msg: "successfully added",
        data: cartDetails[0],
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ status: 500, msg: "Try again later" });
    }
  }
);

router.get(
  "/:user_id",
  requireAuth(),
  param("user_id").not().isEmpty().trim().isNumeric(),
  async (req, res) => {
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
      let arr4 = serviceResults.map((item, i) =>
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
  }
);

module.exports = router;
