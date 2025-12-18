const express = require('express');
const path = require('path');
const { pool, checkDatabaseConnection } = require('./database');

const app = express();
const PORT = 3000;

function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>"'`;]/g, '');
}

function isAlphanumeric(str) {
    return /^[a-zA-Z0-9]+$/.test(str);
}

function isEmail(str) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

function isNumeric(str) {
    return /^[0-9]+$/.test(str);
}

function isValidEircode(str) {
    return /^[0-9][a-zA-Z0-9]{5}$/.test(str);
}

function validateUserData(data) {
    const errors = {};

    const firstName = sanitizeString(data.firstName);
    const secondName = sanitizeString(data.secondName);
    const email = sanitizeString(data.email);
    const phone = sanitizeString(data.phone);
    const eircode = sanitizeString(data.eircode);

    if (!firstName) {
        errors.firstName = 'First name is required.';
    } else if (!isAlphanumeric(firstName)) {
        errors.firstName = 'First name must be letters or numbers only.';
    } else if (firstName.length > 20) {
        errors.firstName = 'First name must be max 20 characters.';
    }

    if (!secondName) {
        errors.secondName = 'Second name is required.';
    } else if (!isAlphanumeric(secondName)) {
        errors.secondName = 'Second name must be letters or numbers only.';
    } else if (secondName.length > 20) {
        errors.secondName = 'Second name must be max 20 characters.';
    }

    if (!email) {
        errors.email = 'Email is required.';
    } else if (!isEmail(email)) {
        errors.email = 'Email must be a valid email format.';
    }

    if (!phone) {
        errors.phone = 'Phone number is required.';
    } else if (!isNumeric(phone)) {
        errors.phone = 'Phone number must contain only numbers.';
    } else if (phone.length !== 10) {
        errors.phone = 'Phone number must be exactly 10 digits.';
    }

    if (!eircode) {
        errors.eircode = 'Eircode is required.';
    } else if (!isValidEircode(eircode)) {
        errors.eircode = 'Eircode must start with a number, be alphanumeric, and exactly 6 characters.';
    }

    return {
        errors,
        cleanedData: { firstName, secondName, email, phone, eircode }
    };
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Serve static files (so form.html, CSS, etc. can be loaded)
app.use(express.static(__dirname));

// Main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'form.html'));
});

app.post('/submit', async (req, res) => {
    try {
        const { errors, cleanedData } = validateUserData(req.body);

        if (Object.keys(errors).length > 0) {
            console.log('Server-side validation errors:', errors);
            return res.status(400).json({
                message: 'Validation failed on server.',
                errors
            });
        }

        await checkDatabaseConnection();

        const { firstName, secondName, email, phone, eircode } = cleanedData;
        console.log('Validated and cleaned data:', cleanedData);

        const sql = `
            INSERT INTO mysql_table (first_name, second_name, email, phone, eircode)
            VALUES (?, ?, ?, ?, ?)
        `;
        const params = [firstName, secondName, email, phone, eircode];

        const [result] = await pool.execute(sql, params);
        console.log('Insert result:', result);

        res.send('Data passed validation and was saved to MySQL successfully.');
    } catch (err) {
        console.error('Error while saving data:', err.message);
        res.status(500).send('There was an error saving your data.');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    checkDatabaseConnection()
        .then(() => console.log('Database ready.'))
        .catch((err) => console.log('Database NOT ready:', err.message));
});
