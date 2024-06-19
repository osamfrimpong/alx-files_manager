import express from 'express';

const app = express();

const PORT = process.env.PORT || 5000;

const routes = require('./routes');

app.use('/', routes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
