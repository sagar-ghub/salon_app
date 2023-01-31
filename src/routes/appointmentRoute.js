//Book Appointment
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

//Remove everything from cart and add to appointment
router.post(
  "/createappointment",
  body("user_id").not().isEmpty().trim().isNumeric({
    no_symbols: true,
  }),
  body("time_slot").not().isEmpty().trim().isLength({
    min: 19,
    max: 19,
  }),

  // body("shop_id").not().isEmpty().trim().isNumeric({
  //   no_symbols: true,
  // }),
  async (req, res) => {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(422).json({
        status: 422,
        msg: "err",
        validationErrors: validationErrors.array({ onlyFirstError: true }),
      });
    }

    const { user_id, time_slot } = req.body;
    let shop_id = 0;
    //IF THERE IS NO PRODUCT IN THE USER CART
    let results = await knexdb(tables.cart).where("user_id", user_id);
    if (results.length === 0) {
      return res.status(404).json({
        status: 404,
        msg: "No items in cart",

        data: results,
      });
    }
    shop_id = results[0].shop_id;

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
    //fetching the price of the respective products and services
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
    //Calculating totals and discounts
    let total = 0,
      discounted = 0,
      appointmentMapObj = [];
    for (let i = 0; i < arr3.length; i++) {
      total +=
        parseFloat(arr3[i].product_quantity) *
        parseFloat(arr3[i].product_price);
      discounted +=
        parseFloat(arr3[i].product_quantity) *
        parseFloat(arr3[i].product_offer_price);
      appointmentMapObj.push({
        appointment_id: 0,
        product_id: arr3[i].product_id,
        service_id: 0,
        offered_quantity: arr3[i].product_quantity,
        offered_price: arr3[i].product_offer_price,
      });
    }
    for (let i = 0; i < arr4.length; i++) {
      total +=
        parseFloat(arr4[i].product_quantity) *
        parseFloat(arr4[i].service_price);
      discounted +=
        parseFloat(arr4[i].product_quantity) *
        parseFloat(arr4[i].service_price);

      appointmentMapObj.push({
        appointment_id: 0,
        product_id: 0,
        service_id: arr4[i].service_id,
        offered_quantity: arr4[i].product_quantity,
        offered_price: arr4[i].service_offer_price,
      });
    }

    //Serial appointment number with month and date
    let d = new Date(),
      appointment_id = 0;

    //SELECT    COUNT(*) FROM      rck_cart WHERE     MONTH(created_at) = '2' AND  YEAR(created_at)="2023";
    //count the number of appointments in the current month and year
    let appointmentCount = await knexdb(tables.appointment)
      .count("*")
      .whereRaw("MONTH(created_at) = ?", [d.getMonth() + 1])
      .andWhereRaw("YEAR(created_at) = ?", [d.getFullYear()]);

    console.log(appointmentCount[0]["count(*)"]);
    appointment_id = appointmentCount[0]["count(*)"];
    appointment_id++;

    let reference_id =
      "SLN" +
      (d.getYear() - 100) +
      ("0" + (d.getMonth() + 1)).slice(-2) +
      "" +
      String(appointment_id).padStart(5, "0");
    console.log(reference_id);

    //APPOINTMENT STATUS
    // 1 - PENDING
    // 2 - APPROVED
    // 3 - REJECTED
    // 4 - CANCELLED
    // 5 - COMPLETED

    // DATETIME - format: YYYY-MM-DD HH:MI:SS
    let appointmentObj = {
      user_id: user_id,
      customer_id: 0, // TODO: get customer id from user id
      shop_id: shop_id,
      reference_id: reference_id,
      appointment_status: 1,
      appointment_price: total,
      appointment_time: time_slot,
      appointment_final_price: discounted,
      created_by: user_id,
    };
    let appointmentDetails = await knexdb(tables.appointment).insert(
      appointmentObj
    );

    //Updating the appointment reference id
    appointment_id = appointmentDetails[0];

    for (let i = 0; i < appointmentMapObj.length; i++) {
      appointmentMapObj[i].appointment_id = appointment_id;
    }

    //Updating the appointment reference id
    // await knexdb(tables.appointment)
    //   .where("appointment_id", appointment_id)
    //   .update({ reference_id: reference_id });

    //inserting into the appointment map table
    for (let i = 0; i < appointmentMapObj.length; i++) {
      appointmentMapObj[i].appointment_id = appointment_id;
    }

    let appointmentMap = await knexdb(tables.appointment_map).insert(
      appointmentMapObj
    );

    //Removing everything from cart
    await knexdb(tables.cart).where("user_id", user_id).del();

    return res.status(200).json({
      status: 200,
      msg: "successfully created a appointment",
      data: {
        appointment_id: appointment_id,
        appointment_reference_id: reference_id,
      },
    });
  }
);

