require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;
// middleware
app.use(cors());
app.use(express.json());

// function verifyJWT(req, res, next) {
//   const tokenInfo = req.headers.authorization;

//   if (!tokenInfo) {
//     return res.status(401).send({ message: "Unouthorize access" });
//   }
//   const token = tokenInfo.split(" ")[1];
//   jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
//     if (err) {
//       return res.status(403).send({ message: "Forbidden access" });
//     } else {
//       req.decoded = decoded;
//       next();
//     }
//   });
// }

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.b0ojei0.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    await client.connect();
    const productsCollection = client.db("make-choices").collection("products");
    app.get("/products", async (req, res) => {
      const query = {};
      const cursor = productsCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });
    await client.connect();
    const reviewCollection = client.db("HopLight").collection("reviews");
    const userCollection = client.db("HopLight").collection("users");
    const profileCollection = client.db("HopLight").collection("profile");
    const purchaseCollection = client.db("HopLight").collection("purchase");
    const paymentCollection = client.db("HopLight").collection("payments");

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    };
   
  } finally {
    // client.close();
  }
};
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Ns World!");
});

app.listen(port, () => {
  console.log("server running in port", port);
});
