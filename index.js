const express = require('express')
const cors = require('cors')
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000;
// middleware
app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
    res.send('Server is running')
})


const { MongoClient, ServerApiVersion } = require('mongodb');
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
        await client.connect();
        const MenuCollection = client.db("bistroDb").collection('menu');
        const ReviewsCollection = client.db("bistroDb").collection('reviews');

        app.get('/menu', async(req,res)=>{
            const result = await MenuCollection.find().toArray()
            res.send(result)
        })
        app.get('/reviews', async(req,res)=>{
            const result =await ReviewsCollection.find().toArray()
            res.send(result)
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