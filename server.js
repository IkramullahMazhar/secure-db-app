// server.js
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// This lets Express read form data from POST requests (req.body)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from the current folder (so form.html can be served)
app.use(express.static('.'));

// Route for the main page - sends form.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'form.html'));
});

// Route that receives the form submission
app.post('/submit', (req, res) => {
    // req.body will contain all form fields
    console.log('Received form data:', req.body);

    // For now, just send a simple response
    res.send('Form data received on the server');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
