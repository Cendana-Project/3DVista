const express = require('express');
const app = express();
const path = require('path');

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'Vista', 'index.htm');
    console.log('Sending file:', filePath);  // Log untuk memastikan jalurnya benar
    res.sendFile(filePath, (err) => {
        if (err) {
            console.log('Error sending file:', err);
            res.status(500).send('Something went wrong');
        }
    });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
