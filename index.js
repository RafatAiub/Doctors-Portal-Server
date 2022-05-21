const express = require('express');
const cors = require('cors');
require('dotenv').config();


const { MongoClient, ServerApiVersion, MongoRuntimeError } = require('mongodb');


const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb://doctor_admin:${process.env.db_pass}@cluster0-shard-00-00.hlacd.mongodb.net:27017,cluster0-shard-00-01.hlacd.mongodb.net:27017,cluster0-shard-00-02.hlacd.mongodb.net:27017/?ssl=true&replicaSet=atlas-1024x6-shard-0&authSource=admin&retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const servicesCollection = client.db('Doctors_portal').collection('services');
        const bookingCollection = client.db('Doctors_portal').collection('bookings');



        app.get('/services', async (req, res) => {
            const query = {};
            const cursor = servicesCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);

        });
        app.get('/available', async (req, res) => {
            const date = req.query.date;
            //step1:get all services
            const services = await servicesCollection.find().toArray();

            //step 2 get the booking of that day
            const query = { date: date };
            const bookings = await bookingCollection.find(query).toArray();

            //steps 3 for each service 
            services.foreach(service => {

                //step 4:find booking for that service
                const serviceBookings = bookings.filter(b => b.treatment === service.name);
                // step 5:select slots for the service bookings:['','','','']
                const bookedSlots = serviceBookings.map(s => s.slot);
                //select those slots that are not in booked slots
                const available = service.slots.filter(slot => !bookedSlots.includes(slot));
                service.slots = available;

            })
            res.send(services);
        })
        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = {
                treatment: booking.treatment,
                date: booking.date,
                patient: booking.patient
            }
            const exist = await bookingCollection.findOne(query);

            if (exist) {
                return res.send({ success: false, booking: exist })
            }
            const result = bookingCollection.insertOne(booking);
            return res.send({ success: true, result });
        })

    }
    finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Doctors app listening on port ${port}`)
})