const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 3000
require('dotenv').config()
 

// Middleware
app.use(cors())
app.use(express.json())


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
            const cursor = productsCollection.find().sort({created_at: -1}).limit(6)
            const result = await cursor.toArray()
            res.send(result)
        })

        app.post('/products', async (req, res) => {
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
        app.post('/bids', async(req, res)=> {
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
            const query = {product: productId}
            const cursor = bidsCollection.find(query).sort({bid_price: 1})
            const result = await cursor.toArray()
            res.send(result)
        })
        app.get('/bids', async (req, res) => {

            const email = req.query.email
            const query = {}
            if (email) {
                query.buyer_email = email
            }
            const cursor = bidsCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })

        app.delete('/bids/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id)}
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