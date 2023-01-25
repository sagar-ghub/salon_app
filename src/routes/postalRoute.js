const express = require("express");

const knex = require("../db/index");
const router = new express.Router();

const responseDetail = {
  StatusCode: 0,
  Status: "",
  Message: "",
  Postoffice: "",
};

function takeResponseDetails(statusCode, status, message, results) {
  responseDetail.StatusCode = statusCode;
  responseDetail.Status = status;
  responseDetail.Message = message;
  responseDetail.Postoffice = results;

  return responseDetail;
}

router.get("/:pin", (req, res) => {
  const pincode = req.params.pin;

  if (pincode.length < 6 || pincode.length > 6 || isNaN(pincode)) {
    res.status(404);
    return res.send(
      takeResponseDetails("404", "Error", "Invalid pincode", null)
    );
  } else {
    knex
      .select(
        "officename as Name",
        "description as Description",
        "officeType as BranchType",
        "Deliverystatus as DeliveryStatus",
        "circlename as Circle",
        "Districtname as District",
        "divisionname as Division",
        "regionname as Region",
        "Taluk as Block",
        "statename as State",
        "country as Country",
        "pincode as Pincode"
      )
      .from("postal-data")
      .where("pincode", pincode)
      .then((rows) => {
        if (rows.length == 0) {
          res.status(404);
          return res.send(
            takeResponseDetails("404", "Error", "No records found", null)
          );
        }
        res.status(200);
        res.send(
          takeResponseDetails(
            200,
            "Success",
            "Number of pincode(s) found " + rows.length,
            rows
          )
        );
      });
  }
});

router.get("*", (req, res) => {
  res.status(404);
  res.send("Page not found");
});

module.exports = router;
