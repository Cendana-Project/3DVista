const express = require('express');
const app = express();
const path = require('path');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public/Vista')));

app.get('/3dvista', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/Vista/index.htm'));
});

app.get('/', (req, res) => {
    res.redirect('/3DVista');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
