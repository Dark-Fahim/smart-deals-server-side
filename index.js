const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
var admin = require("firebase-admin");

const port = process.env.PORT || 3000
require('dotenv').config()
var serviceAccount = require("./smart-deals-8ed81-firebase-adminsdk.json");


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Middleware
app.use(cors())
app.use(express.json())
const logger = (req, res, next) => {
    console.log('Logging info');
    next()
}

const verifyFirebaseToken = async (req, res, next) => {
    console.log('in the middleware', req.headers.authorization);
    if (!req.headers.authorization) {
        // do not allow to go
        res.status(401).send({ message: "401 not authorized" })
    }
    // 
    const token = req.headers.authorization.split(' ')[1]
    if (!token) {
        // do not allow to go
        res.status(401).send({ message: "401 not authorized" })
    }




    // verify token

    try {
        const userInfo =  await admin.auth().verifyIdToken(token)
        req.token_email = userInfo.email
        console.log('token info', userInfo);
        next()
    }
    catch {
        res.status(401).send({ message: "401 not authorized" })
    }

}


const verifyJWTToken = async (req, res, next) => {
    // console.log("Headers in middleware",req.headers);
    const authorization = req.headers.authorization
    if(!authorization){
        return res.status(401).send({message: 'unauthorized access'})
    }
    const token = req.headers.authorization.split(' ')[1]
    if(!token){
        return res.status(401).send({message: 'unauthorized access'})   
    }


    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if(err){
            return res.status(401).send({message: 'unauthorized access'})  
        }
        // console.log('After decoded', decoded);
        req.token_email = decoded.email
        next()
    })
    
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.b0w0dwa.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect()


        const db = client.db('smart_db')
        const productsCollection = db.collection('products')
        const bidsCollection = db.collection('bids')
        const usersCollection = db.collection('user')



        // jwt related apis
        app.post('/getToken', (req, res) => {
            const loggedUser = req.body
            const token = jwt.sign(loggedUser, process.env.JWT_SECRET, {expiresIn: "1h"})
            res.send({token: token})
        })




        // User related apis
        app.post('/users', async (req, res) => {
            const newUser = req.body

            const email = req.body.email
            const query = { email: email }

            const existingUser = await usersCollection.findOne(query)
            if (existingUser) {
                res.send({ message: "user already exist" })
            }
            else {

                const result = await usersCollection.insertOne(newUser)
                res.send(result)
            }
        })


        // products related apis

        app.get('/latest-products', async (req, res) => {
            const cursor = productsCollection.find().sort({ created_at: -1 }).limit(6)
            const result = await cursor.toArray()
            res.send(result)
        })

        app.post('/products', verifyFirebaseToken, async (req, res) => {
            console.log(req.headers);
            const newProduct = req.body
            const result = await productsCollection.insertOne(newProduct)
            res.send(result)
        })

        app.patch("/products/:id", async (req, res) => {
            const id = req.params.id
            const updatedData = req.body
            const query = { _id: new ObjectId(id) }
            const update = {
                $set: {
                    name: updatedData.name,
                    price: updatedData.price,
                    email: updatedData.email
                }
            }
            const options = {}

            const result = await productsCollection.updateOne(query, update, options)
            res.send(result)
        })

        app.get("/products/:id", async (req, res) => {
            const id = req.params.id
            const query = { _id: id }
            const result = await productsCollection.findOne(query)
            res.send(result)
        })

        app.get('/products', async (req, res) => {
            // const projectFields = { title: 1, price_min: 1, price_max: 1, image: 1 }
            // const cursor = productsCollection.find().sort({ price_max: 1 }).skip(3).limit(3).project(projectFields)
            console.log(req.headers);
            console.log(req.query);
            const email = req.query.email
            const query = {}
            if (email) {
                query.email = email
            }
            const cursor = productsCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })

        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await productsCollection.deleteOne(query)
            res.send(result)
        })



        // bids related apis
        app.post('/bids', async (req, res) => {
            const newBid = req.body
            const result = await bidsCollection.insertOne(newBid)
            res.send(result)
        })

        // app.get(('/bids', async (req, res) => {

        //     const query= {}

        //     const cursor = bidsCollection.find()
        //     const result = await cursor.toArray()
        //     res.send(result)

        // }))

        app.get('/products/bids/:productId', async (req, res) => {
            const productId = req.params.productId
            const query = { product: productId }
            const cursor = bidsCollection.find(query).sort({ bid_price: 1 })
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/bids', verifyFirebaseToken,  async(req, res) => {
            // console.log('headers', req.headers);
            const email = req.query.email
            const query = {}
            if(email){
                query.buyer_email = email
                if(email !== req.token_email){
                    res.status(403).send({message: "forbidden Access"})
                }
            }

            if(email !== req.token_email){
                res.status(403).send({message: 'forbidden access'})
            }

            const cursor = bidsCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })


        // firebase token verify
        // app.get('/bids', verifyFirebaseToken, logger, async (req, res) => {

        //     const token = req.headers
        //     // console.log(token);

        //     const email = req.query.email
        //     const query = {}
        //     if (email) {
        //         if(email !== req.token_email){
        //             return res.status(403).send({message: "forbidden access"})
        //         }
        //         query.buyer_email = email
        //     }
        //     const cursor = bidsCollection.find(query)
        //     const result = await cursor.toArray()
        //     res.send(result)
        // })

        app.delete('/bids/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await bidsCollection.deleteOne(query)
            res.send(result)
        })

        // app.patch("/products/:id", async (req, res) => {
        //     const id = req.params.id
        //     const updatedData = req.body
        //     const query = { _id: new ObjectId(id) }
        //     const update = {
        //         $set: {
        //             name: updatedData.name,
        //             price: updatedData.price,
        //             email: updatedData.email
        //         }
        //     }
        //     const options = {}

        //     const result = await productsCollection.updateOne(query, update, options)
        //     res.send(result)
        // })

        app.patch('/bids/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: id }
            const updatedData = req.body
            const update = {
                $set: {
                    product: updatedData.product,
                    buyer_image: updatedData.buyer_image,
                    buyer_name: updatedData.buyer_name,
                    buyer_contact: updatedData.buyer_contact,
                    buyer_email: updatedData.buyer_email,
                    bid_price: updatedData.bid_price,
                    status: updatedData.status
                }
            }
            const options = {}
            const result = await bidsCollection.updateOne(query, update, options)
            res.send(result)

        })



        await client.db("admin").command({ ping: 1 })
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally {
        // await client.close();

    }
}

run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Smart server is Running')
})

app.listen(port, () => {
    console.log(`smart server is running port: ${port}`);
})