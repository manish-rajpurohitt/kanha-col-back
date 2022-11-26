require('dotenv').config();
const express = require('express');
const chalk = require('chalk');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const Mongoose = require('mongoose');
const slug = require('mongoose-slug-generator');

const keys = require('./config/keys');
const routes = require('./routes');
const socket = require('./socket');
const setupDB = require('./utils/db');
const cloudinary = require("cloudinary");
const Razorpay = require('razorpay')

const { port } = keys;
const app = express();
const options = {
  separator: '-',
  lang: 'en',
  truncate: 120
};
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: false,
    frameguard: true
  })
);
app.use(cors());
app.use(express.static(path.resolve(__dirname, '../dist')));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

setupDB();
Mongoose.plugin(slug, options);

require('./config/passport')(app);
app.use(routes);


const server = app.listen(port, () => {
  console.log(
    `${chalk.green('✓')} ${chalk.blue(
      `Listening on port ${port}. Visit http://localhost:${port}/ in your browser.`
    )}`
  );
});

socket(server);
