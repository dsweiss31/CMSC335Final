const http = require("http");
const path = require("path");
let fs = require("fs");
const express = require("express");   /* Accessing express module */
const bodyParser = require("body-parser"); /* To handle post parameters */
const app = express();  /* app is a request handler function */
const axios = require("axios");
const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config({ path: path.resolve(__dirname, '.env') })  
const PORT = process.env.PORT | 3030;
let currentJoke = "";

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const db = process.env.MONGO_DB_NAME;
const collection = process.env.MONGO_COLLECTION;
const uri = `mongodb+srv://${userName}:${password}@cluster0.c9qchbe.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

/* Initializes request.body with post information */ 
app.use(bodyParser.urlencoded({extended:false}));

/* Important */
process.stdin.setEncoding("utf8");

/* directory where templates will reside */
app.set("views", path.resolve(__dirname, "templates"));

/* view/templating engine */
app.set("view engine", "ejs");

app.use(express.static(__dirname + '/templates'));

app.get("/", async (request, response) => {
    const options = {
        method: 'GET',
        url: 'https://matchilling-chuck-norris-jokes-v1.p.rapidapi.com/jokes/random',
        headers: {
          accept: 'application/json',
          'X-RapidAPI-Key': process.env.AXIOS_API_KEY,
          'X-RapidAPI-Host': 'matchilling-chuck-norris-jokes-v1.p.rapidapi.com'
        }
    };
    let variables = { joke: "A Chuck Norris joke could not be loaded at this time. Please try again later.", jokes: ""};

    try {
        var joke = await axios.request(options);
        currentJoke = variables.joke = joke.data.value;
    } catch (error) {
        console.log(error);
    }

    try {
        await client.connect();
        await client.db(db).collection(collection).insertOne({ joke: variables.joke });
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

    response.render("index", variables);
});

app.post("/", async (request, response) => {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    let variables = { joke: currentJoke, jokes: "No jokes were found with the given search string."};
    try {
        await client.connect();
        let html = "";

        let filter = { joke: { $regex: request.body.search }};
        const cursor = await client.db(db)
                        .collection(collection)
                        .find(filter)
                        .limit(5);
        const result = await cursor.toArray();

        result.forEach(x => html += `<p>${x.joke}<\p>`);
        
        if (html !== "") {
            variables.jokes = html;
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
    response.render("index", variables);
});

app.listen(PORT, () => {
    console.log(`listening for requests on port ${PORT}`);
})

