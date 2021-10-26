'use strict';

const express = require('express');
var AWSXRay = require('aws-xray-sdk');


// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// App
const app = express();
app.use(AWSXRay.express.openSegment('MyApp'));
AWSXRay.middleware.enableDynamicNaming('*.example.com');

app.get('/', (req, res) => {
    res.send('Hello From a Node Container!');
});

app.get('/healthcheck', (req, res) => {
    res.send('Healthy!');
});

app.use(AWSXRay.express.closeSegment());

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
