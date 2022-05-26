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
    const reviewCollection = client.db("make-choices").collection("reviews");
    const userCollection = client.db("make-choices").collection("users");
    const profileCollection = client.db("make-choices").collection("profile");
    const purchaseCollection = client.db("make-choices").collection("purchase");
    const paymentCollection = client.db("make-choices").collection("payments");
    const orderCollenction = client.db("make-choices").collection("orders");

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

    app.post("/create-payment-intent", async (req, res) => {
      const service = req.body;
      const price = service.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });
    app.get("/review", async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews.reverse());
    });
    app.post("/review", async (req, res) => {
      const review = req.body;

      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });
    app.post("/product", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });
    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productsCollection.findOne(query);
      res.send(product);
    });

    app.delete("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });
    app.get("/user", async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });
    app.put("/profile/:email", async (req, res) => {
      const email = req.params.id;
      const users = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name: users.name,
          education: users.education,
          job: users.job,
          phone: users.phone,
          city: users.city,
        },
      };
      const result = profileCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });
    app.get("/profile/:email", async (req, res) => {
      const email = req.params.id;
      const profile = req.body;
      const filter = { email: email };
      const result = await profileCollection.findOne(filter);
      res.send(result);
    });
    app.get("/profile/:user.email", async (req, res) => {
      const user = req.params.user;
      const query = { email: user };
      const profile = await profileCollection.findOne(query);
      res.send(profile);
    });
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user?.role === "admin";
      res.send({ admin: isAdmin });
    });
    app.delete("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user?.role === "admin";
      if (isAdmin) {
        const result = await userCollection.deleteOne({ email: email });
        res.send(result);
      } else {
        res.send({ message: "Forbidden" });
      }
    });
    app.put("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };

      const result = await userCollection.updateOne(filter, updateDoc, options);
      // const token = sign(
      //   { email: email },
      //   // process.env.ACCESS_TOKEN_SECRET,
      //   // { expiresIn: "12h" }
      // );
      res.send({ result });
    });
    app.put("/purchase/:id", (req, res) => {
      const id = req.params.id;
      const total = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name: total.name,
          productName: total.productName,
          phone: total.phone,
          quantity: total.quantity,
          price: total.price,
          email: total.email,
        },
      };

      const result = purchaseCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });
    app.patch("/purchase/:id", async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };

      const result = await paymentCollection.insertOne(payment);
      const updatedPurchase = await purchaseCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(updatedPurchase);
    });
    app.get("/purchase/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const products = await purchaseCollection.findOne(query);
      res.send(products);
    });
    app.get("/purchase", async (req, res) => {
      const query = {};
      const cursor = purchaseCollection.find(query);
      const purchases = await cursor.toArray();
      res.send(purchases);
    });
    app.get("/purchase/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cursor = purchaseCollection.find(query);
      const purchases = await cursor.toArray();
      res.send(purchases);
    });
    app.get("/orders", async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const orders = await orderCollenction.find(query).toArray();
        return res.send(orders);
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    });

    app.get("/allorders", async (req, res) => {
      const query = {};
      const orders = await orderCollenction.find(query).toArray();
      console.log(orders);
      res.send(orders);
    });

    app.patch("/paidorders/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          deleverd: true,
        },
      };
      const updatedOrder = await orderCollenction.updateOne(filter, updatedDoc);
      res.send(updatedOrder);
    });

    app.get("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await orderCollenction.findOne(query);
      res.send(order);
    });

    app.patch("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };

      const result = await paymentCollection.insertOne(payment);
      const updatedOrder = await orderCollenction.updateOne(filter, updatedDoc);
      res.send(updatedOrder);
    });

    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await orderCollenction.deleteOne(filter);
      res.send(result);
    });
  } finally {
    // client.close();
  }
};
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log("server running in port", port);
});
