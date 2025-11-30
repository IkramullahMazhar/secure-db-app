const express = require('express');
const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static('.'));

// Route for the main page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/form.html');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
