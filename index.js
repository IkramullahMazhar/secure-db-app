// Built‑in modules for reading files and working with paths
const fs = require('fs');
const path = require('path');
// CSV parser to read the data.csv file row by row
const csv = require('csv-parser');
// Reuse the MySQL pool I set up in database.js
const { pool } = require('./database');

// Simple helper to clean up strings before validating/saving
function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>"'`;]/g, '');
}

// A few small helpers for the different checks I need
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

// Validate one CSV record and return any errors plus cleaned values
function validateCsvRecord(record, rowNumber) {
    const errors = [];

    // Map CSV column names to my internal field names
    const rawFirstName = record.first_name || record.firstName || '';
    const rawSecondName = record.second_name || record.secondName || '';
    const rawEmail = record.email || '';
    const rawPhone = record.phone || '';
    const rawEircode = record.eircode || record.eir_code || record.eirCode || '';

    // Clean up values before checking
    const firstName = sanitizeString(rawFirstName);
    const secondName = sanitizeString(rawSecondName);
    const email = sanitizeString(rawEmail);
    const phone = sanitizeString(rawPhone);
    const eircode = sanitizeString(rawEircode);

    // Same validation rules as the HTML form / server
    if (!firstName) {
        errors.push('First name is required.');
    } else if (!isAlphanumeric(firstName)) {
        errors.push('First name must be letters or numbers only.');
    } else if (firstName.length > 20) {
        errors.push('First name must be max 20 characters.');
    }

    if (!secondName) {
        errors.push('Second name is required.');
    } else if (!isAlphanumeric(secondName)) {
        errors.push('Second name must be letters or numbers only.');
    } else if (secondName.length > 20) {
        errors.push('Second name must be max 20 characters.');
    }

    if (!email) {
        errors.push('Email is required.');
    } else if (!isEmail(email)) {
        errors.push('Email must be a valid email format.');
    }

    if (!phone) {
        errors.push('Phone number is required.');
    } else if (!isNumeric(phone)) {
        errors.push('Phone number must contain only numbers.');
    } else if (phone.length !== 10) {
        errors.push('Phone number must be exactly 10 digits.');
    }

    if (!eircode) {
        errors.push('Eircode is required.');
    } else if (!isValidEircode(eircode)) {
        errors.push('Eircode must start with a number, be alphanumeric, and exactly 6 characters.');
    }

    return {
        isValid: errors.length === 0,
        errors,
        cleanedData: { firstName, secondName, email, phone, eircode }
    };
}

// Main function that streams the CSV and inserts valid rows into MySQL
async function importCsv() {
    const csvFilePath = path.join(__dirname, 'data.csv');

    // Quick check so I don’t try to read a missing file
    if (!fs.existsSync(csvFilePath)) {
        console.error('CSV file not found at:', csvFilePath);
        process.exit(1);
    }

    console.log('Starting CSV import from:', csvFilePath);

    let rowNumber = 0;
    const invalidRows = [];
    let validCount = 0;
    let invalidCount = 0;

    // I keep all DB insert promises here and wait for them at the end
    const insertPromises = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                rowNumber++;

                const { isValid, errors, cleanedData } = validateCsvRecord(row, rowNumber);

                if (isValid) {
                    validCount++;

                    const { firstName, secondName, email, phone, eircode } = cleanedData;

                    const sql = `
                        INSERT INTO mysql_table (first_name, second_name, email, phone, eircode)
                        VALUES (?, ?, ?, ?, ?)
                    `;
                    const params = [firstName, secondName, email, phone, eircode];

                    insertPromises.push(
                        pool.execute(sql, params).catch((err) => {
                            // If the DB insert fails, I treat that row as invalid too
                            invalidCount++;
                            invalidRows.push({
                                rowNumber,
                                errors: ['DB insert failed: ' + err.message]
                            });
                        })
                    );
                } else {
                    // Record which CSV rows failed validation and why
                    invalidCount++;
                    invalidRows.push({ rowNumber, errors });
                    console.warn(`Row ${rowNumber} validation failed:`, errors.join('; '));
                }
            })
            .on('end', async () => {
                try {
                    // Wait for all inserts for valid rows to finish
                    await Promise.all(insertPromises);

                    console.log('CSV processing completed.');
                    console.log(`Total rows: ${rowNumber}`);
                    console.log(`Valid rows inserted: ${validCount}`);
                    console.log(`Invalid rows skipped: ${invalidCount}`);

                    if (invalidRows.length > 0) {
                        console.log('Invalid row details:');
                        invalidRows.forEach((item) => {
                            console.log(`Row ${item.rowNumber}: ${item.errors.join(' | ')}`);
                        });
                    }

                    // Return a small summary object at the end
                    resolve({
                        total: rowNumber,
                        valid: validCount,
                        invalid: invalidCount,
                        invalidRows
                    });
                } catch (err) {
                    reject(err);
                }
            })
            .on('error', (err) => {
                console.error('Error reading CSV:', err.message);
                reject(err);
            });
    });
}

// Run the import as soon as this script is executed
importCsv()
    .then((stats) => {
        console.log('Import finished. Stats:', stats);
        process.exit(0);
    })
    .catch((err) => {
        console.error('Import failed:', err.message);
        process.exit(1);
    });