//Get appointment details
router.get(
  "/getAppointmentbyshop/:shop_id",
  param("shop_id").not().isEmpty().trim().isNumeric({
    no_symbols: true,
  }),
  requireAuth(),
  async (req, res) => {
    const { shop_id } = req.params;
    let appointmentResults = await knexdb
      .select("*")
      .from(tables.appointment)
      .where("shop_id", shop_id);

    //return error if no appointments are found
    if (appointmentResults.length == 0) {
      return res.status(200).json({
        status: 200,
        msg: "No appointments found",
        data: [],
      });
    }

    let appointmentMapResults = await knexdb
      .select("*")
      .from(tables.appointment_map)
      .whereIn(
        "appointment_id",
        appointmentResults.map((item) => item.appointment_id)
      );

    let appointmentObj = [];
    for (let i = 0; i < appointmentResults.length; i++) {
      appointmentObj.push({
        appointment_id: appointmentResults[i].appointment_id,
        appointment_reference_id: appointmentResults[i].reference_id,
        appointment_status: appointmentResults[i].appointment_status,
        appointment_price: appointmentResults[i].appointment_price,
        user_id: appointmentResults[i].user_id,
        appointment_final_price: appointmentResults[i].appointment_final_price,
        appointment_time: appointmentResults[i].appointment_time,
        appointment_created_at: appointmentResults[i].created_at,
        appointment_updated_at: appointmentResults[i].updated_at,
        appointment_map: appointmentMapResults.filter(
          (item) => item.appointment_id == appointmentResults[i].appointment_id
        ),
      });
    }

    return res.status(200).json({
      status: 200,
      msg: "successfully fetched the appointment details",
      data: appointmentObj,
    });
  }
);

//get appointment details by appointment id

router.get(
  "/getAppointmentbyid/:appointment_id",
  param("appointment_id").not().isEmpty().trim().isNumeric({
    no_symbols: true,
  }),
  requireAuth(),
  async (req, res) => {
    const { appointment_id } = req.params;
    let appointmentResults = await knexdb
      .select("*")
      .from(tables.appointment)
      .where("appointment_id", appointment_id);

    //return error if no appointments are found
    if (appointmentResults.length == 0) {
      return res.status(200).json({
        status: 200,
        msg: "No appointments found",
        data: [],
      });
    }
    let user = await knexdb
      .select("*")
      .from(tables.user)
      .where("user_id", appointmentResults[0].user_id);

    let appointmentMapResults = await knexdb
      .select("*")
      .from(tables.appointment_map)
      .whereIn(
        "appointment_id",
        appointmentResults.map((item) => item.appointment_id)
      );

    //get price of each product
    let productPrice = await knexdb
      .select("*")
      .from(tables.product)
      .whereIn(
        "product_id",
        appointmentMapResults.map((item) => item.product_id)
      );
    //get price of each service
    let servicePrice = await knexdb
      .select("*")
      .from(tables.service)
      .whereIn(
        "service_id",
        appointmentMapResults.map((item) => item.service_id)
      );

    let appointmentObj = [];
    for (let i = 0; i < appointmentResults.length; i++) {
      appointmentObj.push({
        appointment_id: appointmentResults[i].appointment_id,
        appointment_reference_id: appointmentResults[i].reference_id,
        appointment_status: appointmentResults[i].appointment_status,
        appointment_price: appointmentResults[i].appointment_price,
        user: user[0],
        appointment_final_price: appointmentResults[i].appointment_final_price,
        appointment_time: appointmentResults[i].appointment_time,
        appointment_created_at: appointmentResults[i].created_at,
        appointment_updated_at: appointmentResults[i].updated_at,
        appointment_map: appointmentMapResults.filter(
          (item) => item.appointment_id == appointmentResults[i].appointment_id
        ),
        products: productPrice,
        services: servicePrice,
      });
    }

    return res.status(200).json({
      status: 200,
      msg: "successfully fetched the appointment details",
      data: appointmentObj,
    });
  }
);

module.exports = router;
