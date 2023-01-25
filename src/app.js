const express = require("express");
const path = require("path");
const knexdb = require("./db/index");
const fileUpload = require("express-fileupload");

// const requestHeader = require("./middlewares/requestHeader");
const memberRoute = require("./routes/memberRoute");
const shopRoute = require("./routes/shopRoute");
const locationRoute = require("./routes/locationRoute");
const categoryRoute = require("./routes/categoryRoute");
const productRoute = require("./routes/productRoute");
const serviceRoute = require("./routes/serviceRoute");
const cartRoute = require("./routes/cartRoute");
const postalRoute = require("./routes/postalRoute");

const app = express();
// app. (express.static(path.join(__dirname, "../public")));
// app.use(requestHeader);
app.use(express.json());
app.use(fileUpload());

//add router
app.use("/member", memberRoute);
app.use("/shop", shopRoute);
app.use("/location", locationRoute);
app.use("/category", categoryRoute);
app.use("/product", productRoute);
app.use("/service", serviceRoute);
app.use("/cart", cartRoute);
app.use("/pincode", postalRoute);
//for testing
// const testRoute = require("./routes/testRoute");
// app.use("/test", testRoute);

app.get("/", async (req, res) => {
  try {
    let { status = 200 } = req.query;

    console.log(data);
    return res.status(status).json({ error: 0, msg: "hello world" });
  } catch (error) {
    console.log(error);
    return res.status(200).json({ error: 0, msg: "hello world2" });
  }
});

// 404
app.use((req, res, next) => {
  return res
    .status(404)
    .json({ error: 1, msg: "request page " + req.url + " Not found." });
});

// 500 - Any server error
app.use((err, req, res, next) => {
  console.error(err.stack);
  return res.status(500).json({ error: 1, msg: "Something broke!" });
});

module.exports = app;
