const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;
// middleware
app.use(express.json())
app.use(cors())
// middlewares
const verifyToken = async (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = req.headers.authorization.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (error, decode) {
        if (error) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decode.email
        console.log(decode)
        next()
    })
}
// verifyAdmin


app.get('/', (req, res) => {
    res.send('Server is running')
})

app.post('/jwt', async (req, res) => {
    const user = req.body
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' })

    res.send({ token })
})
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vqva6ft.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const usersCollection = client.db("bistroDb").collection('users');
        const MenuCollection = client.db("bistroDb").collection('menu');
        const ReviewsCollection = client.db("bistroDb").collection('reviews');
        const cartCollection = client.db("bistroDb").collection('carts');
        const paymentCollection = client.db("bistroDb").collection('payments');
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded
            console.log(email)
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            const isAdmin = user?.role === 'Admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            next()
        }

        app.get('/menu', async (req, res) => {
            const result = await MenuCollection.find().toArray()
            res.send(result)
        })
        app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
            const item = req.body;
            const result = await MenuCollection.insertOne(item)
            res.send(result)
        })

        app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: id }
            const result = await MenuCollection.deleteOne(query)
            res.send(result)
        })
        app.patch('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const item = req.body
            const query = { _id: id }
            const updatedDoc = {
                $set: {
                    name: item.name,
                    image: item.image,
                    category: item.category,
                    recipe: item.recipe,
                    price: parseFloat(item.price)
                }
            }
            const result = await MenuCollection.updateOne(query, updatedDoc)
            res.send(result)
        })

        app.get('/menu/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: id }
            const result = await MenuCollection.findOne(query)
            res.send(result)
        })

        app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: id }
            const result = await MenuCollection.deleteOne(query)
            res.send(result)
        })


        app.get('/reviews', async (req, res) => {
            const result = await ReviewsCollection.find().toArray()
            res.send(result)
        })
        app.post('/carts', async (req, res) => {
            const cartItem = req.body
            const result = await cartCollection.insertOne(cartItem)
            res.send(result)
        })
        app.get('/carts', async (req, res) => {
            const email = req.query
            const result = await cartCollection.find(email).toArray()
            res.send(result)
        })
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query)
            res.send(result)
        })
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await usersCollection.deleteOne(query)
            res.send(result)
        })
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            if (email !== req.decoded) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let admin = false;
            if (user) {
                admin = user?.role === 'Admin'
            }
            res.send({ admin })
        })
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'Admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingEmail = await usersCollection.findOne(query)
            if (existingEmail) {
                return res.send({ message: 'User already exits', insertedId: null })
            }
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })

        // Payment
        app.post('/create-payment', async (req, res) => {
            const { price } = req.body
            const amount = parseInt(price * 100)
            console.log('the price is ', amount)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })
            res.send({ clientSecret: paymentIntent.client_secret, })
        })

        app.post('/payments', async (req, res) => {
            const paymentInfo = req.body
            const paymentRes = await paymentCollection.insertOne(paymentInfo)
            const query = {
                _id: {
                    $in: paymentInfo.menuIds.map(id => new ObjectId(id))
                }
            }
            console.log(query)
            const deletedRes = await cartCollection.deleteMany(query)
            res.send({ paymentRes, deletedRes })
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log('Bistro boss is running')
})